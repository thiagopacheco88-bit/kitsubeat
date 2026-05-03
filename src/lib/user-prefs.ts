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
  // E2E auth bypass — DOUBLE-GATED to prevent accidental production exposure.
  // Both gates must be true:
  //   1. NODE_ENV !== 'production' (prevents accidental prod activation)
  //   2. KB_E2E_AUTH_BYPASS_ENABLED === 'true' (explicit per-CI-run opt-in)
  //   3. KB_E2E_AUTH_BYPASS is set to a non-empty user id
  //
  // Every bypassed call emits console.warn so a misconfigured prod build
  // surfaces noise immediately. The env vars are NOT documented in
  // .env.example (intentional — must be explicit per-CI-run).
  //
  // Phase 14.2 Plan 14.2-01b — required because Clerk free tier has no
  // test-mode session JWT mechanism. If KitsuBeat upgrades to Clerk Pro,
  // migrate to @clerk/testing + signInToken and remove this branch.
  const bypassId = process.env.KB_E2E_AUTH_BYPASS;
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.KB_E2E_AUTH_BYPASS_ENABLED === "true" &&
    bypassId &&
    bypassId.length > 0
  ) {
    // eslint-disable-next-line no-console
    console.warn(
      "[e2e] auth bypass active — DO NOT enable in production",
    );
    return bypassId;
  }

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
