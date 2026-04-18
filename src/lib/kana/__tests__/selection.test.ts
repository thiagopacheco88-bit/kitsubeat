import { describe, it, expect } from "vitest";
import {
  weightFor,
  pickWeighted,
  buildKanaSession,
  buildDistractors,
} from "../selection";
import { KANA_CHART } from "../chart";
import type { MasteryMap } from "../types";

/**
 * Locks the gameplay rules for selection logic — KANA-05 weight table,
 * KANA-07 session-of-20 builder, and the distractor picker.
 */

describe("weightFor — KANA-05 stars->weight table", () => {
  it("weightFor(0) === 10 (heaviest, learning-mode bias)", () => {
    expect(weightFor(0)).toBe(10);
  });

  it("weightFor(1) === 9", () => {
    expect(weightFor(1)).toBe(9);
  });

  it("weightFor(5) === 5", () => {
    expect(weightFor(5)).toBe(5);
  });

  it("weightFor(9) === 1", () => {
    expect(weightFor(9)).toBe(1);
  });

  it("weightFor(10) === 1 (mastered floor; 1/5 of weightFor(5))", () => {
    expect(weightFor(10)).toBe(1);
    expect(weightFor(5) / weightFor(10)).toBe(5);
  });

  it("weightFor(-1) === 10 (treated as 0)", () => {
    expect(weightFor(-1)).toBe(10);
  });

  it("weightFor(11) === 1 (treated as 10)", () => {
    expect(weightFor(11)).toBe(1);
  });
});

describe("pickWeighted — sampling correctness", () => {
  it("single-element pool always returns that element", () => {
    const only = { weight: 1, id: "X" };
    for (let i = 0; i < 50; i++) {
      expect(pickWeighted([only])).toBe(only);
    }
  });

  it("determinism with low rng -> first item (rng=0.05 on weights [1,9])", () => {
    const a = { weight: 1, id: "A" };
    const b = { weight: 9, id: "B" };
    // total = 10; r = 0.05 * 10 = 0.5; 0.5 - 1 = -0.5 -> first item picked
    expect(pickWeighted([a, b], () => 0.05)).toBe(a);
  });

  it("determinism with high rng -> second item (rng=0.95 on weights [1,9])", () => {
    const a = { weight: 1, id: "A" };
    const b = { weight: 9, id: "B" };
    // total = 10; r = 0.95 * 10 = 9.5; 9.5 - 1 = 8.5; 8.5 - 9 = -0.5 -> second item picked
    expect(pickWeighted([a, b], () => 0.95)).toBe(b);
  });

  it("long-run fairness: pool [9,1] over 10000 draws -> ~10% B (Math.abs(countB - 1000) < 250)", () => {
    const a = { weight: 9, id: "A" };
    const b = { weight: 1, id: "B" };
    let countB = 0;
    for (let i = 0; i < 10000; i++) {
      if (pickWeighted([a, b]) === b) countB += 1;
    }
    expect(Math.abs(countB - 1000)).toBeLessThan(250);
  });
});

describe("buildKanaSession — KANA-07 20-question session", () => {
  const emptyMastery = { hiragana: {} as MasteryMap, katakana: {} as MasteryMap };

  it("default questionCount = 20 (returns exactly 20 EligibleChar items)", () => {
    const session = buildKanaSession({
      script: "hiragana",
      mastery: emptyMastery,
      unlockedRows: { hiragana: new Set(["a"]), katakana: new Set() },
      chart: KANA_CHART,
    });
    expect(session.length).toBe(20);
  });

  it("custom questionCount honored (e.g. 5)", () => {
    const session = buildKanaSession({
      script: "hiragana",
      mastery: emptyMastery,
      unlockedRows: { hiragana: new Set(["a"]), katakana: new Set() },
      chart: KANA_CHART,
      questionCount: 5,
    });
    expect(session.length).toBe(5);
  });

  it("hiragana + a-row only -> every entry has rowId 'a' and stars === 0", () => {
    const session = buildKanaSession({
      script: "hiragana",
      mastery: emptyMastery,
      unlockedRows: { hiragana: new Set(["a"]), katakana: new Set() },
      chart: KANA_CHART,
    });
    for (const e of session) {
      expect(e.char.rowId).toBe("a");
      expect(e.stars).toBe(0);
      expect(e.script).toBe("hiragana");
    }
  });

  it("katakana reads stars from mastery.katakana, not mastery.hiragana", () => {
    const aRowChars = KANA_CHART.filter((c) => c.rowId === "a");
    const hiraganaMastery: MasteryMap = {};
    for (const c of aRowChars) hiraganaMastery[c.hiragana] = 7;
    const katakanaMastery: MasteryMap = {};
    for (const c of aRowChars) katakanaMastery[c.katakana] = 3;

    const session = buildKanaSession({
      script: "katakana",
      mastery: { hiragana: hiraganaMastery, katakana: katakanaMastery },
      unlockedRows: { hiragana: new Set(), katakana: new Set(["a"]) },
      chart: KANA_CHART,
    });
    for (const e of session) {
      expect(e.char.rowId).toBe("a");
      expect(e.stars).toBe(3); // from katakana, not 7 from hiragana
      expect(e.script).toBe("katakana");
    }
  });

  it("mixed: a-row unlocked in both -> at least one entry from each script across 200 draws", () => {
    const session = buildKanaSession({
      script: "mixed",
      mastery: emptyMastery,
      unlockedRows: { hiragana: new Set(["a"]), katakana: new Set(["a"]) },
      chart: KANA_CHART,
      questionCount: 200,
    });
    const scripts = new Set(session.map((e) => e.script));
    expect(scripts.has("hiragana")).toBe(true);
    expect(scripts.has("katakana")).toBe(true);
  });

  it("empty unlocked -> returns empty array (no throw)", () => {
    const session = buildKanaSession({
      script: "hiragana",
      mastery: emptyMastery,
      unlockedRows: { hiragana: new Set(), katakana: new Set() },
      chart: KANA_CHART,
    });
    expect(session).toEqual([]);
  });

  it("EligibleChar weight reflects weightFor(stars)", () => {
    const aRowChars = KANA_CHART.filter((c) => c.rowId === "a");
    const m: MasteryMap = {};
    for (const c of aRowChars) m[c.hiragana] = 5;

    const session = buildKanaSession({
      script: "hiragana",
      mastery: { hiragana: m, katakana: {} },
      unlockedRows: { hiragana: new Set(["a"]), katakana: new Set() },
      chart: KANA_CHART,
      questionCount: 10,
    });
    for (const e of session) {
      expect(e.weight).toBe(weightFor(e.stars));
      expect(e.weight).toBe(5);
    }
  });

  it("duplicates within a session ARE allowed (with-replacement weighted draw)", () => {
    // Pool of 5 chars, 20 draws -> by pigeonhole at least one duplicate.
    const session = buildKanaSession({
      script: "hiragana",
      mastery: { hiragana: {}, katakana: {} },
      unlockedRows: { hiragana: new Set(["a"]), katakana: new Set() },
      chart: KANA_CHART,
    });
    const uniqueGlyphs = new Set(session.map((e) => e.char.hiragana));
    expect(uniqueGlyphs.size).toBeLessThanOrEqual(5); // 5 chars in a-row
    expect(session.length).toBe(20);
    expect(uniqueGlyphs.size).toBeGreaterThanOrEqual(1);
  });
});

describe("buildDistractors — uniqueness + correct exclusion", () => {
  it("default count = 3 with sufficient pool", () => {
    const distractors = buildDistractors({
      correctRomaji: "a",
      script: "hiragana",
      unlockedRows: new Set(["a", "ka"]), // 5 + 5 = 10 chars
      chart: KANA_CHART,
    });
    expect(distractors.length).toBe(3);
  });

  it("does NOT contain correctRomaji", () => {
    for (let i = 0; i < 50; i++) {
      const distractors = buildDistractors({
        correctRomaji: "ka",
        script: "hiragana",
        unlockedRows: new Set(["a", "ka"]),
        chart: KANA_CHART,
      });
      expect(distractors).not.toContain("ka");
    }
  });

  it("returns only UNIQUE romaji (homophones ji from za-row + da-row dedupe)", () => {
    // za-row contains じ -> "ji"; da-row contains ぢ -> "ji"
    // both rows unlocked, asking for distractors against an unrelated correct ("a")
    // should not produce two "ji"s.
    const distractors = buildDistractors({
      correctRomaji: "a",
      script: "hiragana",
      unlockedRows: new Set(["a", "ka", "sa", "ta", "na", "za", "da"]),
      chart: KANA_CHART,
      count: 50, // ask for many to exhaust pool
    });
    const unique = new Set(distractors);
    expect(unique.size).toBe(distractors.length);
  });

  it("when pool < count, returns all available distractors (length < count)", () => {
    // Just a-row (5 chars / 5 unique romaji). correctRomaji = "a" -> 4 distractors max
    const distractors = buildDistractors({
      correctRomaji: "a",
      script: "hiragana",
      unlockedRows: new Set(["a"]),
      chart: KANA_CHART,
      count: 10,
    });
    expect(distractors.length).toBeLessThanOrEqual(4);
    expect(distractors).not.toContain("a");
  });

  it("uses unlockedRows Set to filter chart (rows outside the set excluded)", () => {
    const distractors = buildDistractors({
      correctRomaji: "a",
      script: "hiragana",
      unlockedRows: new Set(["a"]),
      chart: KANA_CHART,
      count: 100,
    });
    // Only i, u, e, o should be possible
    const allowed = new Set(["i", "u", "e", "o"]);
    for (const d of distractors) {
      expect(allowed.has(d)).toBe(true);
    }
  });

  it("custom count honored", () => {
    const distractors = buildDistractors({
      correctRomaji: "a",
      script: "hiragana",
      unlockedRows: new Set(["a", "ka"]),
      chart: KANA_CHART,
      count: 5,
    });
    expect(distractors.length).toBe(5);
  });
});
