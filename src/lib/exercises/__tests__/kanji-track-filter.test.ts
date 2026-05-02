// Phase 11.6 Wave 0 RED stub — implementation lands later in this plan (Task 2/3). DO NOT delete the failing assertions.

import { describe, it, expect } from "vitest";
import { isKanji, hasKanji, kanjiSet } from "../kanji";

// ---------------------------------------------------------------------------
// SPEC-REQ-3: Kanji codepoint detection + track filter
// ---------------------------------------------------------------------------

describe("isKanji — CJK codepoint detection (SPEC-REQ-3)", () => {
  it("detects CJK Unified Ideographs (U+4E00-U+9FFF)", () => {
    expect(isKanji("飲")).toBe(true);  // U+98F2 — in range
    expect(isKanji("a")).toBe(false);  // ASCII letter — out of range
    expect(isKanji("ひ")).toBe(false); // Hiragana — out of range
    expect(isKanji("カ")).toBe(false); // Katakana — out of range
  });

  it("detects CJK Extension A (U+3400-U+4DBF)", () => {
    expect(isKanji("㐀")).toBe(true); // U+3400 — first char of Extension A
  });

  it("returns false for empty string (no codepoint)", () => {
    // codePointAt(0) on empty string returns undefined → cp defaults to 0
    expect(isKanji("")).toBe(false);
  });
});

describe("hasKanji — text contains at least one kanji character", () => {
  it("returns true when text contains kanji", () => {
    expect(hasKanji("飲む")).toBe(true);   // '飲' is kanji
    expect(hasKanji("飲mu")).toBe(true);   // mixed — still has kanji
  });

  it("returns false when text has no kanji", () => {
    expect(hasKanji("のむ")).toBe(false);  // pure hiragana
    expect(hasKanji("drink")).toBe(false); // English
    expect(hasKanji("カタカナ")).toBe(false); // pure katakana
  });
});

describe("kanjiSet — extract distinct kanji from text", () => {
  it("extracts distinct kanji characters from mixed text", () => {
    const result = kanjiSet("飲飲む水");
    expect(result.size).toBe(2);
    expect(result.has("飲")).toBe(true);
    expect(result.has("水")).toBe(true);
  });

  it("returns empty set for text with no kanji", () => {
    const result = kanjiSet("hello");
    expect(result.size).toBe(0);
  });

  it("deduplicates repeated kanji", () => {
    const result = kanjiSet("日日日");
    expect(result.size).toBe(1);
    expect(result.has("日")).toBe(true);
  });
});

describe("kanji-track filter integration (SPEC-REQ-3)", () => {
  it("filters vocab array to only kanji-bearing surfaces", () => {
    const vocab = [
      { surface: "飲む" },    // kanji ✓
      { surface: "のむ" },    // hiragana only ✗
      { surface: "water" },   // English ✗
      { surface: "本" },      // kanji ✓
      { surface: "カナ" },    // katakana ✗
    ];

    const result = vocab.filter((v) => hasKanji(v.surface));

    expect(result).toHaveLength(2);
    expect(result[0].surface).toBe("飲む");
    expect(result[1].surface).toBe("本");
  });
});
