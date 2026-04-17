"use server";

import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/index";
import { userSongProgress, deriveStars, userVocabMastery, userExerciseLog } from "@/lib/db/schema";
import type { ExerciseType } from "@/lib/exercises/generator";
import { ratingFor } from "@/lib/fsrs/rating";
import { scheduleReview } from "@/lib/fsrs/scheduler";
import type { MasteryRow } from "@/lib/fsrs/scheduler";
import { tierFor } from "@/lib/fsrs/tier";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnswerRecord {
  questionId: string;
  type: ExerciseType;
  /**
   * UUID of the vocabulary_items row this question targets. Optional for backward
   * compatibility with legacy answers; when present, drives the user_vocab_mastery
   * + user_exercise_log writes inline at the end of saveSessionResults. If absent,
   * the answer still counts toward accuracy/completion but no per-vocab FSRS row
   * is upserted.
   */
  vocabItemId?: string;
  chosen: string;
  correct: boolean;
  timeMs: number;
}

interface SaveSessionInput {
  // TODO: replace with Clerk userId from auth()
  userId: string;
  songVersionId: string;
  answers: AnswerRecord[];
  mode: "short" | "full";
  durationMs: number;
}

interface SaveSessionResult {
  completionPct: number;
  stars: 0 | 1 | 2;
  previousStars: 0 | 1 | 2;
}

// ---------------------------------------------------------------------------
// saveSessionResults
// ---------------------------------------------------------------------------

/**
 * Saves exercise session results to user_song_progress.
 *
 * Logic (follows Pattern 9 from Phase 8 research):
 * 1. Separate answers into ex1_2_3 (vocab_meaning, meaning_vocab, reading_match)
 *    and ex4 (fill_lyric) groups.
 * 2. Compute accuracy for each group. Null if no answers in that group.
 * 3. Upsert with GREATEST (best accuracy wins) and LEAST(100) for completion.
 * 4. Return current stars + previousStars so UI can detect new star earn events.
 */
export async function saveSessionResults(
  input: SaveSessionInput
): Promise<SaveSessionResult> {
  const { userId, songVersionId, answers, mode } = input;

  // --- Step 1: Split answers by group ---
  const ex1_2_3Types: ExerciseType[] = [
    "vocab_meaning",
    "meaning_vocab",
    "reading_match",
  ];
  const ex1_2_3Answers = answers.filter((a) =>
    ex1_2_3Types.includes(a.type)
  );
  const ex4Answers = answers.filter((a) => a.type === "fill_lyric");

  // --- Step 2: Compute accuracy per group ---
  const computeAccuracy = (group: AnswerRecord[]): number | null => {
    if (group.length === 0) return null;
    return group.filter((a) => a.correct).length / group.length;
  };

  const newEx1_2_3Accuracy = computeAccuracy(ex1_2_3Answers);
  const newEx4Accuracy = computeAccuracy(ex4Answers);

  // --- Step 3: Completion increment ---
  const completionIncrement = mode === "short" ? 15 : 30;

  // --- Step 4: Fetch previous progress (for previousStars) ---
  const existingRows = await db
    .select()
    .from(userSongProgress)
    .where(
      sql`${userSongProgress.user_id} = ${userId} AND ${userSongProgress.song_version_id} = ${songVersionId}::uuid`
    )
    .limit(1);

  const previousRow = existingRows[0] ?? null;
  const previousStars = previousRow
    ? deriveStars({
        ex1_2_3_best_accuracy: previousRow.ex1_2_3_best_accuracy,
        ex4_best_accuracy: previousRow.ex4_best_accuracy,
      })
    : 0;

  // --- Step 5: Upsert with GREATEST/LEAST patterns ---
  await db
    .insert(userSongProgress)
    .values({
      user_id: userId,
      song_version_id: songVersionId,
      completion_pct: Math.min(100, completionIncrement),
      ex1_2_3_best_accuracy: newEx1_2_3Accuracy,
      ex4_best_accuracy: newEx4Accuracy,
      sessions_completed: 1,
    })
    .onConflictDoUpdate({
      target: [userSongProgress.user_id, userSongProgress.song_version_id],
      set: {
        completion_pct: sql`LEAST(100, ${userSongProgress.completion_pct} + ${completionIncrement})`,
        ex1_2_3_best_accuracy:
          newEx1_2_3Accuracy !== null
            ? sql`GREATEST(COALESCE(${userSongProgress.ex1_2_3_best_accuracy}, 0), ${newEx1_2_3Accuracy})`
            : userSongProgress.ex1_2_3_best_accuracy,
        ex4_best_accuracy:
          newEx4Accuracy !== null
            ? sql`GREATEST(COALESCE(${userSongProgress.ex4_best_accuracy}, 0), ${newEx4Accuracy})`
            : userSongProgress.ex4_best_accuracy,
        sessions_completed: sql`${userSongProgress.sessions_completed} + 1`,
        updated_at: sql`NOW()`,
      },
    });

  // --- Step 6: SELECT updated row and derive stars ---
  const updatedRows = await db
    .select()
    .from(userSongProgress)
    .where(
      sql`${userSongProgress.user_id} = ${userId} AND ${userSongProgress.song_version_id} = ${songVersionId}::uuid`
    )
    .limit(1);

  const updated = updatedRows[0];
  if (!updated) {
    // Fallback (should never happen after upsert)
    return { completionPct: completionIncrement, stars: 0, previousStars: 0 };
  }

  const stars = deriveStars({
    ex1_2_3_best_accuracy: updated.ex1_2_3_best_accuracy,
    ex4_best_accuracy: updated.ex4_best_accuracy,
  });

  // --- Step 7: FSRS per-vocab upsert (one row per unique vocab_item_id) ---
  //
  // Per Phase 08.1-06 CONTEXT-locked coverage, user_vocab_mastery must be
  // written when a session completes. Each answered question carries its
  // vocabItemId (from the client-side Question generator). We loop over the
  // unique vocab IDs, select the existing mastery row (if any), compute the
  // next FSRS schedule via the 08.2-01 scheduler, and upsert. Any per-vocab
  // failure is logged but does NOT fail the whole session save — the song
  // progress write (steps 4–6) is the user-visible side effect.
  //
  // Note: we deliberately DO NOT insert a user_exercise_log row here. That
  // path is owned by recordVocabAnswer() which runs per-answer in live UX
  // flows (Phase 08.2+); batch-logging at the end of the session would
  // distort per-answer timing. This step's sole purpose is to ensure the
  // mastery table is populated for the FSRS due-date pipeline.
  const seenVocabIds = new Set<string>();
  const vocabAnswers = answers.filter((a) => {
    if (!a.vocabItemId) return false;
    if (seenVocabIds.has(a.vocabItemId)) return false;
    seenVocabIds.add(a.vocabItemId);
    return true;
  });

  for (const answer of vocabAnswers) {
    try {
      // Aggregate this session's answers for THIS vocab_item_id — use the best
      // outcome across duplicates as the rating signal (rewards mastery, not
      // single mistakes).
      const perVocab = answers.filter((a) => a.vocabItemId === answer.vocabItemId);
      const anyCorrect = perVocab.some((a) => a.correct);
      const rating = ratingFor(answer.type, anyCorrect, {});

      // Fetch existing mastery row (may be null for first-encounter vocab).
      const existingRows = await db
        .select()
        .from(userVocabMastery)
        .where(
          sql`${userVocabMastery.user_id} = ${userId} AND ${userVocabMastery.vocab_item_id} = ${answer.vocabItemId!}::uuid`
        )
        .limit(1);

      const prev: MasteryRow | null = existingRows[0]
        ? {
            stability: existingRows[0].stability,
            difficulty: existingRows[0].difficulty,
            elapsed_days: existingRows[0].elapsed_days,
            scheduled_days: existingRows[0].scheduled_days,
            reps: existingRows[0].reps,
            lapses: existingRows[0].lapses,
            state: existingRows[0].state as 0 | 1 | 2 | 3,
            due: existingRows[0].due,
            last_review: existingRows[0].last_review,
            intensity_preset:
              (existingRows[0].intensity_preset as "normal" | "intensive" | "light") ??
              "normal",
          }
        : null;

      const next = scheduleReview(prev, rating, prev?.intensity_preset ?? "normal");

      await db
        .insert(userVocabMastery)
        .values({
          user_id: userId,
          vocab_item_id: answer.vocabItemId!,
          stability: next.stability,
          difficulty: next.difficulty,
          elapsed_days: next.elapsed_days,
          scheduled_days: next.scheduled_days,
          reps: next.reps,
          lapses: next.lapses,
          state: next.state,
          due: next.due,
          last_review: next.last_review,
          intensity_preset: prev?.intensity_preset ?? "normal",
          updated_at: sql`NOW()`,
        })
        .onConflictDoUpdate({
          target: [userVocabMastery.user_id, userVocabMastery.vocab_item_id],
          set: {
            stability: next.stability,
            difficulty: next.difficulty,
            elapsed_days: next.elapsed_days,
            scheduled_days: next.scheduled_days,
            reps: next.reps,
            lapses: next.lapses,
            state: next.state,
            due: next.due,
            last_review: next.last_review,
            updated_at: sql`NOW()`,
          },
        });
    } catch (err) {
      // Do not fail the entire session save on a single mastery upsert error.
      // eslint-disable-next-line no-console
      console.error(
        `[saveSessionResults] mastery upsert failed for vocab ${answer.vocabItemId}:`,
        err
      );
    }
  }

  return {
    completionPct: updated.completion_pct,
    stars,
    previousStars,
  };
}

// ---------------------------------------------------------------------------
// recordVocabAnswer
// ---------------------------------------------------------------------------

interface RecordAnswerInput {
  // TODO: replace with Clerk userId from auth()
  userId: string;
  vocabItemId: string;            // target word's UUID; NEVER pass distractor IDs
  songVersionId: string | null;   // null for kana-only exercises (Phase 9)
  exerciseType: ExerciseType;
  correct: boolean;
  revealedReading?: boolean;      // true if user tapped the reveal-reading hatch
  responseTimeMs: number;
}

interface RecordAnswerResult {
  newTier: 1 | 2 | 3;
  newState: 0 | 1 | 2 | 3;
  reps: number;
  lapses: number;
  due: string;                    // ISO timestamp
}

/**
 * Per-answer FSRS upsert + exercise log insert.
 *
 * Per-CONTEXT decision: distractor words receive NO mastery or log row.
 * The caller MUST pass only the target vocabItemId of the question being asked.
 *
 * One transaction per call: writes exactly one user_exercise_log row and
 * upserts exactly one user_vocab_mastery row. Both succeed or both roll back.
 *
 * @throws if vocabItemId is empty (defensive guard against legacy data)
 */
export async function recordVocabAnswer(
  input: RecordAnswerInput
): Promise<RecordAnswerResult> {
  const { userId, vocabItemId, songVersionId, exerciseType, correct, revealedReading, responseTimeMs } = input;

  if (!vocabItemId) {
    throw new Error("recordVocabAnswer: vocabItemId must be a non-empty UUID");
  }

  return db.transaction(async (tx) => {
    // 1. Compute FSRS rating from exercise outcome
    const rating = ratingFor(exerciseType, correct, { revealedReading });

    // 2. SELECT existing mastery row (if any)
    const existingRows = await tx
      .select()
      .from(userVocabMastery)
      .where(
        sql`${userVocabMastery.user_id} = ${userId} AND ${userVocabMastery.vocab_item_id} = ${vocabItemId}::uuid`
      )
      .limit(1);

    const prev: MasteryRow | null = existingRows[0]
      ? {
          stability: existingRows[0].stability,
          difficulty: existingRows[0].difficulty,
          elapsed_days: existingRows[0].elapsed_days,
          scheduled_days: existingRows[0].scheduled_days,
          reps: existingRows[0].reps,
          lapses: existingRows[0].lapses,
          state: existingRows[0].state as 0 | 1 | 2 | 3,
          due: existingRows[0].due,
          last_review: existingRows[0].last_review,
          intensity_preset: (existingRows[0].intensity_preset as "normal" | "intensive" | "light") ?? "normal",
        }
      : null;

    // 3. Compute next FSRS schedule
    const next = scheduleReview(prev, rating, prev?.intensity_preset ?? "normal");

    // 4. UPSERT user_vocab_mastery
    await tx
      .insert(userVocabMastery)
      .values({
        user_id: userId,
        vocab_item_id: vocabItemId,
        stability: next.stability,
        difficulty: next.difficulty,
        elapsed_days: next.elapsed_days,
        scheduled_days: next.scheduled_days,
        reps: next.reps,
        lapses: next.lapses,
        state: next.state,
        due: next.due,
        last_review: next.last_review,
        intensity_preset: "normal",
        updated_at: sql`NOW()`,
      })
      .onConflictDoUpdate({
        target: [userVocabMastery.user_id, userVocabMastery.vocab_item_id],
        set: {
          stability: next.stability,
          difficulty: next.difficulty,
          elapsed_days: next.elapsed_days,
          scheduled_days: next.scheduled_days,
          reps: next.reps,
          lapses: next.lapses,
          state: next.state,
          due: next.due,
          last_review: next.last_review,
          updated_at: sql`NOW()`,
        },
      });

    // 5. INSERT user_exercise_log — one row per question attempt
    await tx.insert(userExerciseLog).values({
      user_id: userId,
      vocab_item_id: vocabItemId,
      song_version_id: songVersionId,
      exercise_type: exerciseType,
      rating,
      response_time_ms: responseTimeMs,
    });

    // 6. Return tier + key FSRS metrics
    return {
      newTier: tierFor(next.state),
      newState: next.state,
      reps: next.reps,
      lapses: next.lapses,
      due: next.due.toISOString(),
    };
  });
}
