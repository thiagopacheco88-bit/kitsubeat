'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'

/**
 * Wires Clerk userId to PostHog distinct_id after consent is confirmed.
 *
 * GDPR guard: posthog.has_opted_in_capturing() check ensures no person profile
 * is created before the user accepts the consent banner (RESEARCH Pitfall 3).
 *
 * Phase 15 — called from RootLayout with server-resolved Clerk userId.
 */
export function PostHogIdentify({ userId }: { userId: string | null }) {
  useEffect(() => {
    if (!userId) return
    if (posthog.has_opted_in_capturing()) {
      posthog.identify(userId)
      // Phase 15 SC-1: signup event on first-time Clerk user detection
      // Uses localStorage ph_known_users to detect first-time users.
      // Non-fatal: localStorage may be blocked in private browsing.
      const KNOWN_KEY = 'ph_known_users'
      try {
        const known = JSON.parse(localStorage.getItem(KNOWN_KEY) ?? '[]') as string[]
        if (!known.includes(userId)) {
          posthog.capture('signup', { provider: 'clerk', is_first_time: true })
          localStorage.setItem(KNOWN_KEY, JSON.stringify([...known, userId]))
        }
      } catch {
        // localStorage may be blocked in private browsing — non-fatal
      }
    }
  }, [userId])

  return null
}
