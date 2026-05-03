import { describe, it, expect } from "vitest";
import {
  computeCheckpointState,
  BASIC_HIRAGANA_COUNT,
  BASIC_KATAKANA_COUNT,
  MASTERY_STAR_THRESHOLD,
} from "./checkpoint-state";
import { KANA_CHART } from "./chart";

// Reuse the same source as the helper to construct fixtures — guarantees
// fixture/helper alignment.
const BASIC_HIRAGANA = KANA_CHART
  .filter((c) => c.rowKind === "base")
  .map((c) => c.hiragana);

function buildAllAtStars(stars: number): Record<string, number> {
  const map: Record<string, number> = {};
  for (const ch of BASIC_HIRAGANA) map[ch] = stars;
  return map;
}

function buildFirstNAtStars(n: number, stars: number): Record<string, number> {
  const map: Record<string, number> = {};
  for (let i = 0; i < n; i++) map[BASIC_HIRAGANA[i]] = stars;
  return map;
}

describe("computeCheckpointState", () => {
  it("BASIC_HIRAGANA_COUNT and BASIC_KATAKANA_COUNT are both 46", () => {
    expect(BASIC_HIRAGANA_COUNT).toBe(46);
    expect(BASIC_KATAKANA_COUNT).toBe(46);
  });

  it("empty map -> locked, 0 mastered, total 46 (hiragana)", () => {
    const r = computeCheckpointState({}, "hiragana");
    expect(r).toEqual({ state: "locked", progressPercent: 0, masteredCount: 0, totalCount: 46 });
  });

  it("empty map -> locked, 0 mastered, total 46 (katakana mirror)", () => {
    const r = computeCheckpointState({}, "katakana");
    expect(r).toEqual({ state: "locked", progressPercent: 0, masteredCount: 0, totalCount: 46 });
  });

  it("one char below threshold -> in-progress, 0 mastered", () => {
    const r = computeCheckpointState({ [BASIC_HIRAGANA[0]]: 5 }, "hiragana");
    expect(r.state).toBe("in-progress");
    expect(r.masteredCount).toBe(0);
    expect(r.progressPercent).toBe(0);
  });

  it("one char at threshold -> in-progress, 1 mastered, 2%", () => {
    const r = computeCheckpointState({ [BASIC_HIRAGANA[0]]: 7 }, "hiragana");
    expect(r.state).toBe("in-progress");
    expect(r.masteredCount).toBe(1);
    expect(r.progressPercent).toBe(2); // round(1/46 * 100) = 2
  });

  it("all 46 chars at threshold -> mastered, 100%", () => {
    const r = computeCheckpointState(buildAllAtStars(7), "hiragana");
    expect(r).toEqual({ state: "mastered", progressPercent: 100, masteredCount: 46, totalCount: 46 });
  });

  it("boundary — 41 at threshold is in-progress (Math.ceil rounds 41.4 up to 42)", () => {
    const r = computeCheckpointState(buildFirstNAtStars(41, 7), "hiragana");
    expect(r.state).toBe("in-progress");
    expect(r.masteredCount).toBe(41);
  });

  it("boundary — 42 at threshold is mastered", () => {
    const r = computeCheckpointState(buildFirstNAtStars(42, 7), "hiragana");
    expect(r.state).toBe("mastered");
    expect(r.masteredCount).toBe(42);
  });

  it("cross-script keys are ignored — katakana glyph in hiragana map does not count", () => {
    // ヤ is katakana; should not be counted under script="hiragana".
    const r = computeCheckpointState({ [BASIC_HIRAGANA[0]]: 7, ヤ: 7 }, "hiragana");
    expect(r.state).toBe("in-progress");
    expect(r.masteredCount).toBe(1); // only the hiragana entry counts
  });

  it("clamped 10-star chars still meet the threshold (>= 7)", () => {
    const r = computeCheckpointState({ [BASIC_HIRAGANA[0]]: 10 }, "hiragana");
    expect(r.masteredCount).toBe(1);
  });
});
