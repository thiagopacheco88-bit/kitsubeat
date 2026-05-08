'use client'

import { useEffect, useState } from 'react'
import posthog from 'posthog-js'

/**
 * GDPR consent banner — renders only on first visit (status 'pending').
 *
 * Hydration safety: status initializes as '' (empty string sentinel, not 'pending') so SSR
 * and the first client frame render nothing. The useEffect sets real status after hydration.
 * This prevents flash-of-banner on returning users who already consented.
 *
 * Phase 15 — UK PECR compliance: analytics opt-in required before PostHog captures.
 * Sentry runs unconditionally (legitimate interest; no cookie placed).
 */
export function ConsentBanner() {
  const [status, setStatus] = useState('')

  useEffect(() => {
    setStatus(posthog.get_explicit_consent_status())
  }, [])

  if (status !== 'pending') return null

  return (
    <div
      role="dialog"
      aria-labelledby="consent-title"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-lg"
    >
      <p id="consent-title" className="mb-3 text-sm text-[var(--color-text)]">
        We use analytics to improve KitsuBeat. No ads, no third parties.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => {
            posthog.opt_in_capturing()
            setStatus('granted')
          }}
          className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium [color:white] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        >
          Accept
        </button>
        <button
          onClick={() => {
            posthog.opt_out_capturing()
            setStatus('denied')
          }}
          className="rounded-[var(--radius-sm)] border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-muted)] hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-[var(--color-border)]"
        >
          Decline
        </button>
      </div>
    </div>
  )
}
