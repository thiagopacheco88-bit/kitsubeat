/**
 * Phase 12-02 — Analytics stub for gamification events.
 *
 * Dev mode: logs to console.debug.
 * Production: no-op.
 *
 * Phase 15 swaps the body for PostHog event emission.
 * Callable from server actions (Plan 04+).
 */

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
// Stub implementation
// ---------------------------------------------------------------------------

/**
 * Emit a gamification analytics event.
 *
 * Dev: console.debug for observability during development.
 * Prod: no-op — Phase 15 wires this to PostHog.
 */
export function trackGamification(e: GamificationEvent): void {
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.debug("[analytics:gamification]", e);
  }
}
