/**
 * Phase 12-02 — Analytics wrapper for gamification events.
 *
 * Phase 15 replaced the stub body with posthog-node event emission.
 * Uses getPostHogServer() (server-side singleton) — all callers are in
 * server action context (session-integration.ts, gamification.ts).
 *
 * Non-fatal: analytics must never propagate exceptions into the gamification
 * write path. All capture calls are wrapped in try/catch.
 *
 * Callable from server actions (Plan 04+).
 */

import { getPostHogServer } from "./posthog-server";

// ---------------------------------------------------------------------------
// Event union type
// ---------------------------------------------------------------------------

export type GamificationEvent =
  | { event: "xp_gained"; xp: number; source: "answer" | "session" | "star" | "streak_milestone" }
  | { event: "level_up"; new_level: number }
  | { event: "streak_updated"; streak_current: number; grace_applied: boolean }
  | { event: "path_node_started"; slug: string; difficulty_tier: string }
  | { event: "starter_pick_selected"; slug: string }
  | { event: "cosmetic_unlocked"; slot_id: string; level: number };

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Emit a gamification analytics event via PostHog (server-side).
 *
 * @param e - The gamification event to track (shape matches GamificationEvent union)
 * @param userId - Optional Clerk userId for distinct_id; defaults to 'anonymous'
 *
 * Non-fatal: any capture error is swallowed so analytics never throws into callers.
 */
/**
 * Stub export for the subscription_started SC-1 funnel event.
 *
 * Billing not yet integrated — this function is a named call site placeholder.
 * Call this from the payment webhook handler when Phase 19 (Stripe/billing) lands.
 *
 * Usage: trackSubscriptionStarted({ userId: clerkUserId })
 *
 * Phase 19 integration note: replace the console.debug with a posthog-node capture:
 *   getPostHogServer().capture({ distinctId: userId, event: 'subscription_started', properties: {} })
 */
export function trackSubscriptionStarted({ userId }: { userId: string }): void {
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.debug("[analytics:subscription_started] stub — wire to billing webhook in Phase 19", { userId });
  }
  // Intentionally no-op: billing route does not exist in Phase 15.
  // Removing this stub in Phase 19 will cause a TypeScript error at all call sites,
  // forcing explicit wiring before the release.
}

export function trackGamification(e: GamificationEvent, userId?: string): void {
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.debug("[analytics:gamification]", e);
  }
  try {
    const ph = getPostHogServer();
    ph.capture({
      distinctId: userId ?? "anonymous",
      event: e.event,
      properties: e,
    });
  } catch {
    // Non-fatal: analytics must never throw into the gamification path
  }
}
