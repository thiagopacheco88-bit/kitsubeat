/**
 * Exercise feature flags — single source of truth for free/premium gating.
 *
 * UI components NEVER check flags directly. They receive either data or
 * { gated: true } from server actions that call checkExerciseAccess().
 *
 * All Phase 8 exercise types are free. Phase 10 will add premium types.
 */

export type ExerciseGateStatus = "free" | "premium";

export const EXERCISE_FEATURE_FLAGS: Record<string, ExerciseGateStatus> = {
  vocab_meaning:  "free",   // EXER-01 — given vocab, pick meaning
  meaning_vocab:  "free",   // EXER-02 — given meaning, pick vocab
  reading_match:  "free",   // EXER-03 — match reading to vocab
  fill_lyric:     "free",   // EXER-04 — fill in missing lyric word
  // Phase 10 will add: grammar_conjugation, listening_drill, sentence_order
};
