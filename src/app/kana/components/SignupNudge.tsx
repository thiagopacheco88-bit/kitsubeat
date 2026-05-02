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
 *
 * Phase 14 Plan 14-08 migration notes: the amber call-out uses the JLPT-N3
 * alpha tokens (--color-jlpt-n3-bg + --color-jlpt-n3-ring + --color-jlpt-n3),
 * reusing the same semantic-color pattern Plan 14-07 applied to the daily-cap
 * toast in ReviewSession. Same hue (#f59e0b ≈ amber-500) at 12%/25% alpha;
 * one token surface, one semantic class for "warning / call-to-action".
 */
export function SignupNudge() {
  const sessions = useKanaProgress((s) => s.sessionsCompleted);
  const hasHydrated = useKanaProgress((s) => s._hasHydrated);
  if (!hasHydrated) return null;
  if (sessions < KANA_SIGNUP_NUDGE_AFTER_SESSIONS) return null;
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-jlpt-n3-ring)] bg-[var(--color-jlpt-n3-bg)] p-4 text-sm text-[var(--color-jlpt-n3)]">
      <strong>Save your progress.</strong> Sign up to keep your kana mastery
      across devices.
    </div>
  );
}
