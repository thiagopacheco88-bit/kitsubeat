/**
 * Counter mastery rules.
 *
 * Pure functions — no React, no Zustand, no DOM.
 * Mirrors src/lib/kana/mastery.ts.
 *
 * Mastery is tracked per counter ID (not per number-form).
 * Stars range 0–10; +1 correct, -2 wrong, clamped.
 *
 * Unlock logic: counter N unlocks counter N+1 once counter N's stars
 * reach >= COUNTER_UNLOCK_MIN_STARS.
 */

import type { Counter, CounterMasteryMap } from "./types";
import { COUNTER_UNLOCK_MIN_STARS } from "./chart";

/** +1 correct / -2 wrong, clamped [0, 10]. */
export function applyStarDelta(current: number, correct: boolean): number {
  const next = correct ? current + 1 : current - 2;
  return Math.max(0, Math.min(10, next));
}

/**
 * Derive the set of unlocked counter IDs from current mastery.
 *
 * - The first counter (order 0) is ALWAYS unlocked.
 * - Each subsequent counter unlocks when its predecessor reaches
 *   >= COUNTER_UNLOCK_MIN_STARS.
 * - Walk breaks at the first non-mastered counter — non-contiguous
 *   mastery does NOT skip ahead.
 *
 * `counters` must be sorted by `order` (COUNTERS_ORDERED already is).
 */
export function computeUnlockedCounters(
  counters: Counter[],
  mastery: CounterMasteryMap,
): Set<string> {
  const unlocked = new Set<string>();
  if (counters.length === 0) return unlocked;
  unlocked.add(counters[0].id);
  for (let i = 0; i < counters.length - 1; i++) {
    const stars = mastery[counters[i].id] ?? 0;
    if (stars >= COUNTER_UNLOCK_MIN_STARS) {
      unlocked.add(counters[i + 1].id);
    } else {
      break;
    }
  }
  return unlocked;
}
