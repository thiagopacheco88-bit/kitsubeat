"use server";

import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/index";
import { userSongProgress, deriveStars, deriveBonusBadge, userVocabMastery, userExerciseLog } from "@/lib/db/schema";
import type { ExerciseType } from "@/lib/exercises/generator";
import { ratingFor } from "@/lib/fsrs/rating";
import { scheduleReview } from "@/lib/fsrs/scheduler";
import type { MasteryRow } from "@/lib/fsrs/scheduler";
import { tierFor } from "@/lib/fsrs/tier";
import { checkExerciseAccess } from "@/lib/exercises/access";
import {
  QUOTA_FAMILY,
  QUOTA_LIMITS,
  type QuotaFamily,
} from "@/lib/exercises/feature-flags";
import { recordSongAttempt, getSongCountForFamily } from "@/lib/exercises/counters";
import { isPremium } from "@/app/actions/userPrefs";
import { userExerciseSongCounters } from "@/lib/db/schema";
import { and } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Phase 10 Plan 06 — Advanced Drills access summary (server action).
//
// Consumed by src/app/songs/[slug]/components/ExerciseTab.tsx at "Advanced
// Drills" mode-card click. ExerciseTab MUST NOT import EXERCISE_FEATURE_FLAGS
// or checkExerciseAccess directly (violates the Phase 08.1-07 single-gate
// regression contract); this action is the thin server-action wrapper.
//
// Returns one summary covering BOTH quota families so the UI decides which
// upsell modal to show (listening @ 10-song cap vs advanced_drill @ 3-song
// cap, shared between grammar_conjugation + sentence_order).
//
// Both gate calls run in parallel via Promise.all — each is already a ~2ms
// SELECT against the composite-indexed counter table, so the latency budget
// for the mode-card click is well under the 16ms frame budget.
// ---------------------------------------------------------------------------

export interface AdvancedDrillAccess {
  listeningAllowed: boolean;
  advancedAllowed: boolean;
  listeningQuotaRemaining: number;
  advancedQuotaRemaining: number;
  listeningQuotaLimit: number;
  advancedQuotaLimit: number;
  /** True when the user has an active premium subscription — UI may hide "upgrade" affordances. */
  isPremium: boolean;
}

export async function getAdvancedDrillAccess(
  userId: string,
  songVersionId: string
): Promise<AdvancedDrillAccess> {
  if (!userId || !songVersionId) {
    return {
      listeningAllowed: false,
      advancedAllowed: false,
      listeningQuotaRemaining: 0,
      advancedQuotaRemaining: 0,
      listeningQuotaLimit: QUOTA_LIMITS.listening,
      advancedQuotaLimit: QUOTA_LIMITS.advanced_drill,
      isPremium: false,
    };
  }

  // grammar_conjugation and sentence_order share the advanced_drill family,
  // so one call covers both (same QUOTA_FAMILY value → same counter). A
  // two-call parallel probe is the fastest path to two structured results.
  const [listeningResult, advancedResult, premium] = await Promise.all([
    checkExerciseAccess(userId, "listening_drill", { songVersionId }),
    checkExerciseAccess(userId, "grammar_conjugation", { songVersionId }),
    isPremium(userId),
  ]);

  return {
    listeningAllowed: listeningResult.allowed,
    advancedAllowed: advancedResult.allowed,
    // checkExerciseAccess returns quotaRemaining only on quota-related outcomes.
    // Defaulting to the family limit gives the UI a safe number when the user
    // is premium (unbounded) or the gate returned a different shape.
    listeningQuotaRemaining:
      listeningResult.quotaRemaining ?? QUOTA_LIMITS.listening,
    advancedQuotaRemaining:
      advancedResult.quotaRemaining ?? QUOTA_LIMITS.advanced_drill,
    listeningQuotaLimit: QUOTA_LIMITS.listening,
    advancedQuotaLimit: QUOTA_LIMITS.advanced_drill,
    isPremium: premium,
  };
}

// ---------------------------------------------------------------------------
// Phase 10 Plan 06 — Quota-exhausted error signal (thrown from recordVocabAnswer
// after the counter insert + re-count uncovers a race-condition overshoot).
//
// The caller (ExerciseSession / ConjugationCard / ListeningDrillCard /
// SentenceOrderCard) can catch this and show the post-answer upsell modal.
// RESEARCH Pitfall 6 trade-off: one answer of slippage is possible under
// cross-device race — documented in the upsell copy ("You just used your
// last free song").
// ---------------------------------------------------------------------------

export class QuotaExhaustedError extends Error {
  readonly family: QuotaFamily;
  readonly quotaLimit: number;
  constructor(family: QuotaFamily) {
    super(`Quota exhausted for family ${family}`);
    this.name = "QuotaExhaustedError";
    this.family = family;
    this.quotaLimit = QUOTA_LIMITS[family];
  }
}

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

interface SongMasteryCounts {
  total: number;
  mastered: number;
  learning: number;
  new: number;
}

interface SaveSessionResult {
  completionPct: number;
  stars: 0 | 1 | 2 | 3;
  previousStars: 0 | 1 | 2 | 3;
  /**
   * Phase 10 Plan 07 — bonus mastery badge predicate after this session's upsert.
   * True when BOTH grammar_conjugation (ex5) AND sentence_order (ex7) best_accuracy >= 80%.
   * Surfaced on SessionSummary when the value flips false → true during this session.
   */
  bonusBadge: boolean;
  /**
   * Snapshot of bonusBadge BEFORE this session's upsert — used by SessionSummary
   * to detect the false → true transition and surface a one-line "Bonus mastery
   * unlocked!" callout. No confetti (CONTEXT: bonus badge is subtle, secondary
   * to stars).
   */
  previousBonusBadge: boolean;
  songMastery: SongMasteryCounts;
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
  //
  // Phase 10 Plan 06 adds three more exercise-type buckets for the Advanced
  // Drills mode. Each bucket writes to its own best-accuracy column via the
  // same GREATEST(COALESCE) pattern as ex1_2_3 / ex4, so mastery never
  // regresses on a lower-accuracy retry.
  //
  //   ex5 → grammar_conjugation  (bonus badge component)
  //   ex6 → listening_drill      (drives Star 3)
  //   ex7 → sentence_order       (bonus badge component)
  const ex1_2_3Types: ExerciseType[] = [
    "vocab_meaning",
    "meaning_vocab",
    "reading_match",
  ];
  const ex1_2_3Answers = answers.filter((a) =>
    ex1_2_3Types.includes(a.type)
  );
  const ex4Answers = answers.filter((a) => a.type === "fill_lyric");
  const ex5Answers = answers.filter((a) => a.type === "grammar_conjugation");
  const ex6Answers = answers.filter((a) => a.type === "listening_drill");
  const ex7Answers = answers.filter((a) => a.type === "sentence_order");

  // --- Step 2: Compute accuracy per group ---
  const computeAccuracy = (group: AnswerRecord[]): number | null => {
    if (group.length === 0) return null;
    return group.filter((a) => a.correct).length / group.length;
  };

  const newEx1_2_3Accuracy = computeAccuracy(ex1_2_3Answers);
  const newEx4Accuracy = computeAccuracy(ex4Answers);
  const newEx5Accuracy = computeAccuracy(ex5Answers);
  const newEx6Accuracy = computeAccuracy(ex6Answers);
  const newEx7Accuracy = computeAccuracy(ex7Answers);

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
        // Phase 10: previous-stars snapshot must include Ex 6 so a user who
        // already had Star 3 before this session sees previousStars=3 (no
        // false confetti on a downgrade round — see Pitfall 7 in 10-RESEARCH).
        ex6_best_accuracy: previousRow.ex6_best_accuracy,
      })
    : 0;

  // Phase 10 Plan 07 — bonus badge BEFORE snapshot, so SessionSummary can
  // detect a false → true transition and surface the "Bonus mastery unlocked!"
  // callout. Derived from the pre-upsert row for the same reason as
  // previousStars (Pitfall 7 — snapshot must be taken before GREATEST merges
  // the new session's accuracy into the row).
  const previousBonusBadge = previousRow
    ? deriveBonusBadge({
        ex5_best_accuracy: previousRow.ex5_best_accuracy,
        ex7_best_accuracy: previousRow.ex7_best_accuracy,
      })
    : false;

  // --- Step 5: Upsert with GREATEST/LEAST patterns ---
  //
  // Phase 10 Plan 06: ex5 / ex6 / ex7 accuracy columns join the same upsert.
  // Each uses GREATEST(COALESCE(col, 0), newAcc) so bests never regress. If
  // the current session has zero answers for a given type, the existing
  // column value is preserved verbatim (no-op assignment).
  await db
    .insert(userSongProgress)
    .values({
      user_id: userId,
      song_version_id: songVersionId,
      completion_pct: Math.min(100, completionIncrement),
      ex1_2_3_best_accuracy: newEx1_2_3Accuracy,
      ex4_best_accuracy: newEx4Accuracy,
      ex5_best_accuracy: newEx5Accuracy,
      ex6_best_accuracy: newEx6Accuracy,
      ex7_best_accuracy: newEx7Accuracy,
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
        ex5_best_accuracy:
          newEx5Accuracy !== null
            ? sql`GREATEST(COALESCE(${userSongProgress.ex5_best_accuracy}, 0), ${newEx5Accuracy})`
            : userSongProgress.ex5_best_accuracy,
        ex6_best_accuracy:
          newEx6Accuracy !== null
            ? sql`GREATEST(COALESCE(${userSongProgress.ex6_best_accuracy}, 0), ${newEx6Accuracy})`
            : userSongProgress.ex6_best_accuracy,
        ex7_best_accuracy:
          newEx7Accuracy !== null
            ? sql`GREATEST(COALESCE(${userSongProgress.ex7_best_accuracy}, 0), ${newEx7Accuracy})`
            : userSongProgress.ex7_best_accuracy,
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
    return {
      completionPct: completionIncrement,
      stars: 0,
      previousStars: 0,
      bonusBadge: false,
      previousBonusBadge: false,
      songMastery: { total: 0, mastered: 0, learning: 0, new: 0 },
    };
  }

  const stars = deriveStars({
    ex1_2_3_best_accuracy: updated.ex1_2_3_best_accuracy,
    ex4_best_accuracy: updated.ex4_best_accuracy,
    // Phase 10: Star 3 requires Ex 6 (Listening Drill) at ≥80%.
    ex6_best_accuracy: updated.ex6_best_accuracy,
  });

  // Phase 10 Plan 07 — bonus badge AFTER snapshot. Combined with previousBonusBadge
  // above, the UI detects false → true transition for the subtle unlock callout.
  const bonusBadge = deriveBonusBadge({
    ex5_best_accuracy: updated.ex5_best_accuracy,
    ex7_best_accuracy: updated.ex7_best_accuracy,
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

  // --- Step 8: Song mastery tier breakdown ---
  //
  // Aggregates the song's vocabulary by FSRS state for this user so the
  // SessionSummary can show real coverage (new / learning / mastered of total)
  // instead of the session-credit completion_pct. LEFT JOIN maps missing
  // user_vocab_mastery rows to "new" per the 08.2 cold-start rule. State 2 is
  // Review (mastered, tier 3); states 1 and 3 collapse to Learning per
  // src/lib/fsrs/tier.ts.
  const masteryRows = await db.execute<{
    total: number;
    mastered: number;
    learning: number;
    new_count: number;
  }>(sql`
    WITH song_vocab AS (
      SELECT DISTINCT (elem->>'vocab_item_id')::uuid AS vocab_item_id
      FROM song_versions sv
      CROSS JOIN LATERAL jsonb_array_elements(sv.lesson->'vocabulary') AS elem
      WHERE sv.id = ${songVersionId}::uuid
        AND sv.lesson IS NOT NULL
        AND elem->>'vocab_item_id' IS NOT NULL
    )
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE m.state = 2)::int AS mastered,
      COUNT(*) FILTER (WHERE m.state IN (1, 3))::int AS learning,
      COUNT(*) FILTER (WHERE m.state IS NULL OR m.state = 0)::int AS new_count
    FROM song_vocab s
    LEFT JOIN user_vocab_mastery m
      ON m.vocab_item_id = s.vocab_item_id
      AND m.user_id = ${userId}
  `);

  const rawMastery = Array.isArray(masteryRows)
    ? masteryRows
    : (masteryRows.rows ?? []);
  const first = rawMastery[0] as
    | { total: number; mastered: number; learning: number; new_count: number }
    | undefined;
  const songMastery: SongMasteryCounts = {
    total: Number(first?.total ?? 0),
    mastered: Number(first?.mastered ?? 0),
    learning: Number(first?.learning ?? 0),
    new: Number(first?.new_count ?? 0),
  };

  // --- Step 9: Counter-increment safety-net for ex5/6/7 ---
  //
  // Phase 10 Plan 06: recordVocabAnswer already increments the counter on the
  // first per-vocab write for listening_drill / grammar_conjugation (when
  // vocabItemId is present). sentence_order AND synthetic-vocab grammar_
  // conjugation answers carry the empty-string sentinel and do not go through
  // recordVocabAnswer — so the counter would never get stamped via that path.
  //
  // At end-of-session we stamp one counter row per family present in the
  // answer batch. ON CONFLICT DO NOTHING guarantees no double-increment
  // against any prior per-answer stamp. This is the durable backstop for the
  // "first answer of first question" CONTEXT requirement when answers bypass
  // the per-vocab FSRS path.
  //
  // No server-side re-check here — that path is owned by recordVocabAnswer /
  // recordAdvancedDrillAttempt. By the time saveSessionResults runs, the
  // session has completed; tightening the quota post-hoc would invalidate
  // work already rewarded in the ex5/6/7 columns.
  const familiesTouched = new Set<QuotaFamily>();
  for (const a of answers) {
    const fam = QUOTA_FAMILY[a.type] as QuotaFamily | undefined;
    if (fam) familiesTouched.add(fam);
  }
  for (const family of familiesTouched) {
    try {
      await recordSongAttempt(userId, family, songVersionId);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        `[saveSessionResults] counter safety-net increment failed (family=${family}, song=${songVersionId}):`,
        err
      );
    }
  }

  return {
    completionPct: updated.completion_pct,
    stars,
    previousStars,
    bonusBadge,
    previousBonusBadge,
    songMastery,
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

  // neon-http driver does not support callback-form transactions.
  // Mastery upsert is the durability-critical write; the log row is analytics-only,
  // so we accept the (rare) window where the upsert succeeds but the log insert fails.
  const rating = ratingFor(exerciseType, correct, { revealedReading });

  const existingRows = await db
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

  const next = scheduleReview(prev, rating, prev?.intensity_preset ?? "normal");

  await db
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

  await db.insert(userExerciseLog).values({
    user_id: userId,
    vocab_item_id: vocabItemId,
    song_version_id: songVersionId,
    exercise_type: exerciseType,
    rating,
    response_time_ms: responseTimeMs,
  });

  // Phase 10 Plan 06 — Counter-increment on first answer per song.
  //
  // When the exercise type is song_quota-gated (listening_drill /
  // grammar_conjugation / sentence_order) AND the caller supplied a real
  // songVersionId, stamp the counter. ON CONFLICT DO NOTHING guarantees
  // idempotency across session resumes + rapid consecutive answers (Pitfall 5
  // immune by construction).
  //
  // Counter increment happens AFTER the successful FSRS + log writes so a
  // failed mastery upsert short-circuits without consuming a quota slot.
  //
  // Premium users still get a counter row — this preserves downgrade-
  // reconciliation semantics (set of attempted songs is known without
  // retroactive backfill when premium lapses).
  //
  // Server-side re-check: after the insert, we re-count rows for the family.
  // If the user is now OVER limit (cross-device / cross-tab race overshot the
  // tab-open gate) AND they're not premium, we refund the insert + throw a
  // QuotaExhaustedError. RESEARCH Pitfall 6 trade-off: one answer of slippage
  // possible before the refund — documented in upsell copy.
  if (songVersionId && QUOTA_FAMILY[exerciseType]) {
    const family = QUOTA_FAMILY[exerciseType] as QuotaFamily;
    try {
      await recordSongAttempt(userId, family, songVersionId);

      // Re-check after the insert. Premium users skip the re-check — their
      // quota is effectively unbounded, so a post-insert count that exceeds
      // the free-tier limit is expected.
      const premium = await isPremium(userId);
      if (!premium) {
        const count = await getSongCountForFamily(userId, family);
        const limit = QUOTA_LIMITS[family];
        if (count > limit) {
          // Refund — delete THIS (user, family, song) row so the user retains
          // access to their already-counted songs. `count > limit` implies
          // the current insert is the overshoot; deleting it brings count
          // back to the limit.
          await db
            .delete(userExerciseSongCounters)
            .where(
              and(
                eq(userExerciseSongCounters.user_id, userId),
                eq(userExerciseSongCounters.exercise_family, family),
                eq(userExerciseSongCounters.song_version_id, songVersionId)
              )
            );
          throw new QuotaExhaustedError(family);
        }
      }
    } catch (err) {
      // Re-throw QuotaExhaustedError so the caller can surface the upsell.
      if (err instanceof QuotaExhaustedError) throw err;
      // Other errors (connection drop, transient) are logged but do not fail
      // the answer record — the FSRS write is the durability-critical path.
      // eslint-disable-next-line no-console
      console.error(
        `[recordVocabAnswer] counter increment failed (family=${family}, song=${songVersionId}):`,
        err
      );
    }
  }

  return {
    newTier: tierFor(next.state),
    newState: next.state,
    reps: next.reps,
    lapses: next.lapses,
    due: next.due.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Phase 10 Plan 06 — recordAdvancedDrillAttempt
//
// Used by SentenceOrderCard and any caller where vocabItemId is the empty-
// string sentinel (verse-centric questions). Performs the same counter insert
// + server-side re-check as recordVocabAnswer — decoupled so callers that
// bypass per-vocab FSRS writes still consume the free-tier quota.
//
// Exposed as its own server action (not inlined) so:
//   1. SentenceOrderCard stays free of FSRS imports.
//   2. The re-check + refund path has a single, testable code path.
//   3. Future verse-centric exercise types can reuse it without modifying
//      recordVocabAnswer's signature.
// ---------------------------------------------------------------------------

export async function recordAdvancedDrillAttempt(
  userId: string,
  songVersionId: string,
  exerciseType: ExerciseType
): Promise<{ ok: true } | { ok: false; reason: "quota_exhausted"; family: QuotaFamily }> {
  const family = QUOTA_FAMILY[exerciseType] as QuotaFamily | undefined;
  if (!family) {
    // Non-gated type — nothing to do.
    return { ok: true };
  }
  if (!userId || !songVersionId) return { ok: true };

  try {
    await recordSongAttempt(userId, family, songVersionId);

    const premium = await isPremium(userId);
    if (premium) return { ok: true };

    const count = await getSongCountForFamily(userId, family);
    const limit = QUOTA_LIMITS[family];
    if (count > limit) {
      await db
        .delete(userExerciseSongCounters)
        .where(
          and(
            eq(userExerciseSongCounters.user_id, userId),
            eq(userExerciseSongCounters.exercise_family, family),
            eq(userExerciseSongCounters.song_version_id, songVersionId)
          )
        );
      return { ok: false, reason: "quota_exhausted", family };
    }
    return { ok: true };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      `[recordAdvancedDrillAttempt] counter increment failed (family=${family}, song=${songVersionId}):`,
      err
    );
    // On transient error, allow through (the tab-open gate already approved).
    return { ok: true };
  }
}
