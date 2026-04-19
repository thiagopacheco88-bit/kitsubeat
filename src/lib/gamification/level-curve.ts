/**
 * Phase 12-02 — Level curve.
 *
 * Pure functions for the XP-to-level mapping.
 * Formula: xpForLevel(n) = floor(100 * 1.2^(n-1))
 *
 * Cumulative model (inclusive):
 *   Level 1 requires 0 total XP
 *   Level 2 requires xpForLevel(1)           = 100 total XP
 *   Level 3 requires xpForLevel(1+2)          = 220 total XP
 *   Level n requires sum(xpForLevel(k), k=1..n-1) total XP
 */

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Returns the XP required to REACH level n from level n-1.
 * Equivalent to the "step cost" of the n-th level.
 */
export function xpForLevel(n: number): number {
  return Math.floor(100 * Math.pow(1.2, n - 1));
}

/**
 * Build a cumulative XP threshold array lazily up to the required level.
 * cumulativeXp[k] = total XP needed to reach level k+1 (0-indexed).
 *
 * cumulativeXp[0] = 0        (level 1 needs 0 XP)
 * cumulativeXp[1] = 100      (level 2 needs 100 XP)
 * cumulativeXp[2] = 220      (level 3 needs 220 XP)
 * ...
 */
function buildCumulativeThresholds(upToLevel: number): number[] {
  const thresholds: number[] = [0]; // level 1 at index 0
  let cumulative = 0;
  for (let n = 1; n < upToLevel; n++) {
    cumulative += xpForLevel(n);
    thresholds.push(cumulative);
  }
  return thresholds;
}

/**
 * Returns the highest level reachable with `total` cumulative XP.
 * Level 1 is the minimum (0 XP required).
 */
export function levelFromXp(total: number): number {
  if (total <= 0) return 1;

  // Walk up levels until the threshold exceeds total.
  // We search lazily: stop as soon as cumulative cost > total.
  let cumulative = 0;
  let level = 1;
  while (true) {
    const cost = xpForLevel(level); // cost to reach level+1
    if (cumulative + cost > total) {
      return level;
    }
    cumulative += cost;
    level += 1;
  }
}

/**
 * Returns progress details within the current level for the HUD progress bar.
 */
export function xpWithinCurrentLevel(total: number): {
  currentLevel: number;
  xpInLevel: number;
  xpToNext: number;
} {
  const currentLevel = levelFromXp(total);

  // Compute cumulative XP needed to reach the current level.
  let cumulativeToCurrentLevel = 0;
  for (let n = 1; n < currentLevel; n++) {
    cumulativeToCurrentLevel += xpForLevel(n);
  }

  const xpInLevel = total - cumulativeToCurrentLevel;
  const xpToNext = xpForLevel(currentLevel); // cost to reach next level

  return { currentLevel, xpInLevel, xpToNext };
}
