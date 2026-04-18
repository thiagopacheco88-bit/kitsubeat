import { describe, it, expect } from "vitest";
import {
  applyStarDelta,
  isRowMastered,
  computeUnlockedRows,
} from "../mastery";
import { HIRAGANA_ROWS, KATAKANA_ROWS } from "../chart";
import type { KanaRow, MasteryMap } from "../types";

/**
 * Locks the gameplay rules for star deltas + row-unlock predicate.
 *
 * KANA-03: applyStarDelta clamping.
 * KANA-06: 80% row-mastery threshold + strictly sequential row unlocks.
 */

describe("applyStarDelta — KANA-03 clamping", () => {
  it("0 + correct -> 1", () => {
    expect(applyStarDelta(0, true)).toBe(1);
  });

  it("0 + wrong -> 0 (clamped, NOT -2)", () => {
    expect(applyStarDelta(0, false)).toBe(0);
  });

  it("1 + wrong -> 0 (clamped, NOT -1)", () => {
    expect(applyStarDelta(1, false)).toBe(0);
  });

  it("5 + correct -> 6", () => {
    expect(applyStarDelta(5, true)).toBe(6);
  });

  it("5 + wrong -> 3 (5 - 2)", () => {
    expect(applyStarDelta(5, false)).toBe(3);
  });

  it("9 + correct -> 10", () => {
    expect(applyStarDelta(9, true)).toBe(10);
  });

  it("10 + correct -> 10 (clamped to ceiling)", () => {
    expect(applyStarDelta(10, true)).toBe(10);
  });

  it("10 + wrong -> 8", () => {
    expect(applyStarDelta(10, false)).toBe(8);
  });
});

describe("isRowMastered — KANA-06 80% threshold", () => {
  const aRow = HIRAGANA_ROWS.find((r) => r.id === "a")!;
  const yaRow = HIRAGANA_ROWS.find((r) => r.id === "ya")!;
  const aRowKata = KATAKANA_ROWS.find((r) => r.id === "a")!;

  it("empty-row guard returns true (defensive)", () => {
    const empty: KanaRow = { id: "x", kind: "base", label: "x-row", order: 99, chars: [] };
    expect(isRowMastered(empty, {}, "hiragana")).toBe(true);
  });

  it("a-row, all 0 stars -> false", () => {
    expect(isRowMastered(aRow, {}, "hiragana")).toBe(false);
  });

  it("a-row, 4/5 chars at >= 5 stars (80%) -> true", () => {
    const m: MasteryMap = {
      [aRow.chars[0].hiragana]: 5,
      [aRow.chars[1].hiragana]: 5,
      [aRow.chars[2].hiragana]: 5,
      [aRow.chars[3].hiragana]: 5,
    };
    expect(isRowMastered(aRow, m, "hiragana")).toBe(true);
  });

  it("a-row, 3/5 chars at >= 5 stars (60%) -> false", () => {
    const m: MasteryMap = {
      [aRow.chars[0].hiragana]: 5,
      [aRow.chars[1].hiragana]: 5,
      [aRow.chars[2].hiragana]: 5,
    };
    expect(isRowMastered(aRow, m, "hiragana")).toBe(false);
  });

  it("ya-row (3 chars), all 3 at 5 stars -> true (Math.ceil(3 * 0.8) === 3)", () => {
    const m: MasteryMap = {
      [yaRow.chars[0].hiragana]: 5,
      [yaRow.chars[1].hiragana]: 5,
      [yaRow.chars[2].hiragana]: 5,
    };
    expect(isRowMastered(yaRow, m, "hiragana")).toBe(true);
  });

  it("ya-row (3 chars), 2 at 5 stars -> false", () => {
    const m: MasteryMap = {
      [yaRow.chars[0].hiragana]: 5,
      [yaRow.chars[1].hiragana]: 5,
    };
    expect(isRowMastered(yaRow, m, "hiragana")).toBe(false);
  });

  it("script: katakana reads scriptMastery[c.katakana], NOT c.hiragana", () => {
    const m: MasteryMap = {
      [aRowKata.chars[0].katakana]: 5,
      [aRowKata.chars[1].katakana]: 5,
      [aRowKata.chars[2].katakana]: 5,
      [aRowKata.chars[3].katakana]: 5,
    };
    expect(isRowMastered(aRowKata, m, "katakana")).toBe(true);

    // Same hiragana keys with same values must NOT count for katakana lookup
    const wrongKey: MasteryMap = {
      [aRowKata.chars[0].hiragana]: 5,
      [aRowKata.chars[1].hiragana]: 5,
      [aRowKata.chars[2].hiragana]: 5,
      [aRowKata.chars[3].hiragana]: 5,
    };
    expect(isRowMastered(aRowKata, wrongKey, "katakana")).toBe(false);
  });

  it("counts only chars at >= 5 stars (4 stars do NOT count)", () => {
    const m: MasteryMap = {
      [aRow.chars[0].hiragana]: 4,
      [aRow.chars[1].hiragana]: 4,
      [aRow.chars[2].hiragana]: 4,
      [aRow.chars[3].hiragana]: 4,
    };
    expect(isRowMastered(aRow, m, "hiragana")).toBe(false);
  });
});

describe("computeUnlockedRows — KANA-06 sequential unlock", () => {
  it("empty-rows array -> empty Set", () => {
    const result = computeUnlockedRows([], {}, "hiragana");
    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(0);
  });

  it("single row, all 0 stars -> Set with that one row id (first row always unlocked)", () => {
    const onlyA = HIRAGANA_ROWS.slice(0, 1);
    const result = computeUnlockedRows(onlyA, {}, "hiragana");
    expect(result.size).toBe(1);
    expect(result.has("a")).toBe(true);
  });

  it("27 rows (HIRAGANA_ROWS), no mastery -> Set of size 1 ({\"a\"})", () => {
    const result = computeUnlockedRows(HIRAGANA_ROWS, {}, "hiragana");
    expect(result.size).toBe(1);
    expect(result.has("a")).toBe(true);
  });

  it("after fully mastering a-row, ka-row becomes unlocked -> { a, ka }", () => {
    const aRow = HIRAGANA_ROWS[0];
    const m: MasteryMap = {};
    for (const c of aRow.chars) m[c.hiragana] = 5;
    const result = computeUnlockedRows(HIRAGANA_ROWS, m, "hiragana");
    expect(result.size).toBe(2);
    expect(result.has("a")).toBe(true);
    expect(result.has("ka")).toBe(true);
  });

  it("strict sequential: a + ka mastered, sa not -> { a, ka, sa } and ta NOT unlocked", () => {
    const m: MasteryMap = {};
    const aRow = HIRAGANA_ROWS.find((r) => r.id === "a")!;
    const kaRow = HIRAGANA_ROWS.find((r) => r.id === "ka")!;
    for (const c of aRow.chars) m[c.hiragana] = 5;
    for (const c of kaRow.chars) m[c.hiragana] = 5;
    const result = computeUnlockedRows(HIRAGANA_ROWS, m, "hiragana");
    expect(result.has("a")).toBe(true);
    expect(result.has("ka")).toBe(true);
    expect(result.has("sa")).toBe(true);
    expect(result.has("ta")).toBe(false);
  });

  it("MUST break at first non-mastered row — non-contiguous mastery does NOT skip ahead", () => {
    // Master a-row AND sa-row, but NOT ka-row -> only { a, ka } should be unlocked
    // (sa is not unlocked because ka is not mastered; ta even further blocked)
    const m: MasteryMap = {};
    const aRow = HIRAGANA_ROWS.find((r) => r.id === "a")!;
    const saRow = HIRAGANA_ROWS.find((r) => r.id === "sa")!;
    for (const c of aRow.chars) m[c.hiragana] = 5;
    for (const c of saRow.chars) m[c.hiragana] = 5;
    const result = computeUnlockedRows(HIRAGANA_ROWS, m, "hiragana");
    expect(result.has("a")).toBe(true);
    expect(result.has("ka")).toBe(true); // unlocked because a was mastered
    expect(result.has("sa")).toBe(false); // NOT unlocked — ka wasn't mastered
    expect(result.has("ta")).toBe(false);
    expect(result.size).toBe(2);
  });

  it("idempotent — calling with same input twice returns equal sets", () => {
    const m: MasteryMap = {};
    const aRow = HIRAGANA_ROWS[0];
    for (const c of aRow.chars) m[c.hiragana] = 5;
    const r1 = computeUnlockedRows(HIRAGANA_ROWS, m, "hiragana");
    const r2 = computeUnlockedRows(HIRAGANA_ROWS, m, "hiragana");
    expect([...r1].sort()).toEqual([...r2].sort());
  });

  it("script: katakana — uses katakana keys for mastery lookup", () => {
    const m: MasteryMap = {};
    const aRowKata = KATAKANA_ROWS.find((r) => r.id === "a")!;
    for (const c of aRowKata.chars) m[c.katakana] = 5;
    const result = computeUnlockedRows(KATAKANA_ROWS, m, "katakana");
    expect(result.has("a")).toBe(true);
    expect(result.has("ka")).toBe(true);
  });
});
