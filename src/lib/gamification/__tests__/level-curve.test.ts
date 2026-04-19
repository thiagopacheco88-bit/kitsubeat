/**
 * Phase 12-02 — Level curve unit coverage.
 *
 * Pins exact cumulative XP thresholds and spot-checks higher levels.
 * Uses the inclusive cumulative model: level n reached when totalXP >= sum(xpForLevel(k), k=1..n).
 */

import { describe, it, expect } from "vitest";
import { xpForLevel, levelFromXp, xpWithinCurrentLevel } from "@/lib/gamification/level-curve";

describe("xpForLevel", () => {
  it("level 1 → 100", () => {
    expect(xpForLevel(1)).toBe(100);
  });

  it("level 2 → 120", () => {
    // floor(100 * 1.2^1) = floor(120) = 120
    expect(xpForLevel(2)).toBe(120);
  });

  it("level 3 → 144", () => {
    // floor(100 * 1.2^2) = floor(144) = 144
    expect(xpForLevel(3)).toBe(144);
  });

  it("level 4 → 172", () => {
    // floor(100 * 1.2^3) = floor(172.8) = 172
    expect(xpForLevel(4)).toBe(172);
  });

  it("level 5 → 207", () => {
    // floor(100 * 1.2^4) = floor(207.36) = 207
    expect(xpForLevel(5)).toBe(207);
  });

  it("level 10 → 516", () => {
    // floor(100 * 1.2^9) ≈ floor(516.09...) = 516
    expect(xpForLevel(10)).toBe(516);
  });
});

describe("levelFromXp — cumulative thresholds", () => {
  // Level 1: 0 total XP (always start at level 1)
  it("levelFromXp(0) === 1", () => {
    expect(levelFromXp(0)).toBe(1);
  });

  it("levelFromXp(99) === 1", () => {
    expect(levelFromXp(99)).toBe(1);
  });

  // Level 2: cumsum = xpForLevel(1) = 100
  it("levelFromXp(100) === 2", () => {
    expect(levelFromXp(100)).toBe(2);
  });

  it("levelFromXp(219) === 2", () => {
    // Level 3 requires 100+120=220, so 219 is still level 2
    expect(levelFromXp(219)).toBe(2);
  });

  // Level 3: cumsum = 100 + 120 = 220
  it("levelFromXp(220) === 3", () => {
    expect(levelFromXp(220)).toBe(3);
  });

  // Level 4: cumsum = 100 + 120 + 144 = 364
  it("levelFromXp(363) === 3", () => {
    expect(levelFromXp(363)).toBe(3);
  });

  it("levelFromXp(364) === 4", () => {
    expect(levelFromXp(364)).toBe(4);
  });

  // Level 5: cumsum = 100 + 120 + 144 + 172 = 536
  it("levelFromXp(535) === 4", () => {
    expect(levelFromXp(535)).toBe(4);
  });

  it("levelFromXp(536) === 5", () => {
    expect(levelFromXp(536)).toBe(5);
  });

  it("levelFromXp(1) === 1", () => {
    expect(levelFromXp(1)).toBe(1);
  });
});

describe("xpWithinCurrentLevel", () => {
  it("150 XP → level 2, 50 in level, 120 to next", () => {
    // Level 2 starts at 100 total XP; 150 - 100 = 50 in level; xpForLevel(2)=120 to next
    const result = xpWithinCurrentLevel(150);
    expect(result.currentLevel).toBe(2);
    expect(result.xpInLevel).toBe(50);
    expect(result.xpToNext).toBe(120);
  });

  it("0 XP → level 1, 0 in level, 100 to next", () => {
    const result = xpWithinCurrentLevel(0);
    expect(result.currentLevel).toBe(1);
    expect(result.xpInLevel).toBe(0);
    expect(result.xpToNext).toBe(100);
  });

  it("100 XP → level 2, 0 in level, 120 to next", () => {
    const result = xpWithinCurrentLevel(100);
    expect(result.currentLevel).toBe(2);
    expect(result.xpInLevel).toBe(0);
    expect(result.xpToNext).toBe(120);
  });

  it("220 XP → level 3, 0 in level, 144 to next", () => {
    const result = xpWithinCurrentLevel(220);
    expect(result.currentLevel).toBe(3);
    expect(result.xpInLevel).toBe(0);
    expect(result.xpToNext).toBe(144);
  });

  it("364 XP → level 4, 0 in level, 172 to next", () => {
    const result = xpWithinCurrentLevel(364);
    expect(result.currentLevel).toBe(4);
    expect(result.xpInLevel).toBe(0);
    expect(result.xpToNext).toBe(172);
  });
});
