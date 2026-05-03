/**
 * Server-side user-prefs entrypoint.
 *
 * Holds getCurrentUserId (which pulls in @clerk/nextjs/server, server-only)
 * and re-exports the client-safe pieces from user-prefs-shared so existing
 * server callers don't need to change imports.
 *
 * Client components must import PLACEHOLDER_USER_ID etc. from
 * "@/lib/user-prefs-shared" directly — importing them from this module
 * drags Clerk into the client bundle and breaks the build.
 */

export {
  PLACEHOLDER_USER_ID,
  DEFAULT_NEW_CARD_CAP,
  PREMIUM_NEW_CARD_CAP_CEILING,
  REVIEW_NEW_DAILY_CAP,
  type UserPrefs,
} from "./user-prefs-shared";

import { PLACEHOLDER_USER_ID } from "./user-prefs-shared";

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
