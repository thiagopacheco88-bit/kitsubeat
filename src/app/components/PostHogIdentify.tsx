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
    }
  }, [userId])

  return null
}
