/**
 * GET /api/exercises/vocab-mastery/[vocabItemId]?userId=<userId>
 *
 * Single-vocab mastery detail for the tap-to-inspect feedback panel.
 *
 * Returns full FSRS metrics for a vocab item. For new words (no mastery row),
 * returns a synthesized "new word" shape — never 404 on missing mastery.
 *
 * Only returns 404 on a truly malformed route (future-proofed with UUID validation).
 *
 * Cache-Control: private, no-store — ensures stale tabs always re-fetch fresh data.
 */

import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { userVocabMastery, userExerciseLog } from "@/lib/db/schema";
import { tierFor } from "@/lib/fsrs/tier";
import { getSeenInSongsForVocab } from "@/lib/db/queries";

/** UUID v4 regex — used to guard against malformed route params */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface MasteryDetail {
  vocabItemId: string;
  state: 0 | 1 | 2 | 3;
  tier: 1 | 2 | 3;
  reps: number;
  lapses: number;
  correctPct: number;      // 0..1
  stability: number | null;
  difficulty: number | null;
  due: string | null;      // ISO or null for new word
  lastReview: string | null;
  totalAttempts: number;
  /** Songs where this vocabulary item appears. Empty for items not yet in vocab_global. */
  seenInSongs: Array<{ slug: string; title: string; anime: string }>;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ vocabItemId: string }> } | { params: { vocabItemId: string } }
) {
  // Next 15 dynamic route signature — params may be a Promise
  const params = await (context.params instanceof Promise
    ? context.params
    : Promise.resolve(context.params));

  const { vocabItemId } = params;
  const { searchParams } = request.nextUrl;
  const userId = searchParams.get("userId");

  // Validate UUID format
  if (!vocabItemId || !UUID_REGEX.test(vocabItemId)) {
    return NextResponse.json(
      { error: "Invalid or missing vocabItemId — must be a valid UUID" },
      { status: 404 }
    );
  }

  if (!userId) {
    return NextResponse.json(
      { error: "Missing required query parameter: userId" },
      { status: 400 }
    );
  }

  // Fetch mastery row, exercise log stats, and seen-in-songs in parallel
  const [masteryRows, logStats, seenInSongs] = await Promise.all([
    db
      .select()
      .from(userVocabMastery)
      .where(
        and(
          eq(userVocabMastery.user_id, userId),
          eq(userVocabMastery.vocab_item_id, vocabItemId)
        )
      )
      .limit(1),
    // rating > 1 means Hard/Good/Easy (i.e. not Again = wrong answer)
    db
      .select({
        total: sql<number>`count(*)::int`,
        correct: sql<number>`count(*) filter (where rating > 1)::int`,
      })
      .from(userExerciseLog)
      .where(
        and(
          eq(userExerciseLog.user_id, userId),
          eq(userExerciseLog.vocab_item_id, vocabItemId)
        )
      ),
    getSeenInSongsForVocab(vocabItemId),
  ]);

  const mastery = masteryRows[0] ?? null;
  const stats = logStats[0] ?? { total: 0, correct: 0 };
  const totalAttempts = stats.total ?? 0;
  const correctCount = stats.correct ?? 0;
  const correctPct = totalAttempts > 0 ? correctCount / totalAttempts : 0;

  // Build response — synthesize new-word shape when no mastery row exists
  const state = (mastery?.state ?? 0) as 0 | 1 | 2 | 3;
  const detail: MasteryDetail = {
    vocabItemId,
    state,
    tier: tierFor(state),
    reps: mastery?.reps ?? 0,
    lapses: mastery?.lapses ?? 0,
    correctPct,
    stability: mastery?.stability ?? null,
    difficulty: mastery?.difficulty ?? null,
    due: mastery?.due ? mastery.due.toISOString() : null,
    lastReview: mastery?.last_review ? mastery.last_review.toISOString() : null,
    totalAttempts,
    seenInSongs,
  };

  return NextResponse.json(detail, {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}
