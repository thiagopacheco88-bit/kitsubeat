"use client";

import { useKanaProgress } from "@/stores/kanaProgress";

/**
 * Number of completed sessions before the sign-up nudge banner appears.
 * Locked at 3 per RESEARCH Open Question 4.
 */
export const KANA_SIGNUP_NUDGE_AFTER_SESSIONS = 3;

/**
 * Banner shown when `sessionsCompleted >= KANA_SIGNUP_NUDGE_AFTER_SESSIONS`.
 *
 * Returns `null` until the persisted store has hydrated to avoid a flash of
 * the banner on first paint for fresh visitors. No CTA is wired to /signup
 * yet — Phase 3 auth lands the destination; the banner alone is the nudge.
 */
export function SignupNudge() {
  const sessions = useKanaProgress((s) => s.sessionsCompleted);
  const hasHydrated = useKanaProgress((s) => s._hasHydrated);
  if (!hasHydrated) return null;
  if (sessions < KANA_SIGNUP_NUDGE_AFTER_SESSIONS) return null;
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
      <strong>Save your progress.</strong> Sign up to keep your kana mastery
      across devices.
    </div>
  );
}
