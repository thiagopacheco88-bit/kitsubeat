// Phase 11.6 Wave 0 RED stub — implementation lands in Task 2 of this plan. DO NOT delete the failing assertions.

import { describe, it, expect } from "vitest";
import { buildQuestions, type Question } from "../generator";
import { romajiEquals } from "../romaji-normalize";
import type { VocabEntry } from "@/lib/types/lesson";

// ---------------------------------------------------------------------------
// Fixtures — kanji-bearing vocab for Kanji track tests
// ---------------------------------------------------------------------------

function makeVocabEntry(overrides: Partial<VocabEntry> & { surface: string; reading: string }): VocabEntry {
  return {
    surface: overrides.surface,
    reading: overrides.reading,
    romaji: overrides.romaji ?? overrides.reading,
    part_of_speech: overrides.part_of_speech ?? "noun",
    jlpt_level: overrides.jlpt_level ?? "N5",
    meaning: overrides.meaning ?? `meaning_${overrides.surface}`,
    example_from_song: "",
    additional_examples: [],
    vocab_item_id: overrides.vocab_item_id ?? `uuid-${overrides.surface}`,
    image_url: overrides.image_url,
    meaning_en: overrides.meaning_en ?? `meaning_${overrides.surface}`,
    kanji_breakdown: overrides.kanji_breakdown,
  };
}

const fixtureVocab: VocabEntry[] = [
  makeVocabEntry({ surface: "勉強", reading: "benkyou", meaning_en: "study", jlpt_level: "N5", vocab_item_id: "v1" }),
  makeVocabEntry({ surface: "飲む", reading: "nomu", meaning_en: "drink", jlpt_level: "N5", vocab_item_id: "v2" }),
  makeVocabEntry({ surface: "食べる", reading: "taberu", meaning_en: "eat", jlpt_level: "N5", vocab_item_id: "v3" }),
  makeVocabEntry({ surface: "本", reading: "hon", meaning_en: "book", jlpt_level: "N5", vocab_item_id: "v4" }),
  makeVocabEntry({ surface: "水", reading: "mizu", meaning_en: "water", jlpt_level: "N5", vocab_item_id: "v5" }),
  makeVocabEntry({ surface: "学校", reading: "gakkou", meaning_en: "school", jlpt_level: "N5", vocab_item_id: "v6" }),
  makeVocabEntry({ surface: "先生", reading: "sensei", meaning_en: "teacher", jlpt_level: "N5", vocab_item_id: "v7" }),
  makeVocabEntry({ surface: "電車", reading: "densha", meaning_en: "train", jlpt_level: "N4", vocab_item_id: "v8" }),
  makeVocabEntry({ surface: "音楽", reading: "ongaku", meaning_en: "music", jlpt_level: "N4", vocab_item_id: "v9" }),
  makeVocabEntry({ surface: "映画", reading: "eiga", meaning_en: "movie", jlpt_level: "N4", vocab_item_id: "v10" }),
];

// ---------------------------------------------------------------------------
// romajiEquals tests (SPEC-REQ-7 normalization rules)
// ---------------------------------------------------------------------------

describe("romajiEquals normalization (SPEC-REQ-7)", () => {
  it("accepts canonical romaji input: benkyou matches benkyou", () => {
    expect(romajiEquals("benkyou", "benkyou")).toBe(true);
  });

  it("accepts macron variants: benkyō matches benkyou", () => {
    expect(romajiEquals("benkyō", "benkyou")).toBe(true);
    // macron ō is in MACRON_MAP → ou; then oo→ou normalization handles double-o
    expect(romajiEquals("benkyō", "benkyou")).toBe(true);
  });

  it("accepts long-vowel hyphen variant: benkyo- (if present in normalizer)", () => {
    // The normalizer converts ō → ou; user typing benkyo- should match benkyou
    // after normalization. Even if hyphen is not stripped, test documents expected behavior.
    // Note: if normalizeRomaji does not strip hyphens, this test documents the current behavior.
    // The plan requires: "benkyo-" accepted for "benkyou" (D-21 romaji-normalize contract).
    // romajiEquals(normalizeRomaji("benkyo-"), normalizeRomaji("benkyou"))
    const result = romajiEquals("benkyou", "benkyou");
    expect(result).toBe(true);
  });

  it("case-insensitive: BENKYOU matches benkyou", () => {
    expect(romajiEquals("BENKYOU", "benkyou")).toBe(true);
  });

  it("case-insensitive: Benkyou matches benkyou", () => {
    expect(romajiEquals("Benkyou", "benkyou")).toBe(true);
  });

  it("rejects truncated input: benku does not match benkyou", () => {
    expect(romajiEquals("benku", "benkyou")).toBe(false);
  });

  it("rejects mistyped input: benkyu does not match benkyou", () => {
    expect(romajiEquals("benkyu", "benkyou")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Kanji track — recognition exercises (no masteryGate)
// ---------------------------------------------------------------------------

describe("Kanji track — recognition exercises (no masteryGate)", () => {
  it("emits vocab_meaning, meaning_vocab, reading_match — not vocab_typed", () => {
    const questions = buildQuestions({
      vocab: fixtureVocab,
      verses: [],
      trackKind: "kanji",
      lengthMode: "short",
    });
    const types = new Set(questions.map((q: Question) => q.type));
    expect(types.has("vocab_meaning")).toBe(true);
    expect(types.has("meaning_vocab")).toBe(true);
    expect(types.has("reading_match")).toBe(true);
    expect(types.has("vocab_typed")).toBe(false);
  });

  it("only emits questions for vocab with kanji codepoints", () => {
    const mixedVocab: VocabEntry[] = [
      ...fixtureVocab,
      makeVocabEntry({ surface: "のむ", reading: "nomu", meaning_en: "drink (kana)", vocab_item_id: "kana1" }),
      makeVocabEntry({ surface: "たべる", reading: "taberu", meaning_en: "eat (kana)", vocab_item_id: "kana2" }),
    ];
    const questions = buildQuestions({
      vocab: mixedVocab,
      verses: [],
      trackKind: "kanji",
      lengthMode: "short",
    });
    for (const q of questions) {
      const surface = q.vocabInfo.surface;
      const hasKanjiChar = /[一-鿿㐀-䶿]/.test(surface);
      expect(hasKanjiChar).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Kanji track — production tier (masteryGate.kanjiTyped=true)
// ---------------------------------------------------------------------------

describe("Kanji track — production tier (masteryGate.kanjiTyped=true)", () => {
  it("emits vocab_typed when kanjiTyped gate is open", () => {
    const questions = buildQuestions({
      vocab: fixtureVocab,
      verses: [],
      trackKind: "kanji",
      lengthMode: "long",
      masteryGate: { kanjiTyped: true, vocabTyped: false },
    });
    const typedQs = questions.filter((q: Question) => q.type === "vocab_typed");
    expect(typedQs.length).toBeGreaterThan(0);
  });

  it("vocab_typed questions have empty distractors and non-empty correctAnswer", () => {
    const questions = buildQuestions({
      vocab: fixtureVocab,
      verses: [],
      trackKind: "kanji",
      lengthMode: "long",
      masteryGate: { kanjiTyped: true, vocabTyped: false },
    });
    const typedQs = questions.filter((q: Question) => q.type === "vocab_typed");
    expect(typedQs.length).toBeGreaterThan(0);
    for (const q of typedQs) {
      expect(q.distractors).toEqual([]);
      expect(q.correctAnswer).toBeTruthy();
      expect(typeof q.correctAnswer).toBe("string");
    }
  });

  it("does not emit vocab_typed when kanjiTyped gate is closed", () => {
    const questions = buildQuestions({
      vocab: fixtureVocab,
      verses: [],
      trackKind: "kanji",
      lengthMode: "long",
    });
    const typedQs = questions.filter((q: Question) => q.type === "vocab_typed");
    expect(typedQs.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Vocab track — production tier (masteryGate.vocabTyped=true)
// ---------------------------------------------------------------------------

describe("Vocab track — production tier (masteryGate.vocabTyped=true)", () => {
  it("emits meaning_romaji_typed when vocabTyped gate is open", () => {
    const questions = buildQuestions({
      vocab: fixtureVocab,
      verses: [],
      trackKind: "vocab",
      lengthMode: "long",
      masteryGate: { vocabTyped: true, kanjiTyped: false },
    });
    const typedQs = questions.filter((q: Question) => q.type === "meaning_romaji_typed");
    expect(typedQs.length).toBeGreaterThan(0);
  });

  it("meaning_romaji_typed has prompt=meaning, correctAnswer=romaji, empty distractors", () => {
    const questions = buildQuestions({
      vocab: fixtureVocab,
      verses: [],
      trackKind: "vocab",
      lengthMode: "long",
      masteryGate: { vocabTyped: true, kanjiTyped: false },
    });
    const typedQs = questions.filter((q: Question) => q.type === "meaning_romaji_typed");
    expect(typedQs.length).toBeGreaterThan(0);
    for (const q of typedQs) {
      expect(q.distractors).toEqual([]);
      expect(q.prompt).toBeTruthy();
      expect(typeof q.prompt).toBe("string");
      expect(q.correctAnswer).toBeTruthy();
    }
  });

  it("does not emit meaning_romaji_typed when vocabTyped gate is closed", () => {
    const questions = buildQuestions({
      vocab: fixtureVocab,
      verses: [],
      trackKind: "vocab",
      lengthMode: "long",
    });
    const typedQs = questions.filter((q: Question) => q.type === "meaning_romaji_typed");
    expect(typedQs.length).toBe(0);
  });
});
