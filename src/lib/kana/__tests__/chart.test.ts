import { describe, it, expect } from "vitest";
import {
  KANA_CHART,
  HIRAGANA_ROWS,
  KATAKANA_ROWS,
  ROW_UNLOCK_MASTERY_PCT,
  ROW_UNLOCK_MIN_STARS,
} from "../chart";

/**
 * Locks the structural invariants of the kana chart so future edits
 * cannot silently corrupt downstream consumers (selection, mastery,
 * grid, session UI). A failing test here is loud-by-design.
 */

const CANONICAL_ROW_IDS = [
  "a", "ka", "sa", "ta", "na", "ha", "ma", "ya", "ra", "wa", "n",
  "ga", "za", "da", "ba",
  "pa",
  "kya", "sha", "cha", "nya", "hya", "mya", "rya", "gya", "ja", "bya", "pya",
] as const;

// 46 base + 20 dakuten + 5 handakuten + 33 yoon = 104.
// (Plan stated 105 but the row breakdown sums to 104; double-counted the n-row.
//  Locked to the actual row sum here so future edits trip a clear failure.)
const EXPECTED_KANA_COUNT = 104;
const EXPECTED_ROW_COUNT = 27;

describe("KANA_CHART structural invariants", () => {
  it(`KANA_CHART.length === ${EXPECTED_KANA_COUNT} (pinned char count)`, () => {
    expect(KANA_CHART.length).toBe(EXPECTED_KANA_COUNT);
  });

  it("every KanaChar has non-empty hiragana, katakana, romaji, rowId, rowKind, finite rowOrder", () => {
    for (const c of KANA_CHART) {
      expect(c.hiragana.length).toBeGreaterThan(0);
      expect(c.katakana.length).toBeGreaterThan(0);
      expect(c.romaji.length).toBeGreaterThan(0);
      expect(c.rowId.length).toBeGreaterThan(0);
      expect(c.rowKind).toMatch(/^(base|dakuten|handakuten|yoon)$/);
      expect(Number.isFinite(c.rowOrder)).toBe(true);
      expect(c.rowOrder).toBeGreaterThanOrEqual(0);
    }
  });

  it("Hepburn romaji spot-checks (shi, chi, tsu, fu, ji, zu, o, n, kya, sha, cha, ja)", () => {
    const lookup = (h: string) => KANA_CHART.find((c) => c.hiragana === h)?.romaji;
    expect(lookup("し")).toBe("shi");
    expect(lookup("ち")).toBe("chi");
    expect(lookup("つ")).toBe("tsu");
    expect(lookup("ふ")).toBe("fu");
    expect(lookup("じ")).toBe("ji");
    expect(lookup("ぢ")).toBe("ji"); // homophone with za-row ji
    expect(lookup("づ")).toBe("zu"); // homophone with za-row zu
    expect(lookup("を")).toBe("o"); // Hepburn: wo → o
    expect(lookup("ん")).toBe("n");
    expect(lookup("きゃ")).toBe("kya");
    expect(lookup("しゃ")).toBe("sha");
    expect(lookup("ちゃ")).toBe("cha");
    expect(lookup("じゃ")).toBe("ja");
  });
});

describe("HIRAGANA_ROWS / KATAKANA_ROWS row coverage", () => {
  it(`HIRAGANA_ROWS contains exactly the ${EXPECTED_ROW_COUNT} canonical row ids`, () => {
    expect(HIRAGANA_ROWS.length).toBe(EXPECTED_ROW_COUNT);
    const ids = HIRAGANA_ROWS.map((r) => r.id).sort();
    const expected = [...CANONICAL_ROW_IDS].sort();
    expect(ids).toEqual(expected);
  });

  it(`KATAKANA_ROWS contains exactly the ${EXPECTED_ROW_COUNT} canonical row ids`, () => {
    expect(KATAKANA_ROWS.length).toBe(EXPECTED_ROW_COUNT);
    const ids = KATAKANA_ROWS.map((r) => r.id).sort();
    const expected = [...CANONICAL_ROW_IDS].sort();
    expect(ids).toEqual(expected);
  });

  it("HIRAGANA_ROWS sorted ascending by order", () => {
    for (let i = 1; i < HIRAGANA_ROWS.length; i++) {
      expect(HIRAGANA_ROWS[i].order).toBeGreaterThan(HIRAGANA_ROWS[i - 1].order);
    }
  });

  it("KATAKANA_ROWS sorted ascending by order", () => {
    for (let i = 1; i < KATAKANA_ROWS.length; i++) {
      expect(KATAKANA_ROWS[i].order).toBeGreaterThan(KATAKANA_ROWS[i - 1].order);
    }
  });

  it("every row's chars share its rowId (HIRAGANA_ROWS)", () => {
    for (const row of HIRAGANA_ROWS) {
      expect(row.chars.every((c) => c.rowId === row.id)).toBe(true);
    }
  });

  it("every row's chars share its rowId (KATAKANA_ROWS)", () => {
    for (const row of KATAKANA_ROWS) {
      expect(row.chars.every((c) => c.rowId === row.id)).toBe(true);
    }
  });

  it("yoon entries store 2-character strings in both hiragana and katakana fields", () => {
    for (const row of HIRAGANA_ROWS) {
      if (row.kind !== "yoon") continue;
      for (const c of row.chars) {
        expect(c.hiragana.length).toBe(2);
        expect(c.katakana.length).toBe(2);
      }
    }
  });
});

describe("Tuning constants are locked", () => {
  it("ROW_UNLOCK_MASTERY_PCT === 0.8", () => {
    expect(ROW_UNLOCK_MASTERY_PCT).toBe(0.8);
  });

  it("ROW_UNLOCK_MIN_STARS === 5", () => {
    expect(ROW_UNLOCK_MIN_STARS).toBe(5);
  });
});
