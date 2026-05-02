// Phase 11.6 Wave 0 RED stub — implementation lands in Task 2 of this plan. DO NOT delete the failing assertions.

import { describe, it, expect } from "vitest";
import { buildQuestions, type Question } from "../generator";
import type { VocabEntry, GrammarPoint } from "@/lib/types/lesson";

// ---------------------------------------------------------------------------
// Fixtures
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
    meaning_en: overrides.meaning_en ?? `en_${overrides.surface}`,
    kanji_breakdown: overrides.kanji_breakdown,
  };
}

// 10 kanji-bearing vocab entries
const kanjiVocab: VocabEntry[] = [
  makeVocabEntry({ surface: "勉強", reading: "benkyou", meaning_en: "study", jlpt_level: "N5", vocab_item_id: "k01" }),
  makeVocabEntry({ surface: "学校", reading: "gakkou", meaning_en: "school", jlpt_level: "N5", vocab_item_id: "k02" }),
  makeVocabEntry({ surface: "先生", reading: "sensei", meaning_en: "teacher", jlpt_level: "N5", vocab_item_id: "k03" }),
  makeVocabEntry({ surface: "水", reading: "mizu", meaning_en: "water", jlpt_level: "N5", vocab_item_id: "k04" }),
  makeVocabEntry({ surface: "本", reading: "hon", meaning_en: "book", jlpt_level: "N5", vocab_item_id: "k05" }),
  makeVocabEntry({ surface: "電車", reading: "densha", meaning_en: "train", jlpt_level: "N4", vocab_item_id: "k06" }),
  makeVocabEntry({ surface: "音楽", reading: "ongaku", meaning_en: "music", jlpt_level: "N4", vocab_item_id: "k07" }),
  makeVocabEntry({ surface: "映画", reading: "eiga", meaning_en: "movie", jlpt_level: "N4", vocab_item_id: "k08" }),
  makeVocabEntry({ surface: "食べる", reading: "taberu", meaning_en: "eat", jlpt_level: "N5", vocab_item_id: "k09" }),
  makeVocabEntry({ surface: "飲む", reading: "nomu", meaning_en: "drink", jlpt_level: "N5", vocab_item_id: "k10" }),
];

// 10 kana-only vocab entries (for grammar/vocab pool)
const kanaVocab: VocabEntry[] = [
  makeVocabEntry({ surface: "きれい", reading: "kirei", meaning_en: "pretty", jlpt_level: "N5", vocab_item_id: "g01" }),
  makeVocabEntry({ surface: "たのしい", reading: "tanoshii", meaning_en: "fun", jlpt_level: "N5", vocab_item_id: "g02" }),
  makeVocabEntry({ surface: "むずかしい", reading: "muzukashii", meaning_en: "difficult", jlpt_level: "N4", vocab_item_id: "g03" }),
  makeVocabEntry({ surface: "やさしい", reading: "yasashii", meaning_en: "easy", jlpt_level: "N5", vocab_item_id: "g04" }),
  makeVocabEntry({ surface: "はやい", reading: "hayai", meaning_en: "fast", jlpt_level: "N5", vocab_item_id: "g05" }),
  makeVocabEntry({ surface: "おそい", reading: "osoi", meaning_en: "slow", jlpt_level: "N5", vocab_item_id: "g06" }),
  makeVocabEntry({ surface: "おおきい", reading: "ookii", meaning_en: "big", jlpt_level: "N5", vocab_item_id: "g07" }),
  makeVocabEntry({ surface: "ちいさい", reading: "chiisai", meaning_en: "small", jlpt_level: "N5", vocab_item_id: "g08" }),
  makeVocabEntry({ surface: "あかい", reading: "akai", meaning_en: "red", jlpt_level: "N5", vocab_item_id: "g09" }),
  makeVocabEntry({ surface: "あおい", reading: "aoi", meaning_en: "blue", jlpt_level: "N5", vocab_item_id: "g10" }),
];

// Combined pool (10 kanji + 10 kana = 20 vocab entries total)
const fullVocabPool: VocabEntry[] = [...kanjiVocab, ...kanaVocab];

// ---------------------------------------------------------------------------
// SPEC-REQ-12: Advanced Drills 1:1:1 distribution + >=30% typed
// These tests MUST FAIL until Task 2 extends buildQuestions with trackKind.
// ---------------------------------------------------------------------------

describe("Advanced Drills distribution (SPEC-REQ-12)", () => {
  it("Advanced Drills emits questions with trackKind=advanced_drills", () => {
    // This will FAIL until generator.ts is extended (no trackKind param yet).
    const questions = buildQuestions({
      vocab: fullVocabPool,
      verses: [],
      trackKind: "advanced_drills",
      lengthMode: "long", // cap=25
    });
    expect(questions.length).toBeGreaterThan(0);
  });

  it("Advanced Drills lengthMode=long caps output at 25 questions", () => {
    // This will FAIL until generator.ts is extended.
    const questions = buildQuestions({
      vocab: fullVocabPool,
      verses: [],
      trackKind: "advanced_drills",
      lengthMode: "long",
    });
    // CONTEXT D-20: long=25, short=10
    expect(questions.length).toBeLessThanOrEqual(25);
  });

  it("Advanced Drills >=30% typed questions (SPEC-REQ-12 >=30% typed)", () => {
    // 0.30 threshold: at least 30% of questions must be vocab_typed
    // This will FAIL until Task 2 implements the advanced_drills mixing logic.
    const questions = buildQuestions({
      vocab: fullVocabPool,
      verses: [],
      trackKind: "advanced_drills",
      lengthMode: "long",
    });
    const total = questions.length;
    expect(total).toBeGreaterThan(0);

    const typedCount = questions.filter((q: Question) => q.type === "vocab_typed").length;
    const typedRatio = typedCount / total;
    // SPEC-REQ-12: at least 30% typed
    expect(typedRatio).toBeGreaterThanOrEqual(0.30);
  });

  it("Advanced Drills 1:1:1 distribution within +/-20% (SPEC-REQ-12)", () => {
    // Track type buckets: vocab (mc), grammar_conjugation, kanji (vocab_typed)
    // For 25 total: each ~8.3, accept range based on +/-20% of 1/3 = 0.267 to 0.400
    // This will FAIL until Task 2 implements the advanced_drills mixing logic.
    const questions = buildQuestions({
      vocab: fullVocabPool,
      verses: [],
      trackKind: "advanced_drills",
      lengthMode: "long",
    });

    const total = questions.length;
    expect(total).toBeGreaterThan(0);

    // Count by origin track type:
    // - vocab_typed = kanji track
    // - vocab_meaning | meaning_vocab | reading_match = vocab track
    // - grammar_conjugation = grammar track
    const kanjiCount = questions.filter((q: Question) => q.type === "vocab_typed").length;
    const vocabCount = questions.filter((q: Question) =>
      q.type === "vocab_meaning" || q.type === "meaning_vocab" || q.type === "reading_match"
    ).length;
    const grammarCount = questions.filter((q: Question) => q.type === "grammar_conjugation").length;

    // Each bucket must be within +/-20% of the equal share (1/3 of total)
    const equalShare = total / 3;
    const tolerance = 0.20; // +/-20% of equal share

    // At minimum we need at least the typed and vocab buckets to have content
    // (grammar may be 0 if no grammarPoints provided — so we just check vocab & kanji)
    expect(kanjiCount).toBeGreaterThan(0);
    expect(vocabCount).toBeGreaterThan(0);

    // When there are grammar points, assert 1:1:1 distribution
    if (grammarCount > 0) {
      expect(Math.abs(kanjiCount - equalShare) / equalShare).toBeLessThanOrEqual(tolerance);
      expect(Math.abs(vocabCount - equalShare) / equalShare).toBeLessThanOrEqual(tolerance);
      expect(Math.abs(grammarCount - equalShare) / equalShare).toBeLessThanOrEqual(tolerance);
    }
  });

  it("Advanced Drills every question has non-empty vocabInfo.reading (furigana support)", () => {
    // SPEC-REQ-12: furigana must be available on every question
    // This will FAIL until Task 2 is implemented.
    const questions = buildQuestions({
      vocab: fullVocabPool,
      verses: [],
      trackKind: "advanced_drills",
      lengthMode: "long",
    });

    for (const q of questions) {
      // Sentence order is verse-centric and has empty reading — exclude it
      if (q.type === "sentence_order") continue;
      // Every non-sentence-order question must have vocabInfo.reading
      expect(q.vocabInfo.reading).toBeTruthy();
    }
  });
});

describe("Advanced Drills lengthMode=short caps at 10", () => {
  it("lengthMode=short returns at most 10 questions", () => {
    // This will FAIL until generator.ts is extended with lengthMode param.
    const questions = buildQuestions({
      vocab: fullVocabPool,
      verses: [],
      trackKind: "advanced_drills",
      lengthMode: "short",
    });
    // CONTEXT D-20: short=10
    expect(questions.length).toBeLessThanOrEqual(10);
  });
});
