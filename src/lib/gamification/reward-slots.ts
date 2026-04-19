/**
 * Phase 12-02 — Reward-slot filter.
 *
 * Pure functions for filtering and previewing reward slots based on user level.
 * Types from Plan 03 (src/lib/types/reward-slots.ts — already defined).
 *
 * Empty-state guarantee: no 'coming soon' placeholders.
 * Slots with active=false are NEVER rendered.
 */

import type { RewardSlotDefinition } from "@/lib/types/reward-slots";

/**
 * Returns all reward slots that are:
 *   - active === true
 *   - level_threshold <= userLevel
 *
 * Sorted by level_threshold ASC.
 */
export function getVisibleSlotsForUser(
  defs: RewardSlotDefinition[],
  userLevel: number
): RewardSlotDefinition[] {
  return defs
    .filter((d) => d.active && d.level_threshold <= userLevel)
    .sort((a, b) => a.level_threshold - b.level_threshold);
}

/**
 * Returns the next locked reward slot to preview — the lowest-threshold
 * active slot that the user has NOT yet unlocked.
 *
 * Returns null if no locked active slots exist (empty catalog or all unlocked).
 * Never returns inactive slots. Never returns a 'coming soon' placeholder.
 */
export function getNextRewardPreview(
  defs: RewardSlotDefinition[],
  userLevel: number
): RewardSlotDefinition | null {
  const locked = defs
    .filter((d) => d.active && d.level_threshold > userLevel)
    .sort((a, b) => {
      // Primary: level_threshold ASC; tiebreak: id ASC (deterministic)
      if (a.level_threshold !== b.level_threshold) {
        return a.level_threshold - b.level_threshold;
      }
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });

  return locked[0] ?? null;
}
