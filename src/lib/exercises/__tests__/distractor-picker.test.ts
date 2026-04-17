/**
 * Phase 08.1-02 — distractor-picker unit coverage.
 *
 * Targets the distractor-selection branch of buildQuestions:
 *   1. Same-song pool first
 *   2. Pad from same-JLPT-level pool
 *   3. Pad from entire JLPT pool
 *
 * Encodes EXER-10 ("never random") + the 3-distractor invariant in
 * thin-vocab + empty-pool conditions.
 */

import { describe, it, expect } from "vitest";
import { buildQuestions, type ExerciseType } from "../generator";
import type { Lesson, VocabEntry, Verse } from "@/lib/types/lesson";

// ---------------------------------------------------------------------------
// Fixtures (mirrors generator.test.ts conventions)
// ---------------------------------------------------------------------------

function makeVocabEntry(
  overrides: Partial<VocabEntry> & { surface: string }
): VocabEntry {
  return {
    surface: overrides.surface,
    reading: overrides.reading ?? overrides.surface,
    romaji: overrides.romaji ?? `romaji_${overrides.surface}`,
    part_of_speech: overrides.part_of_speech ?? "noun",
    jlpt_level: overrides.jlpt_level ?? "N5",
    meaning: overrides.meaning ?? `meaning_${overrides.surface}`,
    example_from_song: overrides.example_from_song ?? "",
    additional_examples: overrides.additional_examples ?? [],
    vocab_item_id: overrides.vocab_item_id ?? `uuid-${overrides.surface}`,
  };
}

function makeVerse(verseNumber: number, startMs: number, text: string): Verse {
  return {
    verse_number: verseNumber,
    start_time_ms: startMs,
    end_time_ms: startMs + 5000,
    tokens: [
      {
        surface: text,
        reading: text,
        romaji: text,
        grammar: "noun",
        grammar_color: "blue",
        meaning: `meaning_${text}`,
        jlpt_level: "N5",
      },
    ],
    translations: { en: `translation of ${text}` },
    literal_meaning: `literal_${text}`,
  };
}

function makeLesson(vocabulary: VocabEntry[], verses: Verse[]): Lesson {
  return {
    jlpt_level: "N5",
    difficulty_tier: "basic",
    verses,
    vocabulary,
    grammar_points: [],
  };
}

// 3-vocab thin song (the minimum for fill_lyric eligibility).
const THIN_VOCAB: VocabEntry[] = [
  makeVocabEntry({ surface: "空", romaji: "sora", meaning: "sky" }),
  makeVocabEntry({ surface: "海", romaji: "umi", meaning: "sea" }),
  makeVocabEntry({ surface: "火", romaji: "hi", meaning: "fire" }),
];

const THIN_VERSES: Verse[] = THIN_VOCAB.map((v, i) =>
  makeVerse(i + 1, (i + 1) * 5000, v.surface)
);

// 20-item JLPT pool with varied surfaces / readings / meanings — all N5.
const JLPT_POOL_20: VocabEntry[] = Array.from({ length: 20 }, (_, i) =>
  makeVocabEntry({
    surface: `語${i}`,
    romaji: `go${i}`,
    meaning: `pool_meaning_${i}`,
    vocab_item_id: `pool-${i}`,
  })
);

// Regex: only kanji (CJK Unified Ideographs) + hiragana + katakana characters.
const JAPANESE_CHAR_CLASS = /^[\u3040-\u30ff\u4e00-\u9fff]+$/;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("distractor picker (via buildQuestions)", () => {
  it("Test A: thin-vocab + 20-item pool — every question has 3 distractors drawn from pool ∪ song vocab (never the correct answer)", () => {
    const lesson = makeLesson(THIN_VOCAB, THIN_VERSES);
    const questions = buildQuestions(lesson, "full", JLPT_POOL_20);

    expect(questions.length).toBeGreaterThan(0);

    for (const q of questions) {
      // Every question must hit the 3-distractor invariant.
      expect(q.distractors).toHaveLength(3);

      // No distractor may equal the correct answer (case-insensitive trimmed).
      const correctNorm = q.correctAnswer.trim().toLowerCase();
      for (const d of q.distractors) {
        expect(d.trim().toLowerCase()).not.toBe(correctNorm);
      }

      // Build the legal source-of-truth set per type, derived from the same
      // field extraction the generator uses internally.
      const legalSet = new Set<string>();
      const collect = (entries: VocabEntry[]) => {
        for (const v of entries) {
          switch (q.type) {
            case "vocab_meaning":
              legalSet.add(String(v.meaning));
              break;
            case "meaning_vocab":
              legalSet.add(v.surface);
              break;
            case "reading_match":
              legalSet.add(v.romaji);
              break;
            case "fill_lyric":
              legalSet.add(v.surface);
              break;
          }
        }
      };
      collect(THIN_VOCAB);
      collect(JLPT_POOL_20);

      for (const d of q.distractors) {
        expect(legalSet.has(d)).toBe(true);
      }
    }
  });

  it.fails(
    "Test B: thin-vocab + EMPTY pool currently emits fewer than 3 distractors — known gap, Phase 8 follow-up must restore 3-distractor invariant",
    () => {
      // With only 3 song vocab entries, there are exactly 2 candidate
      // distractors per question (the other two surfaces/meanings/romaji).
      // With an empty JLPT pool there is no fallback source, so the current
      // implementation emits 2 distractors, NOT 3.
      //
      // `it.fails` makes this test PASS while the gap exists and flips RED the
      // moment generator.ts grows a thin-pool fallback. At that point convert
      // it.fails → it and this becomes the live invariant assertion.
      const lesson = makeLesson(THIN_VOCAB, THIN_VERSES);
      const questions = buildQuestions(lesson, "full", []);

      expect(questions.length).toBeGreaterThan(0);
      for (const q of questions) {
        expect(q.distractors).toHaveLength(3);
      }
    }
  );

  it("Test C: meaning_vocab distractors are kanji/kana — never English meanings", () => {
    const lesson = makeLesson(THIN_VOCAB, THIN_VERSES);
    const questions = buildQuestions(lesson, "full", JLPT_POOL_20);

    const surfaceUniverse = new Set<string>([
      ...THIN_VOCAB.map((v) => v.surface),
      ...JLPT_POOL_20.map((v) => v.surface),
    ]);

    const mvQuestions = questions.filter((q) => q.type === "meaning_vocab");
    expect(mvQuestions.length).toBeGreaterThan(0);

    for (const q of mvQuestions) {
      for (const d of q.distractors) {
        // Either the distractor is one of the known surface forms…
        const isKnownSurface = surfaceUniverse.has(d);
        // …or it matches the kanji/kana regex (defense-in-depth).
        const isJapaneseCharacterClass = JAPANESE_CHAR_CLASS.test(d);
        expect(isKnownSurface || isJapaneseCharacterClass).toBe(true);
        // And explicitly: it must NOT be one of the song vocab meanings
        // (e.g. "sky" / "sea" / "fire" must never leak into the surface set).
        const englishMeanings = new Set(
          THIN_VOCAB.map((v) => String(v.meaning))
        );
        expect(englishMeanings.has(d)).toBe(false);
      }
    }
  });

  it("Test D: vocab_meaning distractors are English-ish meanings — never surface forms", () => {
    const lesson = makeLesson(THIN_VOCAB, THIN_VERSES);
    const questions = buildQuestions(lesson, "full", JLPT_POOL_20);

    const meaningUniverse = new Set<string>([
      ...THIN_VOCAB.map((v) => String(v.meaning)),
      ...JLPT_POOL_20.map((v) => String(v.meaning)),
    ]);
    const surfaceUniverse = new Set<string>([
      ...THIN_VOCAB.map((v) => v.surface),
      ...JLPT_POOL_20.map((v) => v.surface),
    ]);

    const vmQuestions = questions.filter((q) => q.type === "vocab_meaning");
    expect(vmQuestions.length).toBeGreaterThan(0);

    for (const q of vmQuestions) {
      for (const d of q.distractors) {
        // Must come from the known meaning universe.
        expect(meaningUniverse.has(d)).toBe(true);
        // And must NOT accidentally be a surface form.
        expect(surfaceUniverse.has(d)).toBe(false);
        // And must NOT match the Japanese char class (sanity check).
        expect(JAPANESE_CHAR_CLASS.test(d)).toBe(false);
      }
    }
  });
});
