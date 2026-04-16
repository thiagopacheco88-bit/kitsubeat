"use server";

import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/index";
import { userSongProgress, deriveStars } from "@/lib/db/schema";
import type { ExerciseType } from "@/lib/exercises/generator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnswerRecord {
  questionId: string;
  type: ExerciseType;
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

  return {
    completionPct: updated.completion_pct,
    stars,
    previousStars,
  };
}
