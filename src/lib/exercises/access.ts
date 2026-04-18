/**
 * Exercise access gate — the ONLY place where free/premium decisions are made.
 *
 * UI components never check EXERCISE_FEATURE_FLAGS directly. They receive
 * either data or { gated: true } from server actions that call this function.
 *
 * Gate paths (Phase 8 + Phase 10):
 *   - "free"       → { allowed: true }
 *   - "song_quota" → Phase 10. Needs opts.songVersionId. Premium users bypass.
 *                    Free users pass until their family's QUOTA_LIMIT is hit;
 *                    already-touched songs ALWAYS pass (they're already counted).
 *                    NEVER increments the counter — increment lives in
 *                    saveSessionResults / recordVocabAnswer (Plan 06) to avoid
 *                    RESEARCH Pitfall 5 double-increment on session resume.
 *   - "premium"    → unchanged; returns { allowed: false, reason: "premium_required" }.
 *
 * When Clerk auth is integrated, userId will be the Clerk subject. For now
 * `isPremium` accepts any string (returns false for unknown users).
 */

import {
  EXERCISE_FEATURE_FLAGS,
  QUOTA_FAMILY,
  QUOTA_LIMITS,
} from "./feature-flags";
import { isPremium } from "@/app/actions/userPrefs";
import { getSongCountForFamily, userHasTouchedSong } from "./counters";

export interface CheckExerciseAccessResult {
  allowed: boolean;
  reason?: string;
  /**
   * Remaining songs in the user's quota (only populated for song_quota paths).
   * For premium users it's omitted — their quota is effectively unbounded.
   */
  quotaRemaining?: number;
}

export async function checkExerciseAccess(
  userId: string,
  exerciseType: string,
  opts?: { songVersionId?: string }
): Promise<CheckExerciseAccessResult> {
  const gate = EXERCISE_FEATURE_FLAGS[exerciseType] ?? "premium";

  if (gate === "free") return { allowed: true };

  if (gate === "song_quota") {
    if (!opts?.songVersionId) {
      return {
        allowed: false,
        reason: "songVersionId required for quota gate",
      };
    }

    // Premium users bypass the song-quota gate entirely — no counter consulted,
    // no quota arithmetic. The counter still gets an insert on first attempt
    // (idempotent, in recordSongAttempt) so downgrade-reconciliation works
    // without retroactive backfill: the set of songs they've touched is still
    // known and future free-tier rules can apply.
    if (await isPremium(userId)) return { allowed: true };

    const family = QUOTA_FAMILY[exerciseType];
    const limit = QUOTA_LIMITS[family];

    // Consult counter (one SELECT) + membership check (one SELECT). Both are
    // cheap under the (user_id, exercise_family) composite index.
    const [alreadyCounted, count] = await Promise.all([
      userHasTouchedSong(userId, family, opts.songVersionId),
      getSongCountForFamily(userId, family),
    ]);

    // Already-counted song always passes — the 11th touch can be the same
    // song the user has been working on. Don't false-deny re-entry.
    if (alreadyCounted) {
      return {
        allowed: true,
        quotaRemaining: Math.max(0, limit - count),
      };
    }

    // New song: inside quota → allowed (counter will increment on first
    // answer in Plan 06). At-or-over → denied.
    if (count < limit) {
      return { allowed: true, quotaRemaining: limit - count };
    }

    return { allowed: false, reason: "quota_exhausted", quotaRemaining: 0 };
  }

  // Default / "premium" path — unchanged from Phase 8.
  // TODO: replace with Clerk userId + real subscription check when auth is added.
  return { allowed: false, reason: "premium_required" };
}
