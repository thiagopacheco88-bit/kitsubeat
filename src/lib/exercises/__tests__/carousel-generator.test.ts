/**
 * carousel-generator.test.ts
 *
 * TDD RED: Written before implementation exists.
 * AnimeVocabItem defined inline to avoid cross-wave dependency on queries.ts.
 */

import { describe, it, expect } from "vitest";
import { buildAnimeCarouselQuestions } from "../carousel-generator";

// ── Inline type mirror (matches what Plan 03 will export from queries.ts) ─────
interface AnimeVocabItem {
  vocab_item_id: string;
  surface: string;
  reading: string;
  romaji: string;
  meaning: Record<string, string>;
  jlpt_level: string | null;
  category: string;
  context_note: string | null;
  display_order: number;
  mastery_state: number;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeWord(i: number, overrides: Partial<AnimeVocabItem> = {}): AnimeVocabItem {
  return {
    vocab_item_id: `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`,
    surface: `表面${i}`,
    reading: `よみ${i}`,
    romaji: `romaji${i}`,
    meaning: { en: `meaning${i}`, "pt-BR": `significado${i}` },
    jlpt_level: "N4",
    category: "general",
    context_note: null,
    display_order: i,
    mastery_state: 0,
    ...overrides,
  };
}

const FIFTY_WORDS: AnimeVocabItem[] = Array.from({ length: 50 }, (_, i) =>
  makeWord(i + 1)
);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("buildAnimeCarouselQuestions", () => {
  it("returns empty array for empty input", () => {
    expect(buildAnimeCarouselQuestions([], "en", 10)).toEqual([]);
  });

  it("returns at most cap questions from large pool", () => {
    const result = buildAnimeCarouselQuestions(FIFTY_WORDS, "en", 10);
    expect(result.length).toBe(10);
  });

  it("respects default cap of 20", () => {
    const result = buildAnimeCarouselQuestions(FIFTY_WORDS, "en");
    expect(result.length).toBeLessThanOrEqual(20);
  });

  it("with 3 words returns at most 6 questions (3 words × 2 types)", () => {
    const threeWords = [makeWord(1), makeWord(2), makeWord(3)];
    const result = buildAnimeCarouselQuestions(threeWords, "en", 10);
    expect(result.length).toBeLessThanOrEqual(6);
  });

  it("produces only vocab_meaning and meaning_vocab exercise types", () => {
    const result = buildAnimeCarouselQuestions(FIFTY_WORDS, "en", 20);
    for (const q of result) {
      expect(["vocab_meaning", "meaning_vocab"]).toContain(q.type);
    }
  });

  it("every question has a non-empty correctAnswer", () => {
    const result = buildAnimeCarouselQuestions(FIFTY_WORDS, "en", 20);
    for (const q of result) {
      expect(q.correctAnswer.length).toBeGreaterThan(0);
    }
  });

  it("every question has exactly 3 distractors", () => {
    const result = buildAnimeCarouselQuestions(FIFTY_WORDS, "en", 20);
    for (const q of result) {
      expect(q.distractors).toHaveLength(3);
    }
  });

  it("vocabItemId matches a word in the input pool", () => {
    const result = buildAnimeCarouselQuestions(FIFTY_WORDS, "en", 10);
    const validIds = new Set(FIFTY_WORDS.map((w) => w.vocab_item_id));
    for (const q of result) {
      expect(validIds.has(q.vocabItemId)).toBe(true);
    }
  });

  it("vocab_meaning question: prompt is surface, correctAnswer is meaning", () => {
    const words = [makeWord(1), makeWord(2), makeWord(3), makeWord(4)];
    const result = buildAnimeCarouselQuestions(words, "en", 100);
    const vmQuestion = result.find(
      (q) => q.type === "vocab_meaning" && q.vocabItemId === words[0].vocab_item_id
    );
    expect(vmQuestion).toBeDefined();
    expect(vmQuestion!.prompt).toBe(words[0].surface);
    expect(vmQuestion!.correctAnswer).toBe(words[0].meaning["en"]);
  });

  it("meaning_vocab question: prompt is meaning, correctAnswer is surface", () => {
    const words = [makeWord(1), makeWord(2), makeWord(3), makeWord(4)];
    const result = buildAnimeCarouselQuestions(words, "en", 100);
    const mvQuestion = result.find(
      (q) => q.type === "meaning_vocab" && q.vocabItemId === words[0].vocab_item_id
    );
    expect(mvQuestion).toBeDefined();
    expect(mvQuestion!.prompt).toBe(words[0].meaning["en"]);
    expect(mvQuestion!.correctAnswer).toBe(words[0].surface);
  });

  it("uses pt-BR locale meaning when locale is pt-BR", () => {
    const words = [makeWord(1), makeWord(2), makeWord(3), makeWord(4)];
    const result = buildAnimeCarouselQuestions(words, "pt-BR", 100);
    const vmQuestion = result.find(
      (q) => q.type === "vocab_meaning" && q.vocabItemId === words[0].vocab_item_id
    );
    expect(vmQuestion!.correctAnswer).toBe(words[0].meaning["pt-BR"]);
  });

  it("falls back to en meaning when locale is missing from meaning map", () => {
    const words = [
      makeWord(1, { meaning: { en: "dog" } }),
      makeWord(2),
      makeWord(3),
      makeWord(4),
    ];
    const result = buildAnimeCarouselQuestions(words, "ja", 100);
    const vmQuestion = result.find(
      (q) => q.type === "vocab_meaning" && q.vocabItemId === words[0].vocab_item_id
    );
    expect(vmQuestion!.correctAnswer).toBe("dog");
  });

  it("every question has a non-empty id (UUID-like string)", () => {
    const result = buildAnimeCarouselQuestions(FIFTY_WORDS, "en", 10);
    for (const q of result) {
      expect(typeof q.id).toBe("string");
      expect(q.id.length).toBeGreaterThan(0);
    }
  });

  it("every question has vocabInfo with surface/reading/romaji", () => {
    const result = buildAnimeCarouselQuestions(FIFTY_WORDS, "en", 10);
    for (const q of result) {
      expect(q.vocabInfo).toBeDefined();
      expect(q.vocabInfo.surface).toBeTruthy();
      expect(q.vocabInfo.reading).toBeTruthy();
      expect(q.vocabInfo.romaji).toBeTruthy();
    }
  });
});
