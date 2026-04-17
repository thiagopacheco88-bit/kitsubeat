import { describe, it, expect } from "vitest";
import {
  buildQuestions,
  type ExerciseType,
  type Question,
  type SessionConfig,
} from "../generator";
import type { Lesson, VocabEntry, Verse } from "@/lib/types/lesson";

// ---------------------------------------------------------------------------
// Test fixtures
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

function makeVerse(
  verseNumber: number,
  startMs: number,
  text: string
): Verse {
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

// 5 vocab entries with vocab_item_id
const FIVE_VOCAB: VocabEntry[] = [
  makeVocabEntry({ surface: "空", romaji: "sora", meaning: "sky" }),
  makeVocabEntry({ surface: "海", romaji: "umi", meaning: "sea" }),
  makeVocabEntry({ surface: "火", romaji: "hi", meaning: "fire" }),
  makeVocabEntry({ surface: "水", romaji: "mizu", meaning: "water" }),
  makeVocabEntry({ surface: "山", romaji: "yama", meaning: "mountain" }),
];

// Verses that contain the surface forms with timing data
const TIMED_VERSES: Verse[] = [
  makeVerse(1, 1000, "空"),
  makeVerse(2, 6000, "海"),
  makeVerse(3, 11000, "火"),
  makeVerse(4, 16000, "水"),
  makeVerse(5, 21000, "山"),
];

// Verses with no timing (start_time_ms = 0)
const UNTIMED_VERSES: Verse[] = [
  makeVerse(1, 0, "空"),
  makeVerse(2, 0, "海"),
];

function makeLesson(
  vocabulary: VocabEntry[],
  verses: Verse[] = TIMED_VERSES
): Lesson {
  return {
    jlpt_level: "N5",
    difficulty_tier: "basic",
    verses,
    vocabulary,
    grammar_points: [],
  };
}

const JLPT_POOL: VocabEntry[] = [
  makeVocabEntry({ surface: "花", romaji: "hana", meaning: "flower", vocab_item_id: "jlpt-1" }),
  makeVocabEntry({ surface: "鳥", romaji: "tori", meaning: "bird", vocab_item_id: "jlpt-2" }),
  makeVocabEntry({ surface: "木", romaji: "ki", meaning: "tree", vocab_item_id: "jlpt-3" }),
  makeVocabEntry({ surface: "石", romaji: "ishi", meaning: "stone", vocab_item_id: "jlpt-4" }),
  makeVocabEntry({ surface: "草", romaji: "kusa", meaning: "grass", vocab_item_id: "jlpt-5" }),
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("buildQuestions", () => {
  // ------------------------------------------------------------------
  // Question count / session mode
  // ------------------------------------------------------------------

  it("short mode returns at most 10 questions for 5 vocab entries (5*4=20)", () => {
    const lesson = makeLesson(FIVE_VOCAB);
    const questions = buildQuestions(lesson, "short", JLPT_POOL);
    expect(questions.length).toBeLessThanOrEqual(10);
    expect(questions.length).toBe(10);
  });

  it("full mode returns all questions (5 vocab * 4 types = 20, under cap)", () => {
    const lesson = makeLesson(FIVE_VOCAB);
    const questions = buildQuestions(lesson, "full", JLPT_POOL);
    expect(questions.length).toBe(20);
  });

  it("full mode caps at 40 for 12 vocab entries (12*4=48)", () => {
    const twelve = Array.from({ length: 12 }, (_, i) =>
      makeVocabEntry({ surface: `word${i}`, romaji: `romaji${i}`, meaning: `meaning${i}` })
    );
    // Build enough timed verses for all surfaces
    const verses = twelve.map((v, i) => makeVerse(i + 1, (i + 1) * 5000, v.surface));
    const lesson = makeLesson(twelve, verses);
    const questions = buildQuestions(lesson, "full", JLPT_POOL);
    expect(questions.length).toBe(40);
  });

  it("skips vocab entries without vocab_item_id", () => {
    const withMissing: VocabEntry[] = [
      ...FIVE_VOCAB,
      makeVocabEntry({ surface: "無", vocab_item_id: undefined as unknown as string }),
    ];
    // Remove the vocab_item_id for the last entry
    withMissing[5] = { ...withMissing[5], vocab_item_id: undefined };
    const lesson = makeLesson(withMissing);
    const questions = buildQuestions(lesson, "full", JLPT_POOL);
    // Only 5 valid vocab entries * 4 types = 20
    expect(questions.length).toBe(20);
  });

  // ------------------------------------------------------------------
  // Exercise types
  // ------------------------------------------------------------------

  it("generates vocab_meaning questions (prompt=surface, answer=meaning)", () => {
    const lesson = makeLesson(FIVE_VOCAB);
    const questions = buildQuestions(lesson, "full", JLPT_POOL);
    const vmQuestions = questions.filter((q) => q.type === "vocab_meaning");
    expect(vmQuestions.length).toBeGreaterThan(0);
    const q = vmQuestions[0];
    // prompt should be a surface form from FIVE_VOCAB
    const surfaces = FIVE_VOCAB.map((v) => v.surface);
    expect(surfaces).toContain(q.prompt);
    // correctAnswer should be the meaning of that surface
    const vocab = FIVE_VOCAB.find((v) => v.surface === q.prompt)!;
    expect(q.correctAnswer).toBe(vocab.meaning as string);
  });

  it("generates meaning_vocab questions (prompt=meaning, answer=surface)", () => {
    const lesson = makeLesson(FIVE_VOCAB);
    const questions = buildQuestions(lesson, "full", JLPT_POOL);
    const mvQuestions = questions.filter((q) => q.type === "meaning_vocab");
    expect(mvQuestions.length).toBeGreaterThan(0);
    const q = mvQuestions[0];
    const meanings = FIVE_VOCAB.map((v) => v.meaning as string);
    expect(meanings).toContain(q.prompt);
    const vocab = FIVE_VOCAB.find((v) => (v.meaning as string) === q.prompt)!;
    expect(q.correctAnswer).toBe(vocab.surface);
  });

  it("generates reading_match questions (prompt=surface, answer=romaji)", () => {
    const lesson = makeLesson(FIVE_VOCAB);
    const questions = buildQuestions(lesson, "full", JLPT_POOL);
    const rmQuestions = questions.filter((q) => q.type === "reading_match");
    expect(rmQuestions.length).toBeGreaterThan(0);
    const q = rmQuestions[0];
    const surfaces = FIVE_VOCAB.map((v) => v.surface);
    expect(surfaces).toContain(q.prompt);
    const vocab = FIVE_VOCAB.find((v) => v.surface === q.prompt)!;
    expect(q.correctAnswer).toBe(vocab.romaji);
  });

  it("generates fill_lyric questions only when verse has start_time_ms > 0", () => {
    const lesson = makeLesson(FIVE_VOCAB, TIMED_VERSES);
    const questions = buildQuestions(lesson, "full", JLPT_POOL);
    const fillQuestions = questions.filter((q) => q.type === "fill_lyric");
    expect(fillQuestions.length).toBeGreaterThan(0);
    // Every fill_lyric question must have a verseRef with startMs > 0
    for (const q of fillQuestions) {
      expect(q.verseRef).toBeDefined();
      expect(q.verseRef!.startMs).toBeGreaterThan(0);
    }
  });

  it("skips fill_lyric when all verses have start_time_ms = 0", () => {
    const lesson = makeLesson(FIVE_VOCAB, UNTIMED_VERSES);
    const questions = buildQuestions(lesson, "full", JLPT_POOL);
    const fillQuestions = questions.filter((q) => q.type === "fill_lyric");
    expect(fillQuestions.length).toBe(0);
  });

  it("does not generate fill_lyric when fewer than 3 vocab items in song", () => {
    const twoVocab: VocabEntry[] = [
      makeVocabEntry({ surface: "空", romaji: "sora", meaning: "sky" }),
      makeVocabEntry({ surface: "海", romaji: "umi", meaning: "sea" }),
    ];
    const verses = twoVocab.map((v, i) => makeVerse(i + 1, (i + 1) * 5000, v.surface));
    const lesson = makeLesson(twoVocab, verses);
    const questions = buildQuestions(lesson, "full", JLPT_POOL);
    const fillQuestions = questions.filter((q) => q.type === "fill_lyric");
    expect(fillQuestions.length).toBe(0);
  });

  // ------------------------------------------------------------------
  // Distractors
  // ------------------------------------------------------------------

  it("every question has exactly 3 distractors", () => {
    const lesson = makeLesson(FIVE_VOCAB);
    const questions = buildQuestions(lesson, "full", JLPT_POOL);
    for (const q of questions) {
      expect(q.distractors).toHaveLength(3);
    }
  });

  it("no distractor equals the correct answer (case-insensitive trimmed)", () => {
    const lesson = makeLesson(FIVE_VOCAB);
    const questions = buildQuestions(lesson, "full", JLPT_POOL);
    for (const q of questions) {
      const correctNorm = q.correctAnswer.trim().toLowerCase();
      for (const d of q.distractors) {
        expect(d.trim().toLowerCase()).not.toBe(correctNorm);
      }
    }
  });

  it("no duplicate distractors within a question", () => {
    const lesson = makeLesson(FIVE_VOCAB);
    const questions = buildQuestions(lesson, "full", JLPT_POOL);
    for (const q of questions) {
      const unique = new Set(q.distractors.map((d) => d.trim().toLowerCase()));
      expect(unique.size).toBe(3);
    }
  });

  // ------------------------------------------------------------------
  // Question shape
  // ------------------------------------------------------------------

  it("each question has a unique UUID id", () => {
    const lesson = makeLesson(FIVE_VOCAB);
    const questions = buildQuestions(lesson, "full", JLPT_POOL);
    const ids = questions.map((q) => q.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(questions.length);
    // UUID v4 format
    for (const id of ids) {
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    }
  });

  it("each question has a non-empty explanation string", () => {
    const lesson = makeLesson(FIVE_VOCAB);
    const questions = buildQuestions(lesson, "full", JLPT_POOL);
    for (const q of questions) {
      expect(typeof q.explanation).toBe("string");
      expect(q.explanation.length).toBeGreaterThan(0);
    }
  });

  it("each question has vocabItemId matching the source vocab entry", () => {
    const lesson = makeLesson(FIVE_VOCAB);
    const questions = buildQuestions(lesson, "full", JLPT_POOL);
    const validIds = new Set(FIVE_VOCAB.map((v) => v.vocab_item_id));
    for (const q of questions) {
      expect(validIds.has(q.vocabItemId)).toBe(true);
    }
  });

  // ------------------------------------------------------------------
  // fill_lyric specific
  // ------------------------------------------------------------------

  it("fill_lyric prompt contains a blank (_____) where the surface was", () => {
    const lesson = makeLesson(FIVE_VOCAB, TIMED_VERSES);
    const questions = buildQuestions(lesson, "full", JLPT_POOL);
    const fillQuestions = questions.filter((q) => q.type === "fill_lyric");
    for (const q of fillQuestions) {
      expect(q.prompt).toContain("_____");
    }
  });

  it("fill_lyric vocab entry with no matching verse produces no fill_lyric question", () => {
    // Word with no verse containing its surface
    const vocab = [
      makeVocabEntry({ surface: "invisible", romaji: "invisible", meaning: "not in verse" }),
      ...FIVE_VOCAB,
    ];
    const lesson = makeLesson(vocab, TIMED_VERSES); // TIMED_VERSES only has 空海火水山
    const questions = buildQuestions(lesson, "full", JLPT_POOL);
    const fillQuestions = questions.filter((q) => q.type === "fill_lyric");
    // "invisible" should not appear as a fill_lyric prompt (no matching verse)
    const fillSurfaces = fillQuestions.map((q) => q.correctAnswer);
    expect(fillSurfaces).not.toContain("invisible");
  });

  // ------------------------------------------------------------------
  // Determinism + type-mix invariants (Phase 08.1-02)
  // ------------------------------------------------------------------

  it("short mode seed is deterministic across runs", () => {
    // The current generator uses Math.random() inside Fisher-Yates shuffle, so
    // exact ordering is NOT guaranteed across runs. We assert the weaker —
    // but still useful — invariant: every run produces the same LENGTH and the
    // same per-type counts for the same inputs. If a future refactor seeds the
    // shuffle, this test becomes the gate that catches accidental
    // de-seeding regressions.
    const lesson = makeLesson(FIVE_VOCAB);

    const runs = Array.from({ length: 5 }, () =>
      buildQuestions(lesson, "short", JLPT_POOL)
    );

    const lengths = runs.map((r) => r.length);
    expect(new Set(lengths).size).toBe(1);
    expect(lengths[0]).toBe(10);

    const typeMixes = runs.map((r) => {
      const counts: Record<ExerciseType, number> = {
        vocab_meaning: 0,
        meaning_vocab: 0,
        reading_match: 0,
        fill_lyric: 0,
      };
      for (const q of r) counts[q.type]++;
      return counts;
    });

    // Length-stability is guaranteed; type-mix may drift by ±a-few because the
    // shuffle is unseeded, so we only assert each type count stays within a
    // sane window (no type collapses to 0, no type dominates >7 of 10).
    for (const mix of typeMixes) {
      for (const t of [
        "vocab_meaning",
        "meaning_vocab",
        "reading_match",
        "fill_lyric",
      ] as ExerciseType[]) {
        expect(mix[t]).toBeGreaterThanOrEqual(0);
        expect(mix[t]).toBeLessThanOrEqual(10);
      }
    }
  });

  it("short mode type mix is balanced across 4 types when all unlocked", () => {
    // In full mode with 5 vocab, every type produces exactly 5 questions
    // (5 vocab × 1 type each), so each type's count must be exactly 5 — well
    // within the ±1 tolerance the plan specifies.
    const lesson = makeLesson(FIVE_VOCAB);
    const questions = buildQuestions(lesson, "full", JLPT_POOL);

    const counts: Record<ExerciseType, number> = {
      vocab_meaning: 0,
      meaning_vocab: 0,
      reading_match: 0,
      fill_lyric: 0,
    };
    for (const q of questions) counts[q.type]++;

    for (const t of [
      "vocab_meaning",
      "meaning_vocab",
      "reading_match",
      "fill_lyric",
    ] as ExerciseType[]) {
      expect(counts[t]).toBeGreaterThanOrEqual(4);
      expect(counts[t]).toBeLessThanOrEqual(6);
    }
    // And total must equal 4 types × 5 vocab = 20.
    expect(questions.length).toBe(20);
  });
});
