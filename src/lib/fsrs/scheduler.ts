/**
 * FSRS Scheduler Wrapper
 *
 * Wraps ts-fsrs to provide a clean, scalar-column interface that maps
 * directly to the user_vocab_mastery DB columns. Downstream plan 08.2-02
 * can spread ScheduledUpdate directly into a Drizzle insert/update call.
 *
 * LOCKED in 08.2-CONTEXT.md: intensity preset parameters are applied at
 * schedule time via the explicit `intensity` argument. The optional
 * `intensity_preset` field on MasteryRow is carried for UI/DB use only
 * and is intentionally ignored by scheduleReview().
 */

import { fsrs, Rating, State, createEmptyCard } from "ts-fsrs";
import type { Card } from "ts-fsrs";
import { INTENSITY_PRESETS, type IntensityPreset } from "@/lib/fsrs-presets";
import type { FSRSRating } from "./rating";

/**
 * ScheduledUpdate — scalar columns returned after one review.
 * Matches the user_vocab_mastery FSRS scalar columns 1:1 for direct spread
 * into Drizzle insert/update in plan 08.2-02.
 */
export interface ScheduledUpdate {
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  /** FSRS state: 0=New, 1=Learning, 2=Review, 3=Relearning */
  state: 0 | 1 | 2 | 3;
  due: Date;
  last_review: Date;
}

/**
 * MasteryRow — scalar columns read from user_vocab_mastery for a prior review.
 * All FSRS columns may be null on a brand-new row (never reviewed).
 *
 * NOTE: `intensity_preset` is included here because callers that SELECT the
 * whole row from Drizzle and pass it to scheduleReview() will have this field
 * present. scheduleReview() intentionally ignores it — the active preset is
 * always passed as the explicit `intensity` argument.
 */
export interface MasteryRow {
  stability: number | null;
  difficulty: number | null;
  elapsed_days: number | null;
  scheduled_days: number | null;
  reps: number;
  lapses: number;
  /** FSRS state: 0=New, 1=Learning, 2=Review, 3=Relearning */
  state: 0 | 1 | 2 | 3;
  due: Date | null;
  last_review: Date | null;
  /**
   * Carried on the row for UI/DB use only.
   * scheduleReview() ignores this — pass the active preset as `intensity`.
   */
  intensity_preset?: IntensityPreset;
}

/**
 * scheduleReview — compute next FSRS review schedule for a vocab item.
 *
 * @param prev       Prior mastery row from user_vocab_mastery, or null for a new card
 * @param rating     FSRSRating (1=Again, 2=Hard, 3=Good, 4=Easy) from ratingFor()
 * @param intensity  Active intensity preset (default: "normal")
 * @param now        Review time (default: current time); injectable for testing
 * @returns          ScheduledUpdate ready to spread into Drizzle upsert
 */
export function scheduleReview(
  prev: MasteryRow | null,
  rating: FSRSRating,
  intensity: IntensityPreset = "normal",
  now: Date = new Date()
): ScheduledUpdate {
  // Build a ts-fsrs Card from the previous mastery row (or create empty for new card)
  let card: Card;
  if (prev === null) {
    card = createEmptyCard(now);
  } else {
    card = {
      due: prev.due ?? now,
      stability: prev.stability ?? 0,
      difficulty: prev.difficulty ?? 0,
      elapsed_days: prev.elapsed_days ?? 0,
      scheduled_days: prev.scheduled_days ?? 0,
      reps: prev.reps,
      lapses: prev.lapses,
      state: prev.state as State,
      last_review: prev.last_review ?? now,
    };
  }

  // Instantiate FSRS with the selected intensity preset parameters
  const f = fsrs(INTENSITY_PRESETS[intensity]);

  // Compute the next card state
  const nextCard = f.next(card, now, rating as Rating).card;

  // Map back to scalar ScheduledUpdate columns
  return {
    stability: nextCard.stability,
    difficulty: nextCard.difficulty,
    elapsed_days: nextCard.elapsed_days,
    scheduled_days: nextCard.scheduled_days,
    reps: nextCard.reps,
    lapses: nextCard.lapses,
    state: nextCard.state as 0 | 1 | 2 | 3,
    due: nextCard.due,
    last_review: now,
  };
}
