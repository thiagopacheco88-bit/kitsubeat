import { generatorParameters } from "ts-fsrs";

/**
 * FSRS intensity presets — controls how aggressively spaced repetition schedules reviews.
 *
 * - light:     Lower retention target (0.75), shorter max interval (180 days).
 *              For casual learners who don't mind some forgetting.
 * - normal:    Balanced retention (0.90), standard max interval (365 days).
 *              Default for most users.
 * - intensive: High retention (0.95), max interval capped at 365 days.
 *              For learners preparing for JLPT or who need active recall.
 *
 * These map to the intensity_preset column in user_vocab_mastery.
 */
export const INTENSITY_PRESETS = {
  light: generatorParameters({
    request_retention: 0.75,
    maximum_interval: 180,
  }),
  normal: generatorParameters({
    request_retention: 0.90,
    maximum_interval: 365,
  }),
  intensive: generatorParameters({
    request_retention: 0.95,
    maximum_interval: 365,
  }),
} as const;

export type IntensityPreset = keyof typeof INTENSITY_PRESETS;
