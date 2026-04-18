/**
 * src/lib/exercises/counters.ts — Phase 10 premium quota gate support.
 *
 * Thin drizzle wrapper over `user_exercise_song_counters`. Three narrow reads/
 * writes only — no isPremium lookups, no feature-flag introspection. The gate
 * (src/lib/exercises/access.ts) composes these primitives with the
 * feature-flag map + the isPremium check.
 *
 * Counter semantics (locked in 10-CONTEXT.md):
 * - Row inserted on the user's FIRST answer of an Ex 5/6/7 session for a song.
 * - Counter increment is idempotent via ON CONFLICT DO NOTHING on the unique
 *   (user_id, exercise_family, song_version_id) triple.
 * - COUNT(*) WHERE (user_id, exercise_family) gives "songs used" for the
 *   family's free-tier quota (see QUOTA_LIMITS in feature-flags.ts).
 * - Increment lives in saveSessionResults / recordVocabAnswer (Plan 06),
 *   NEVER inside the gate — see RESEARCH Pitfall 5 double-increment on
 *   session resume.
 */

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { userExerciseSongCounters } from "@/lib/db/schema";
import type { QuotaFamily } from "./feature-flags";

/**
 * getSongCountForFamily — returns the number of distinct songs the user has
 * attempted for the given exercise family.
 *
 * Uses COUNT(*) over the (user_id, exercise_family) composite index. The
 * UNIQUE constraint on (user_id, exercise_family, song_version_id) guarantees
 * each counted row is a distinct song.
 */
export async function getSongCountForFamily(
  userId: string,
  family: QuotaFamily
): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(userExerciseSongCounters)
    .where(
      and(
        eq(userExerciseSongCounters.user_id, userId),
        eq(userExerciseSongCounters.exercise_family, family)
      )
    );
  return rows[0]?.count ?? 0;
}

/**
 * userHasTouchedSong — row-existence check on the unique triple.
 *
 * Used by the gate to distinguish "already-counted song (allow through even
 * at quota)" from "new song (check quota)". Consulting this before count
 * avoids the 11-songs-visible edge case where a user inside their quota
 * who revisits their 5th song gets false-denied at 11 listening songs.
 */
export async function userHasTouchedSong(
  userId: string,
  family: QuotaFamily,
  songVersionId: string
): Promise<boolean> {
  const rows = await db
    .select({ id: userExerciseSongCounters.id })
    .from(userExerciseSongCounters)
    .where(
      and(
        eq(userExerciseSongCounters.user_id, userId),
        eq(userExerciseSongCounters.exercise_family, family),
        eq(userExerciseSongCounters.song_version_id, songVersionId)
      )
    )
    .limit(1);
  return rows.length > 0;
}

/**
 * recordSongAttempt — idempotent counter insert.
 *
 * Called by Plan 06's saveSessionResults / recordVocabAnswer on the user's
 * FIRST answer in an Ex 5/6/7 session. INSERT ... ON CONFLICT DO NOTHING on
 * the unique (user_id, exercise_family, song_version_id) triple makes this
 * safe to call multiple times without inflating the counter.
 *
 * The counter's first_attempt_at column auto-populates via DEFAULT NOW() and
 * is never updated — it records the first-attempt timestamp, not the latest.
 */
export async function recordSongAttempt(
  userId: string,
  family: QuotaFamily,
  songVersionId: string
): Promise<void> {
  await db
    .insert(userExerciseSongCounters)
    .values({
      user_id: userId,
      exercise_family: family,
      song_version_id: songVersionId,
    })
    .onConflictDoNothing({
      target: [
        userExerciseSongCounters.user_id,
        userExerciseSongCounters.exercise_family,
        userExerciseSongCounters.song_version_id,
      ],
    });
}
