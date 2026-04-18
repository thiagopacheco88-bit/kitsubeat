import { describe, it, expect } from "vitest";
import { vocabRowToVocabEntry } from "../distractors";
import { pickDistractors } from "@/lib/exercises/generator";
import type { VocabRow } from "@/app/api/review/queue/route";
import type { ReviewQuestionType } from "@/lib/review/queue-builder";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeVocabRow(overrides: Partial<VocabRow> = {}): VocabRow {
  return {
    id: "row-001",
    dictionary_form: "食べる",
    reading: "たべる",
    romaji: "taberu",
    part_of_speech: "verb",
    jlpt_level: "N5",
    meaning: { en: "to eat" },
    mnemonic: null,
    kanji_breakdown: null,
    ...overrides,
  };
}

function makeSyntheticPool(count: number): VocabRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `pool-${i.toString().padStart(3, "0")}`,
    dictionary_form: `語${i}`,
    reading: `よみ${i}`,
    romaji: `yomi${i}`,
    part_of_speech: "noun" as const,
    jlpt_level: "N5",
    meaning: { en: `meaning${i}` },
    mnemonic: null,
    kanji_breakdown: null,
  }));
}

// ---------------------------------------------------------------------------
// Case 1: string meaning → wraps to { en: ... }
// ---------------------------------------------------------------------------

describe("vocabRowToVocabEntry", () => {
  it("wraps string meaning into { en: ... }", () => {
    const row = makeVocabRow({ meaning: "hello" });
    const entry = vocabRowToVocabEntry(row);
    expect(entry.meaning).toEqual({ en: "hello" });
  });

  // Case 2: object meaning passes through unchanged
  it("passes through object meaning unchanged", () => {
    const row = makeVocabRow({ meaning: { en: "hello", pt: "olá" } });
    const entry = vocabRowToVocabEntry(row);
    expect(entry.meaning).toEqual({ en: "hello", pt: "olá" });
  });

  // Case 3: null jlpt_level falls back to "N5"
  it("falls back jlpt_level null to N5", () => {
    const row = makeVocabRow({ jlpt_level: null });
    const entry = vocabRowToVocabEntry(row);
    expect(entry.jlpt_level).toBe("N5");
  });

  // Case 4: vocab_item_id equals row.id; surface/reading/romaji all non-empty
  it("maps vocab_item_id from row.id and preserves surface fields", () => {
    const row = makeVocabRow({ id: "abc-123" });
    const entry = vocabRowToVocabEntry(row);
    expect(entry.vocab_item_id).toBe("abc-123");
    expect(entry.surface.length).toBeGreaterThan(0);
    expect(entry.reading.length).toBeGreaterThan(0);
    expect(entry.romaji.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Case 5 (property): pickDistractors via vocabRowToVocabEntry returns 3 unique
// distractors that do not equal the correct answer for every ReviewQuestionType
// ---------------------------------------------------------------------------

const QUESTION_TYPES: ReviewQuestionType[] = [
  "vocab_meaning",
  "meaning_vocab",
  "reading_match",
];

describe("pickDistractors integration via vocabRowToVocabEntry", () => {
  for (const qType of QUESTION_TYPES) {
    it(`returns 3 unique, non-correct distractors for type=${qType}`, () => {
      const correctRow = makeVocabRow({
        id: "correct-001",
        dictionary_form: "食べる",
        reading: "たべる",
        romaji: "taberu",
        meaning: { en: "to eat" },
        jlpt_level: "N5",
      });
      const poolRows = makeSyntheticPool(10);

      const correctEntry = vocabRowToVocabEntry(correctRow);
      const poolEntries = poolRows.map(vocabRowToVocabEntry);

      const distractors = pickDistractors(correctEntry, qType, [], poolEntries);

      // Must have exactly 3
      expect(distractors).toHaveLength(3);

      // Must be unique (case-insensitive, trimmed)
      const normalized = distractors.map((d) => d.trim().toLowerCase());
      const unique = new Set(normalized);
      expect(unique.size).toBe(3);

      // None must equal the correct answer (case-insensitive, trimmed)
      let correctField = "";
      switch (qType) {
        case "vocab_meaning":
          correctField = "to eat";
          break;
        case "meaning_vocab":
          correctField = "食べる";
          break;
        case "reading_match":
          correctField = "taberu";
          break;
      }
      for (const d of normalized) {
        expect(d).not.toBe(correctField.trim().toLowerCase());
      }
    });
  }
});
