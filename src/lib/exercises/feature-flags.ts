/**
 * Exercise feature flags — single source of truth for free/premium gating.
 *
 * UI components NEVER check flags directly. They receive either data or
 * { gated: true } from server actions that call checkExerciseAccess().
 *
 * All Phase 8 exercise types are free.
 * Phase 10 adds three "song_quota"-gated types consumed by checkExerciseAccess:
 *   - listening_drill      → "listening" family      (10 distinct free songs)
 *   - grammar_conjugation  → "advanced_drill" family (3 distinct free songs, shared)
 *   - sentence_order       → "advanced_drill" family (3 distinct free songs, shared)
 *
 * The UI regression guard at tests/e2e/regression-premium-gate.spec.ts asserts
 * this module is never imported from `src/app/**` or `src/stores/**`. All gate
 * decisions must flow through `checkExerciseAccess` in access.ts.
 */

export type ExerciseGateStatus = "free" | "premium" | "song_quota";

export const EXERCISE_FEATURE_FLAGS: Record<string, ExerciseGateStatus> = {
  vocab_meaning:       "free",         // EXER-01 — given vocab, pick meaning
  meaning_vocab:       "free",         // EXER-02 — given meaning, pick vocab
  reading_match:       "free",         // EXER-03 — match reading to vocab
  fill_lyric:          "free",         // EXER-04 — fill in missing lyric word
  // Phase 10 — quota-gated advanced exercises (FREE-05 reshape):
  listening_drill:     "song_quota",   // EXER-06 — 10-song free quota per CONTEXT
  grammar_conjugation: "song_quota",   // EXER-05 — shared 3-song free quota
  sentence_order:      "song_quota",   // EXER-07 — shared 3-song free quota
};

/**
 * QUOTA_FAMILY — maps each song_quota-gated exercise to its quota family.
 *
 * Two independent quota families share the same shape but different limits.
 * Exhausting one family (e.g. 10 listening songs) does NOT consume from the
 * other (advanced_drill stays at its own counter), per CONTEXT.
 */
export const QUOTA_FAMILY: Record<string, "listening" | "advanced_drill"> = {
  listening_drill:     "listening",
  grammar_conjugation: "advanced_drill",
  sentence_order:      "advanced_drill",
};

/**
 * QUOTA_LIMITS — free-tier song caps per family.
 *
 * EXACTLY per CONTEXT (10 for listening, 3 for advanced_drill — NOT flipped).
 * Kept here (not inside access.ts) so unit tests can import the constants and
 * assert the precise values without reaching into the gate function.
 */
export const QUOTA_LIMITS = {
  listening: 10,
  advanced_drill: 3,
} as const;

export type QuotaFamily = keyof typeof QUOTA_LIMITS;
