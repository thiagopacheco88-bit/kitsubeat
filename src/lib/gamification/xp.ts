/**
 * Phase 12-02 — XP calculator.
 *
 * Pure functions for computing XP gained from a session, applying
 * the daily soft cap. Zero DB imports.
 *
 * Phase 15 will wire these results into analytics events via
 * trackGamification (src/lib/analytics.ts).
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const XP_CONSTANTS = {
  /** XP per correct exercise answer. */
  PER_ANSWER: 2,
  /** XP for completing a short session. */
  SESSION_SHORT: 15,
  /** XP for completing a full session. */
  SESSION_FULL: 25,
  /** Bonus XP for earning a new star (keyed by star number). */
  STAR_BONUS: { 1: 30, 2: 60, 3: 100 } as Record<1 | 2 | 3, number>,
  /** Daily soft-cap threshold in XP. */
  DAILY_SOFT_CAP: 250,
  /** XP rate above the soft cap (25% of base). */
  ABOVE_CAP_RATE: 0.25,
  /** Streak milestone bonuses — applied separately in streak.ts. */
  STREAK_MILESTONE_BONUS: { 7: 50, 30: 150, 100: 400 } as Record<number, number>,
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CalculateXpInput {
  correctAnswers: number;
  sessionType: "short" | "full";
  /** Star level just achieved (0–3). */
  newStars: 0 | 1 | 2 | 3;
  /** Star level before this session (0–3). */
  previousStars: 0 | 1 | 2 | 3;
  multipliers: {
    /** First session of the calendar day → 1.5× multiplier. */
    dailyFirst: boolean;
    /** Zero wrong answers → +25% multiplier. */
    perfectRun: boolean;
    /** Next recommended path node → +25% multiplier. */
    pathOrder: boolean;
  };
  /** Total XP already accumulated today (before this session). */
  xpTodayBefore: number;
}

export interface CalculateXpResult {
  /** Raw XP before multipliers or cap. */
  xpBase: number;
  /** XP after multiplier stack, floored. */
  xpAfterMultipliers: number;
  /** Actual XP credited after the soft-cap reduction, floored. */
  xpAfterCap: number;
  /**
   * The daily XP value at which capping kicked in.
   * - null   — no capping occurred
   * - DAILY_SOFT_CAP — xpTodayBefore was below cap but result crossed it
   * - xpTodayBefore — xpTodayBefore was already at or above the cap
   */
  cappedAt: number | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute the star-bonus XP for the delta between previousStars and newStars.
 * Clamped to 0 — regressions (newStars < previousStars) yield no bonus.
 */
function starBonusForDelta(newStars: 0 | 1 | 2 | 3, previousStars: 0 | 1 | 2 | 3): number {
  const delta = Math.max(0, newStars - previousStars);
  if (delta === 0) return 0;

  let bonus = 0;
  for (let s = previousStars + 1; s <= newStars; s++) {
    bonus += XP_CONSTANTS.STAR_BONUS[s as 1 | 2 | 3] ?? 0;
  }
  return bonus;
}

/**
 * Apply the daily soft cap to a pre-multiplier-adjusted XP amount.
 *
 * - If xpTodayBefore < DAILY_SOFT_CAP: fill to cap at 100%, then overflow at 25%.
 * - If xpTodayBefore >= DAILY_SOFT_CAP: entire amount at 25%.
 */
export function applyDailyCap(
  xpAfterMultipliers: number,
  xpTodayBefore: number
): { xpAfterCap: number; cappedAt: number | null } {
  const cap = XP_CONSTANTS.DAILY_SOFT_CAP;
  const rate = XP_CONSTANTS.ABOVE_CAP_RATE;

  if (xpTodayBefore >= cap) {
    // Already above cap — entire session at reduced rate.
    return {
      xpAfterCap: Math.floor(xpAfterMultipliers * rate),
      cappedAt: xpTodayBefore,
    };
  }

  const headroom = cap - xpTodayBefore;
  if (xpAfterMultipliers <= headroom) {
    // Entire session stays below cap — no reduction.
    return { xpAfterCap: xpAfterMultipliers, cappedAt: null };
  }

  // Partial: fill headroom at 100%, overflow at 25%.
  const overflow = xpAfterMultipliers - headroom;
  const xpAfterCap = Math.floor(headroom + overflow * rate);
  return { xpAfterCap, cappedAt: cap };
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

/**
 * Calculate XP gained for a single session.
 *
 * Deterministic multiplier order: dailyFirst → perfectRun → pathOrder.
 */
export function calculateXp(input: CalculateXpInput): CalculateXpResult {
  const {
    correctAnswers,
    sessionType,
    newStars,
    previousStars,
    multipliers,
    xpTodayBefore,
  } = input;

  // 1. Base XP
  const sessionBonus =
    sessionType === "full" ? XP_CONSTANTS.SESSION_FULL : XP_CONSTANTS.SESSION_SHORT;
  const starBonus = starBonusForDelta(newStars, previousStars);
  const xpBase = correctAnswers * XP_CONSTANTS.PER_ANSWER + sessionBonus + starBonus;

  // 2. Multiplier stack (deterministic order, floored once at the end)
  let mult = 1;
  if (multipliers.dailyFirst) mult *= 1.5;
  if (multipliers.perfectRun) mult *= 1.25;
  if (multipliers.pathOrder) mult *= 1.25;
  const xpAfterMultipliers = Math.floor(xpBase * mult);

  // 3. Daily soft cap
  const { xpAfterCap, cappedAt } = applyDailyCap(xpAfterMultipliers, xpTodayBefore);

  return { xpBase, xpAfterMultipliers, xpAfterCap, cappedAt };
}
