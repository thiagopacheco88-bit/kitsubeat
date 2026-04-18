/**
 * FSRS Rating Policy
 *
 * Maps exercise outcomes to FSRS Rating values for use in scheduleReview().
 * All rating policy decisions are locked here in one place — future tuning
 * should only change RATING_WEIGHTS and ratingFor(). Downstream callers
 * (scheduler.ts, server actions) import from this module.
 *
 * LOCKED in 08.2-CONTEXT.md: production-flavored exercise types (meaning_vocab)
 * weigh more than pure-surface types (reading_match) to reflect cognitive effort.
 * Reveal-hatch answers are treated as equivalent to a wrong answer (Always Again).
 */

import { Rating } from "ts-fsrs";
import type { ExerciseType } from "@/lib/exercises/generator";

/**
 * FSRSRating — subset of ts-fsrs Rating values used by this app.
 * 1 = Again, 2 = Hard, 3 = Good, 4 = Easy
 */
export type FSRSRating = 1 | 2 | 3 | 4;

// Re-export ts-fsrs Rating enum for callers that prefer named form
export { Rating };

/**
 * RATING_WEIGHTS — correct-answer rating awarded per exercise type.
 *
 * Tunable defaults, LOCKED in 08.2-CONTEXT.md + extended in Phase 10-01:
 * - meaning_vocab       (4 = Easy):    Production-flavored — hardest direction, highest reward
 * - vocab_meaning       (3 = Good):    Recognition — standard reward
 * - fill_lyric          (3 = Good):    Recognition + context — standard reward
 * - reading_match       (2 = Hard):    Pure surface — lowest reward
 * - grammar_conjugation (4 = Easy):    Production-flavored — user produces a form, not recognizes
 * - listening_drill     (3 = Good):    Recognition + ear — parallels vocab_meaning difficulty
 * - sentence_order      (4 = Easy):    Production-flavored — user assembles structure
 *
 * Weight ordering invariant (preserved): production > recognition > surface.
 *
 * Change values here to re-tune the whole system. Do NOT add per-question
 * overrides elsewhere — one source of truth for the policy.
 */
export const RATING_WEIGHTS: Record<ExerciseType, FSRSRating> = {
  meaning_vocab: 4,        // Production-flavored, hardest direction
  vocab_meaning: 3,        // Recognition
  fill_lyric: 3,           // Recognition + context
  reading_match: 2,        // Pure surface, easiest
  // Phase 10 additions
  grammar_conjugation: 4,  // Production-flavored — user produces the form
  listening_drill: 3,      // Recognition + ear
  sentence_order: 4,       // Production-flavored — user assembles structure
};

/**
 * ratingFor — convert an exercise outcome to an FSRS rating.
 *
 * Rules (LOCKED in 08.2-CONTEXT.md):
 * 1. If `opts.revealedReading === true`, return 1 (Again) — the reveal hatch
 *    counts as a non-correct answer for FSRS purposes, equivalent to wrong.
 * 2. If `correct === false`, return 1 (Again).
 * 3. Otherwise, return RATING_WEIGHTS[exerciseType].
 *
 * @param exerciseType   The type of exercise that was answered
 * @param correct        Whether the user selected the correct answer
 * @param opts.revealedReading   True if the user peeked at the reading before answering
 */
export function ratingFor(
  exerciseType: ExerciseType,
  correct: boolean,
  opts?: { revealedReading?: boolean }
): FSRSRating {
  if (opts?.revealedReading === true) {
    return 1; // Reveal hatch always penalizes — treated as Again
  }
  if (!correct) {
    return 1; // Wrong answer is always Again
  }
  return RATING_WEIGHTS[exerciseType];
}
