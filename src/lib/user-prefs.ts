/** Placeholder user ID — replace with Clerk auth() when Phase 10 ships. */
export const PLACEHOLDER_USER_ID = "test-user-e2e";

export const DEFAULT_NEW_CARD_CAP = 10;

export const PREMIUM_NEW_CARD_CAP_CEILING = 30;

/**
 * Daily new-card introduction cap for the cross-song /review queue.
 * Distinct namespace from `new_card_cap` (per-session cap set per user in Phase 08.4).
 *
 * Claude-discretion default: 20.
 * Rationale: researcher recommendation (RESEARCH.md §Open Questions #2);
 * matches Phase 08.4 premium per-session ceiling (30) / 1.5 ≈ 20.
 * Tune later via this one constant — no schema change needed.
 */
export const REVIEW_NEW_DAILY_CAP = 20;

export interface UserPrefs {
  skipLearning: boolean;
  newCardCap: number;
}
