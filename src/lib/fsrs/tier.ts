/**
 * FSRS State → Display Tier Mapper
 *
 * Maps the FSRS state column (0/1/2/3) to a display tier (1/2/3) that
 * controls how much furigana/romaji assistance to show the user.
 *
 * LOCKED in 08.2-CONTEXT.md:
 * - Tier is driven purely by FSRS state transitions — no stability thresholds.
 * - Relearning (state=3) collapses to TIER_LEARNING (2) because the learner
 *   has lapsed and is effectively back in the learning stage.
 * - Pure-kana words always render the kana itself regardless of tier;
 *   that is a renderer concern, not a tier concern.
 *
 * Tier → Display:
 *   1 (New)      → kanji + furigana + romaji  (full assistance)
 *   2 (Learning) → kanji + furigana           (partial assistance)
 *   3 (Review)   → kanji only                 (no assistance)
 */

/** Display tier: 1 = full help, 2 = partial help, 3 = bare kanji */
export type Tier = 1 | 2 | 3;

/** New card — no prior exposure, full furigana+romaji shown */
export const TIER_NEW: Tier = 1;

/** Learning/Relearning — some exposure, furigana shown, romaji hidden */
export const TIER_LEARNING: Tier = 2;

/** Review — card mastered, kanji only, no assistance */
export const TIER_REVIEW: Tier = 3;

/**
 * tierFor — map an FSRS state column value to a display tier.
 *
 * FSRS state encoding (matches ts-fsrs State enum):
 *   0 = New       → TIER_NEW (1)
 *   1 = Learning  → TIER_LEARNING (2)
 *   2 = Review    → TIER_REVIEW (3)
 *   3 = Relearning → TIER_LEARNING (2) — collapsed per CONTEXT decision
 *
 * Defensive: any unknown state value returns TIER_NEW (1).
 *
 * @param state  The `state` column value from user_vocab_mastery (0|1|2|3)
 */
export function tierFor(state: number): Tier {
  switch (state) {
    case 0: return TIER_NEW;      // New
    case 1: return TIER_LEARNING; // Learning
    case 2: return TIER_REVIEW;   // Review
    case 3: return TIER_LEARNING; // Relearning → treated as learning for tier
    default: return TIER_NEW;     // Defensive fallback
  }
}
