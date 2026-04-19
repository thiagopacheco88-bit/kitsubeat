/**
 * src/lib/gamification/session-integration.ts
 *
 * Phase 12 Plan 04 — Pure glue between DB read (users row + reward_slot_definitions),
 * engine functions, and DB write. Keeps exercises.ts from growing unwieldy.
 *
 * Single exported function: applyGamificationUpdate(input) → GamificationResult
 *
 * Design constraints (must_haves from PLAN.md):
 *   M6: Single write boundary — all XP/streak/level writes go through this function.
 *   M7: Path-node advance is idempotent via the songSlug === current_path_node_slug check.
 *   M1: Path advancement does NOT disable other nodes (only updates current_path_node_slug).
 *   M2: Soft cap does not zero the XP drip (calculateXp handles this — unit-tested in Plan 02).
 */

import { db } from "../db";
import { users, rewardSlotDefinitions, songs } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { calculateXp, XP_CONSTANTS } from "./xp";
import { advanceStreak, localDateFromTz } from "./streak";
import type { StreakState } from "./streak";
import { levelFromXp } from "./level-curve";
import { getNextRewardPreview } from "./reward-slots";
import { trackGamification } from "@/lib/analytics";
import type { RewardSlotDefinition } from "@/lib/types/reward-slots";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GamificationInput {
  userId: string;
  tz: string;
  correctAnswers: number;
  totalAnswers: number;
  sessionType: "short" | "full";
  newStars: 0 | 1 | 2 | 3;
  previousStars: 0 | 1 | 2 | 3;
  songSlug: string;
}

export interface GamificationResult {
  xpGained: number;
  xpTotal: number;
  previousLevel: number;
  currentLevel: number;
  leveledUp: boolean;
  streakCurrent: number;
  streakBest: number;
  graceApplied: boolean;
  /** 0 if no milestone; else 50 / 150 / 400 */
  milestoneXp: number;
  rewardSlotPreview: { id: string; label: string; level_threshold: number } | null;
  pathAdvancedTo: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fetches the song with the next path position after the given slug.
 * Path order: basic → intermediate → advanced, then popularity_rank ASC (nulls last).
 * Returns null if `currentSlug` is the last song in the catalog.
 */
async function getNextPathSlug(currentSlug: string): Promise<string | null> {
  // Fetch the current song's difficulty_tier and popularity_rank so we can
  // use a tuple comparison in the ORDER BY.
  const currentRows = await db
    .select({
      difficulty_tier: songs.difficulty_tier,
      popularity_rank: songs.popularity_rank,
    })
    .from(songs)
    .where(eq(songs.slug, currentSlug))
    .limit(1);

  const current = currentRows[0];
  if (!current) return null;

  // CASE expression: basic=0, intermediate=1, advanced=2
  const tierOrder = sql<number>`CASE ${songs.difficulty_tier}
    WHEN 'basic' THEN 0
    WHEN 'intermediate' THEN 1
    WHEN 'advanced' THEN 2
    ELSE 3
  END`;

  const currentTierOrd =
    current.difficulty_tier === "basic"
      ? 0
      : current.difficulty_tier === "intermediate"
        ? 1
        : current.difficulty_tier === "advanced"
          ? 2
          : 3;

  const currentRank = current.popularity_rank ?? 999999;

  // Select the next slug: (tier_ord, popularity_rank) > current tuple, ORDER ASC
  const nextRows = await db
    .select({ slug: songs.slug })
    .from(songs)
    .where(
      sql`(
        CASE ${songs.difficulty_tier}
          WHEN 'basic' THEN 0
          WHEN 'intermediate' THEN 1
          WHEN 'advanced' THEN 2
          ELSE 3
        END,
        COALESCE(${songs.popularity_rank}, 999999)
      ) > (${currentTierOrd}, ${currentRank})`
    )
    .orderBy(
      tierOrder,
      sql`COALESCE(${songs.popularity_rank}, 999999) ASC`
    )
    .limit(1);

  return nextRows[0]?.slug ?? null;
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

/**
 * Reads the user's gamification state, applies XP/streak/level/path logic,
 * writes the result, and returns the new state for the session summary.
 *
 * Wraps the user SELECT + UPDATE in a single round-trip (two queries, no
 * explicit transaction needed — the UPDATE is conditional on the SELECT values
 * and is non-destructive; idempotent path guard protects against double-advance).
 *
 * Steps:
 *  1. SELECT users row (current xp/level/streak/path state)
 *  2. Upsert user if first session (ensure row exists for gamification state)
 *  3. Detect daily-first, perfectRun, pathOrder bonuses
 *  4. calculateXp → new xp total → levelFromXp → leveledUp
 *  5. advanceStreak → new streak state + milestoneHit
 *  6. If milestoneHit: add streak milestone XP, re-evaluate level
 *  7. Path advancement: if pathOrder bonus earned, compute nextSlug (idempotent)
 *  8. UPDATE users row with all new values
 *  9. SELECT reward_slot_definitions → getNextRewardPreview
 * 10. trackGamification events
 * 11. Return GamificationResult
 */
export async function applyGamificationUpdate(
  input: GamificationInput
): Promise<GamificationResult> {
  const { userId, tz, correctAnswers, totalAnswers, sessionType, newStars, previousStars, songSlug } =
    input;

  // -------------------------------------------------------------------------
  // Step 1: SELECT users row
  // -------------------------------------------------------------------------
  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // Step 2: Upsert user row if it doesn't exist (first session ever)
  if (userRows.length === 0) {
    await db
      .insert(users)
      .values({ id: userId })
      .onConflictDoNothing();
  }

  const userRow = userRows[0] ?? {
    id: userId,
    xpTotal: 0,
    level: 1,
    xpToday: 0,
    xpTodayDate: null,
    streakCurrent: 0,
    streakBest: 0,
    lastStreakDate: null,
    streakTz: null,
    graceUsedThisWeek: false,
    streakWeekStart: null,
    currentPathNodeSlug: null,
    skip_learning: false,
    new_card_cap: 10,
    review_new_today: 0,
    review_new_today_date: null,
    soundEnabled: true,
    hapticsEnabled: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  // -------------------------------------------------------------------------
  // Step 3: Detect bonuses
  // -------------------------------------------------------------------------
  const now = new Date();
  const todayInTz = localDateFromTz(tz, now);

  // Daily-first: xpTodayDate differs from today → first session today
  const dailyFirst = userRow.xpTodayDate !== todayInTz;

  // Reset xp_today if date rolled over
  const xpTodayBefore = dailyFirst ? 0 : (userRow.xpToday ?? 0);

  // Perfect run: all answers correct
  const perfectRun = totalAnswers > 0 && correctAnswers === totalAnswers;

  // Path-order bonus: this song IS the current path node (idempotent guard — M7)
  const pathOrder = userRow.currentPathNodeSlug === songSlug;

  // -------------------------------------------------------------------------
  // Step 4: calculateXp → new xp total → leveledUp
  // -------------------------------------------------------------------------
  const xpResult = calculateXp({
    correctAnswers,
    sessionType,
    newStars,
    previousStars,
    multipliers: { dailyFirst, perfectRun, pathOrder },
    xpTodayBefore,
  });

  const previousLevel = userRow.level ?? 1;
  let newXpTotal = (userRow.xpTotal ?? 0) + xpResult.xpAfterCap;
  let newLevel = levelFromXp(newXpTotal);

  // -------------------------------------------------------------------------
  // Step 5: advanceStreak
  // -------------------------------------------------------------------------
  const streakState: StreakState = {
    streakCurrent: userRow.streakCurrent ?? 0,
    streakBest: userRow.streakBest ?? 0,
    lastStreakDate: userRow.lastStreakDate ?? null,
    streakTz: userRow.streakTz ?? null,
    graceUsedThisWeek: userRow.graceUsedThisWeek ?? false,
    streakWeekStart: userRow.streakWeekStart ?? null,
  };

  const streakResult = advanceStreak(streakState, { tz, now });

  // -------------------------------------------------------------------------
  // Step 6: Streak milestone XP bonus
  // -------------------------------------------------------------------------
  let milestoneXp = 0;
  if (streakResult.milestoneHit !== null) {
    milestoneXp =
      XP_CONSTANTS.STREAK_MILESTONE_BONUS[streakResult.milestoneHit] ?? 0;
    if (milestoneXp > 0) {
      newXpTotal += milestoneXp;
      // Re-evaluate level after milestone bonus
      newLevel = levelFromXp(newXpTotal);
    }
  }

  const leveledUp = newLevel > previousLevel;

  // -------------------------------------------------------------------------
  // Step 7: Path advancement (idempotent — only if pathOrder bonus earned)
  // -------------------------------------------------------------------------
  let pathAdvancedTo: string | null = null;
  let nextPathNodeSlug: string | null = userRow.currentPathNodeSlug ?? null;

  if (pathOrder) {
    // M7: idempotent — only advance if this IS the current node (guaranteed by pathOrder === true)
    const nextSlug = await getNextPathSlug(songSlug);
    if (nextSlug !== null) {
      pathAdvancedTo = nextSlug;
      nextPathNodeSlug = nextSlug;
    }
    // If nextSlug is null, this was the last song — stay on current node
  }

  // -------------------------------------------------------------------------
  // Step 8: UPDATE users row
  // -------------------------------------------------------------------------
  const newXpToday = dailyFirst ? xpResult.xpAfterCap : xpTodayBefore + xpResult.xpAfterCap;

  await db
    .update(users)
    .set({
      xpTotal: newXpTotal,
      level: newLevel,
      xpToday: newXpToday,
      xpTodayDate: todayInTz,
      streakCurrent: streakResult.newState.streakCurrent,
      streakBest: streakResult.newState.streakBest,
      lastStreakDate: streakResult.newState.lastStreakDate,
      streakTz: tz,
      graceUsedThisWeek: streakResult.newState.graceUsedThisWeek,
      streakWeekStart: streakResult.newState.streakWeekStart,
      currentPathNodeSlug: nextPathNodeSlug,
      updated_at: sql`NOW()`,
    })
    .where(eq(users.id, userId));

  // -------------------------------------------------------------------------
  // Step 9: Reward slot preview
  // -------------------------------------------------------------------------
  const slotRows = await db
    .select()
    .from(rewardSlotDefinitions)
    .where(eq(rewardSlotDefinitions.active, true));

  // Cast to RewardSlotDefinition shape expected by reward-slots.ts
  const slotDefs: RewardSlotDefinition[] = slotRows.map((r) => ({
    id: r.id,
    slot_type: r.slot_type as RewardSlotDefinition["slot_type"],
    level_threshold: r.level_threshold,
    content: r.content as RewardSlotDefinition["content"],
    active: r.active ?? true,
  }));

  const preview = getNextRewardPreview(slotDefs, newLevel);
  const rewardSlotPreview: GamificationResult["rewardSlotPreview"] = preview
    ? {
        id: preview.id,
        // label is in content for all types; fall back to slot_type if missing
        label:
          (preview.content as { label?: string }).label ?? preview.slot_type,
        level_threshold: preview.level_threshold,
      }
    : null;

  // -------------------------------------------------------------------------
  // Step 10: trackGamification events (stub — Phase 15 wires to PostHog)
  // -------------------------------------------------------------------------
  const totalXpGained = xpResult.xpAfterCap + milestoneXp;

  trackGamification({ event: "xp_gained", xp: xpResult.xpAfterCap, source: "session" });
  if (milestoneXp > 0) {
    trackGamification({ event: "xp_gained", xp: milestoneXp, source: "streak_milestone" });
  }
  if (leveledUp) {
    trackGamification({ event: "level_up", new_level: newLevel });
  }
  trackGamification({
    event: "streak_updated",
    streak_current: streakResult.newState.streakCurrent,
    grace_applied: streakResult.graceApplied,
  });
  if (pathAdvancedTo) {
    trackGamification({
      event: "path_node_started",
      slug: pathAdvancedTo,
      difficulty_tier: "unknown", // tier resolved lazily by Plan 06 path UI
    });
  }

  // -------------------------------------------------------------------------
  // Step 11: Return result
  // -------------------------------------------------------------------------
  return {
    xpGained: totalXpGained,
    xpTotal: newXpTotal,
    previousLevel,
    currentLevel: newLevel,
    leveledUp,
    streakCurrent: streakResult.newState.streakCurrent,
    streakBest: streakResult.newState.streakBest,
    graceApplied: streakResult.graceApplied,
    milestoneXp,
    rewardSlotPreview,
    pathAdvancedTo,
  };
}
