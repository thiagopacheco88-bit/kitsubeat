/**
 * grammar-fsrs.ts — Phase 13 per-rule mastery scheduling + level promotion.
 *
 * Thin adapter over the existing FSRS scheduler: grammar rules are scheduled
 * exactly like vocab items, just keyed by grammar_rule_id instead of
 * vocab_item_id. The extra piece this file owns is the beginner → intermediate
 * → advanced promotion rule, which lives separately from FSRS state.
 *
 * Promotion predicate (tunable in one place):
 *   - stability ≥ 21 days (the same threshold we call "mature" for vocab)
 *   - reps ≥ 8 at the current level
 *   - last 3 grades contain no Again (rating=1) at the current level
 *
 * When a promotion fires, recent_grades is reset so the new level starts its
 * own streak.
 */

import type { GrammarLevel } from "@/lib/types/lesson";
import type { UserGrammarRuleMastery } from "@/lib/db/schema";
import type { FSRSRating } from "@/lib/fsrs/rating";

export const PROMOTION_STABILITY_DAYS = 21;
export const PROMOTION_MIN_REPS = 8;
export const PROMOTION_RECENT_WINDOW = 3;

export function nextLevel(level: GrammarLevel): GrammarLevel | null {
  if (level === "beginner") return "intermediate";
  if (level === "intermediate") return "advanced";
  return null;
}

/**
 * Decide whether to promote, given the post-review FSRS state + the new grade.
 * Returns the new level if eligible, else the same level.
 *
 * `recentGrades` is the mastery row's `recent_grades` BEFORE this answer; the
 * caller appends the latest grade (capped to the promotion window) before
 * passing in.
 */
export function promoteIfEligible(args: {
  currentLevel: GrammarLevel;
  stabilityAfter: number | null;
  repsAfter: number;
  recentGrades: FSRSRating[];
}): { newLevel: GrammarLevel; promoted: boolean; nextRecentGrades: FSRSRating[] } {
  const { currentLevel, stabilityAfter, repsAfter, recentGrades } = args;

  if (currentLevel === "advanced") {
    return { newLevel: currentLevel, promoted: false, nextRecentGrades: recentGrades };
  }

  const stable = (stabilityAfter ?? 0) >= PROMOTION_STABILITY_DAYS;
  const enoughReps = repsAfter >= PROMOTION_MIN_REPS;
  const lastWindow = recentGrades.slice(-PROMOTION_RECENT_WINDOW);
  const noLapseRecently =
    lastWindow.length >= PROMOTION_RECENT_WINDOW &&
    !lastWindow.includes(1 as FSRSRating);

  if (stable && enoughReps && noLapseRecently) {
    const next = nextLevel(currentLevel);
    if (next) {
      return { newLevel: next, promoted: true, nextRecentGrades: [] };
    }
  }

  return { newLevel: currentLevel, promoted: false, nextRecentGrades: recentGrades };
}

/**
 * Helper — take the user's recent grades history plus the new grade and return
 * a bounded slice suitable for storing back in the mastery row.
 */
export function appendRecentGrade(
  history: FSRSRating[],
  next: FSRSRating
): FSRSRating[] {
  const combined = [...history, next];
  const maxWindow = PROMOTION_RECENT_WINDOW;
  return combined.length > maxWindow ? combined.slice(-maxWindow) : combined;
}

/** Narrow row type used by selection queries — avoids importing the whole schema. */
export type GrammarMasterySnapshot = Pick<
  UserGrammarRuleMastery,
  "current_level" | "stability" | "reps" | "state" | "due"
>;
