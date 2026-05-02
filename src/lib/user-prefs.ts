/** Placeholder user ID — used as fallback when no one is signed in. */
export const PLACEHOLDER_USER_ID = "test-user-e2e";

/**
 * Resolve the current request's user id.
 *
 * Returns Clerk's `auth().userId` when signed in; falls back to
 * `PLACEHOLDER_USER_ID` for anonymous traffic. This is the single
 * boundary every server route / server component should call so reads and
 * writes converge on the same row.
 *
 * Server-only — never import from client components. Catches Clerk errors
 * (missing env, transient API outage) and degrades to placeholder rather
 * than 500-ing the page.
 */
export async function getCurrentUserId(): Promise<string> {
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const session = await auth();
    return session.userId ?? PLACEHOLDER_USER_ID;
  } catch {
    return PLACEHOLDER_USER_ID;
  }
}

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
  /** Phase 12: Play a chime on level-up. Default ON. */
  soundEnabled: boolean;
  /** Phase 12: Vibrate on mobile on level-up. Default ON (no effect on iOS — Web Vibration API unsupported). */
  hapticsEnabled: boolean;
}
