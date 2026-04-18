/**
 * Phase 10 Plan 04 — Listening Drill generator tests.
 *
 * Covers the listening_drill branch of makeQuestion + buildQuestions:
 *   - emits one question per timed verse vocab
 *   - excludes vocab whose verse has start_time_ms <= 0
 *   - cleanly skips the song when ALL verses lack timing (empty listening_drill slice)
 *   - distractors never include the correct answer
 *   - Question carries verseStartMs matching the source verse
 *   - Question carries verseTokens from the source verse
 *   - options are vocab surfaces (same as fill_lyric)
 */
import { describe, it, expect } from "vitest";
import { buildQuestions } from "../generator";
import type { Lesson, VocabEntry, Verse } from "@/lib/types/lesson";

// ---------------------------------------------------------------------------
// Fixtures — mirror generator.test.ts shapes
// ---------------------------------------------------------------------------

function makeVocabEntry(overrides: Partial<VocabEntry> & { surface: string }): VocabEntry {
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

const FIVE_VOCAB: VocabEntry[] = [
  makeVocabEntry({ surface: "空", romaji: "sora", meaning: "sky" }),
  makeVocabEntry({ surface: "海", romaji: "umi", meaning: "sea" }),
  makeVocabEntry({ surface: "火", romaji: "hi", meaning: "fire" }),
  makeVocabEntry({ surface: "水", romaji: "mizu", meaning: "water" }),
  makeVocabEntry({ surface: "山", romaji: "yama", meaning: "mountain" }),
];

const JLPT_POOL: VocabEntry[] = [
  makeVocabEntry({ surface: "花", romaji: "hana", meaning: "flower", vocab_item_id: "jlpt-1" }),
  makeVocabEntry({ surface: "鳥", romaji: "tori", meaning: "bird", vocab_item_id: "jlpt-2" }),
  makeVocabEntry({ surface: "木", romaji: "ki", meaning: "tree", vocab_item_id: "jlpt-3" }),
  makeVocabEntry({ surface: "石", romaji: "ishi", meaning: "stone", vocab_item_id: "jlpt-4" }),
  makeVocabEntry({ surface: "草", romaji: "kusa", meaning: "grass", vocab_item_id: "jlpt-5" }),
];

function makeLesson(vocabulary: VocabEntry[], verses: Verse[]): Lesson {
  return {
    jlpt_level: "N5",
    difficulty_tier: "basic",
    verses,
    vocabulary,
    grammar_points: [],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("buildQuestions — listening_drill branch", () => {
  it("emits listening_drill questions for verses with start_time_ms > 0", () => {
    const verses: Verse[] = [
      makeVerse(1, 1000, "空"),
      makeVerse(2, 6000, "海"),
      makeVerse(3, 11000, "火"),
      makeVerse(4, 16000, "水"),
      makeVerse(5, 21000, "山"),
    ];
    const lesson = makeLesson(FIVE_VOCAB, verses);
    const questions = buildQuestions(lesson, "full", JLPT_POOL);
    const listening = questions.filter((q) => q.type === "listening_drill");
    // 5 vocab each matched to a timed verse -> 5 listening_drill questions.
    expect(listening.length).toBe(5);
    for (const q of listening) {
      expect(q.verseStartMs).toBeGreaterThan(0);
      expect(q.verseTokens).toBeDefined();
      expect(q.verseTokens!.length).toBeGreaterThan(0);
    }
  });

  it("excludes vocab whose verse has start_time_ms = 0", () => {
    // 3 timed verses + 2 untimed. Untimed-verse surfaces should not appear in
    // the listening_drill slice.
    const verses: Verse[] = [
      makeVerse(1, 1000, "空"),
      makeVerse(2, 6000, "海"),
      makeVerse(3, 11000, "火"),
      makeVerse(4, 0, "水"), // untimed
      makeVerse(5, 0, "山"), // untimed
    ];
    const lesson = makeLesson(FIVE_VOCAB, verses);
    const questions = buildQuestions(lesson, "full", JLPT_POOL);
    const listening = questions.filter((q) => q.type === "listening_drill");
    // Only 3 timed verses -> 3 listening_drill questions.
    expect(listening.length).toBe(3);
    const surfaces = listening.map((q) => q.correctAnswer);
    expect(surfaces).not.toContain("水");
    expect(surfaces).not.toContain("山");
    // And every emitted question carries the originating verse's startMs.
    for (const q of listening) {
      expect(q.verseStartMs).toBeGreaterThan(0);
    }
  });

  it("emits zero listening_drill questions when ALL verses lack timing", () => {
    const verses: Verse[] = [
      makeVerse(1, 0, "空"),
      makeVerse(2, 0, "海"),
      makeVerse(3, 0, "火"),
      makeVerse(4, 0, "水"),
      makeVerse(5, 0, "山"),
    ];
    const lesson = makeLesson(FIVE_VOCAB, verses);
    const questions = buildQuestions(lesson, "full", JLPT_POOL);
    const listening = questions.filter((q) => q.type === "listening_drill");
    expect(listening.length).toBe(0);
  });

  it("distractors never include the correct answer (case-insensitive)", () => {
    const verses: Verse[] = [
      makeVerse(1, 1000, "空"),
      makeVerse(2, 6000, "海"),
      makeVerse(3, 11000, "火"),
      makeVerse(4, 16000, "水"),
      makeVerse(5, 21000, "山"),
    ];
    const lesson = makeLesson(FIVE_VOCAB, verses);
    const questions = buildQuestions(lesson, "full", JLPT_POOL);
    const listening = questions.filter((q) => q.type === "listening_drill");
    expect(listening.length).toBeGreaterThan(0);
    for (const q of listening) {
      const correctNorm = q.correctAnswer.trim().toLowerCase();
      expect(q.distractors).toHaveLength(3);
      for (const d of q.distractors) {
        expect(d.trim().toLowerCase()).not.toBe(correctNorm);
      }
    }
  });

  it("Question.verseStartMs matches the source verse's start_time_ms", () => {
    // Map each vocab surface -> the startMs we expect to see on its
    // listening_drill question.
    const verses: Verse[] = [
      makeVerse(1, 1234, "空"),
      makeVerse(2, 5678, "海"),
      makeVerse(3, 9012, "火"),
      makeVerse(4, 13456, "水"),
      makeVerse(5, 17890, "山"),
    ];
    const lesson = makeLesson(FIVE_VOCAB, verses);
    const questions = buildQuestions(lesson, "full", JLPT_POOL);
    const listening = questions.filter((q) => q.type === "listening_drill");

    const expectedStart: Record<string, number> = {
      空: 1234,
      海: 5678,
      火: 9012,
      水: 13456,
      山: 17890,
    };

    for (const q of listening) {
      expect(q.verseStartMs).toBe(expectedStart[q.correctAnswer]);
    }
  });

  it("options are the 4 vocab surfaces (correct + 3 distractors)", () => {
    // listening_drill mirrors fill_lyric — options are vocab surface strings.
    const verses: Verse[] = [
      makeVerse(1, 1000, "空"),
      makeVerse(2, 6000, "海"),
      makeVerse(3, 11000, "火"),
      makeVerse(4, 16000, "水"),
      makeVerse(5, 21000, "山"),
    ];
    const lesson = makeLesson(FIVE_VOCAB, verses);
    const questions = buildQuestions(lesson, "full", JLPT_POOL);
    const listening = questions.filter((q) => q.type === "listening_drill");
    const allSurfaces = new Set([
      ...FIVE_VOCAB.map((v) => v.surface),
      ...JLPT_POOL.map((v) => v.surface),
    ]);
    for (const q of listening) {
      expect(allSurfaces.has(q.correctAnswer)).toBe(true);
      for (const d of q.distractors) {
        expect(allSurfaces.has(d)).toBe(true);
      }
    }
  });

  it("Question.verseTokens equals the source verse's tokens", () => {
    const verses: Verse[] = [
      makeVerse(1, 1000, "空"),
      makeVerse(2, 6000, "海"),
      makeVerse(3, 11000, "火"),
      makeVerse(4, 16000, "水"),
      makeVerse(5, 21000, "山"),
    ];
    const lesson = makeLesson(FIVE_VOCAB, verses);
    const questions = buildQuestions(lesson, "full", JLPT_POOL);
    const listening = questions.filter((q) => q.type === "listening_drill");
    for (const q of listening) {
      // Each fixture verse has exactly one token whose surface === the verse's
      // text — the same surface as the question's correctAnswer.
      expect(q.verseTokens).toBeDefined();
      expect(q.verseTokens!.some((t) => t.surface === q.correctAnswer)).toBe(true);
    }
  });
});
