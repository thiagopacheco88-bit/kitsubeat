// @vitest-environment jsdom
/**
 * Phase 10 Plan 05 — Sentence Order unit tests.
 *
 * Covers:
 *   - Generator 12-token per-verse cap (eligible/excluded verses)
 *   - correctAnswer = verse tokens concatenated surface
 *   - All-verses-over-cap edge case (zero questions emitted, no throw)
 *   - Session store: initSentenceOrder + moveToAnswer + moveToPool UUID preservation
 *   - Reload-safety: initSentenceOrder is a no-op when a pool already exists
 *
 * jsdom environment required for crypto.randomUUID() in initSentenceOrder.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  buildQuestions,
  SENTENCE_ORDER_TOKEN_CAP,
} from "../generator";
import { useExerciseSession } from "@/stores/exerciseSession";
import type { Lesson, VocabEntry, Verse, Token } from "@/lib/types/lesson";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeToken(surface: string): Token {
  return {
    surface,
    reading: surface,
    romaji: surface,
    grammar: "noun",
    grammar_color: "blue",
    meaning: `meaning_${surface}`,
    jlpt_level: "N5",
  };
}

function makeVerse(verseNumber: number, tokenCount: number, startMs = 1000): Verse {
  return {
    verse_number: verseNumber,
    start_time_ms: startMs,
    end_time_ms: startMs + 5000,
    tokens: Array.from({ length: tokenCount }, (_, i) => makeToken(`t${verseNumber}_${i}`)),
    translations: { en: `translation v${verseNumber}` },
    literal_meaning: `literal v${verseNumber}`,
  };
}

function makeVocabEntry(surface: string): VocabEntry {
  return {
    surface,
    reading: surface,
    romaji: `romaji_${surface}`,
    part_of_speech: "noun",
    jlpt_level: "N5",
    meaning: `meaning_${surface}`,
    example_from_song: "",
    additional_examples: [],
    vocab_item_id: `uuid-${surface}`,
  };
}

function makeLesson(verses: Verse[], vocabulary: VocabEntry[] = []): Lesson {
  return {
    jlpt_level: "N5",
    difficulty_tier: "basic",
    verses,
    vocabulary,
    grammar_points: [],
  };
}

// Minimal vocab fixture — 3 entries so the fill_lyric gate doesn't trip and
// add noise to the sentence_order-focused assertions.
const MIN_VOCAB: VocabEntry[] = [
  makeVocabEntry("空"),
  makeVocabEntry("海"),
  makeVocabEntry("火"),
];
const EMPTY_JLPT_POOL: VocabEntry[] = [];

// ---------------------------------------------------------------------------
// Generator tests
// ---------------------------------------------------------------------------

describe("buildQuestions — sentence_order (Phase 10 Plan 05)", () => {
  it("cap is locked at 12 tokens", () => {
    expect(SENTENCE_ORDER_TOKEN_CAP).toBe(12);
  });

  it("emits one sentence_order question per verse with <=12 tokens (excludes over-cap)", () => {
    // Mixed: 5, 10, 14, 20 tokens → 2 eligible (5 and 10)
    const verses = [
      makeVerse(1, 5, 1000),
      makeVerse(2, 10, 7000),
      makeVerse(3, 14, 13000),
      makeVerse(4, 20, 20000),
    ];
    const lesson = makeLesson(verses, MIN_VOCAB);
    const questions = buildQuestions(lesson, "full", EMPTY_JLPT_POOL);

    const sentenceOrder = questions.filter((q) => q.type === "sentence_order");
    expect(sentenceOrder).toHaveLength(2);
    const eligibleVerseNumbers = sentenceOrder
      .map((q) => q.verseRef?.verseNumber)
      .sort();
    expect(eligibleVerseNumbers).toEqual([1, 2]);
  });

  it("emits zero sentence_order questions when every verse exceeds the cap", () => {
    const verses = [makeVerse(1, 13), makeVerse(2, 20), makeVerse(3, 50)];
    const lesson = makeLesson(verses, MIN_VOCAB);
    const questions = buildQuestions(lesson, "full", EMPTY_JLPT_POOL);

    const sentenceOrder = questions.filter((q) => q.type === "sentence_order");
    expect(sentenceOrder).toHaveLength(0);
  });

  it("boundary: a verse with exactly 12 tokens IS eligible (<=, not <)", () => {
    const verses = [makeVerse(1, 12)];
    const lesson = makeLesson(verses, MIN_VOCAB);
    const questions = buildQuestions(lesson, "full", EMPTY_JLPT_POOL);

    const sentenceOrder = questions.filter((q) => q.type === "sentence_order");
    expect(sentenceOrder).toHaveLength(1);
  });

  it("correctAnswer equals the verse's token surfaces concatenated in original order", () => {
    const verse = makeVerse(1, 6);
    const expected = verse.tokens.map((t) => t.surface).join("");
    const lesson = makeLesson([verse], MIN_VOCAB);
    const questions = buildQuestions(lesson, "full", EMPTY_JLPT_POOL);

    const q = questions.find((q) => q.type === "sentence_order");
    expect(q).toBeDefined();
    expect(q!.correctAnswer).toBe(expected);
  });

  it("populates verseTokens with the full token array (not a copy subset)", () => {
    const verse = makeVerse(1, 7);
    const lesson = makeLesson([verse], MIN_VOCAB);
    const questions = buildQuestions(lesson, "full", EMPTY_JLPT_POOL);

    const q = questions.find((q) => q.type === "sentence_order");
    expect(q?.verseTokens).toBeDefined();
    expect(q!.verseTokens).toHaveLength(7);
    expect(q!.verseTokens!.map((t) => t.surface)).toEqual(
      verse.tokens.map((t) => t.surface)
    );
  });

  it("populates translation from verse.translations.en when present", () => {
    const verse = makeVerse(1, 5);
    const lesson = makeLesson([verse], MIN_VOCAB);
    const questions = buildQuestions(lesson, "full", EMPTY_JLPT_POOL);

    const q = questions.find((q) => q.type === "sentence_order");
    expect(q?.translation).toBe("translation v1");
  });

  it("empty options: sentence_order has no distractors (tap-to-build has no 4-option structure)", () => {
    const verse = makeVerse(1, 5);
    const lesson = makeLesson([verse], MIN_VOCAB);
    const questions = buildQuestions(lesson, "full", EMPTY_JLPT_POOL);

    const q = questions.find((q) => q.type === "sentence_order");
    expect(q?.distractors).toEqual([]);
  });

  it("skips verses with zero tokens (defensive against malformed lesson data)", () => {
    const verse = { ...makeVerse(1, 0), tokens: [] as Token[] };
    const lesson = makeLesson([verse], MIN_VOCAB);
    const questions = buildQuestions(lesson, "full", EMPTY_JLPT_POOL);

    const sentenceOrder = questions.filter((q) => q.type === "sentence_order");
    expect(sentenceOrder).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Session store tests
// ---------------------------------------------------------------------------

describe("exerciseSession store — sentence_order slices (Phase 10 Plan 05)", () => {
  beforeEach(() => {
    // Reset the store to initialState between tests.
    useExerciseSession.getState().clearSession();
  });

  it("initSentenceOrder stamps UUIDs and shuffles (pool length matches, answer empty)", () => {
    const questionId = "q1";
    const verseTokens = Array.from({ length: 5 }, (_, i) => makeToken(`w${i}`));
    useExerciseSession.getState().initSentenceOrder(questionId, verseTokens);

    const s = useExerciseSession.getState();
    const pool = s.sentenceOrderPool[questionId];
    expect(pool).toBeDefined();
    expect(pool).toHaveLength(5);
    // Each token has a UUID and a surface
    for (const t of pool) {
      expect(typeof t.uuid).toBe("string");
      expect(t.uuid).toMatch(/^[0-9a-f-]{36}$/i);
      expect(typeof t.surface).toBe("string");
    }
    // UUIDs are unique
    const uuids = new Set(pool.map((t) => t.uuid));
    expect(uuids.size).toBe(5);
    // Answer row starts empty
    expect(s.sentenceOrderAnswer[questionId]).toEqual([]);
  });

  it("moveToAnswer moves a token from pool to answer (order = append)", () => {
    const questionId = "q2";
    const verseTokens = [makeToken("a"), makeToken("b"), makeToken("c")];
    useExerciseSession.getState().initSentenceOrder(questionId, verseTokens);

    const poolBefore = useExerciseSession.getState().sentenceOrderPool[questionId];
    const first = poolBefore[0];
    const second = poolBefore[1];

    useExerciseSession.getState().moveToAnswer(questionId, first.uuid);
    useExerciseSession.getState().moveToAnswer(questionId, second.uuid);

    const s = useExerciseSession.getState();
    expect(s.sentenceOrderPool[questionId]).toHaveLength(1);
    expect(s.sentenceOrderAnswer[questionId]).toHaveLength(2);
    expect(s.sentenceOrderAnswer[questionId][0].uuid).toBe(first.uuid);
    expect(s.sentenceOrderAnswer[questionId][1].uuid).toBe(second.uuid);
    // UUIDs preserved across moves
    expect(s.sentenceOrderAnswer[questionId][0].surface).toBe(first.surface);
  });

  it("moveToPool returns a token from answer to pool (UUID preserved)", () => {
    const questionId = "q3";
    const verseTokens = [makeToken("x"), makeToken("y")];
    useExerciseSession.getState().initSentenceOrder(questionId, verseTokens);

    const pool = useExerciseSession.getState().sentenceOrderPool[questionId];
    const tokenA = pool[0];
    const tokenB = pool[1];
    useExerciseSession.getState().moveToAnswer(questionId, tokenA.uuid);
    useExerciseSession.getState().moveToAnswer(questionId, tokenB.uuid);

    // Now answer = [A, B], pool = []. Move A back.
    useExerciseSession.getState().moveToPool(questionId, tokenA.uuid);

    const s = useExerciseSession.getState();
    expect(s.sentenceOrderPool[questionId]).toHaveLength(1);
    expect(s.sentenceOrderPool[questionId][0].uuid).toBe(tokenA.uuid);
    expect(s.sentenceOrderAnswer[questionId]).toHaveLength(1);
    expect(s.sentenceOrderAnswer[questionId][0].uuid).toBe(tokenB.uuid);
  });

  it("moveToAnswer is a no-op when uuid is not in the pool", () => {
    const questionId = "q4";
    useExerciseSession.getState().initSentenceOrder(questionId, [makeToken("z")]);
    const before = useExerciseSession.getState().sentenceOrderPool[questionId];
    useExerciseSession.getState().moveToAnswer(questionId, "nonexistent-uuid");
    const after = useExerciseSession.getState().sentenceOrderPool[questionId];
    expect(after).toEqual(before);
    expect(useExerciseSession.getState().sentenceOrderAnswer[questionId]).toEqual([]);
  });

  it("initSentenceOrder is a no-op when a pool already exists (reload-safety)", () => {
    const questionId = "q5";
    useExerciseSession
      .getState()
      .initSentenceOrder(questionId, [makeToken("a"), makeToken("b")]);
    const firstPool = useExerciseSession.getState().sentenceOrderPool[questionId];

    // Try to re-init with different tokens — should preserve firstPool
    useExerciseSession
      .getState()
      .initSentenceOrder(questionId, [makeToken("x"), makeToken("y"), makeToken("z")]);

    const secondPool = useExerciseSession.getState().sentenceOrderPool[questionId];
    expect(secondPool).toEqual(firstPool);
  });

  it("showHint sets sentenceOrderHintShown[questionId] = true (one-way)", () => {
    const questionId = "q6";
    useExerciseSession.getState().showHint(questionId);
    expect(useExerciseSession.getState().sentenceOrderHintShown[questionId]).toBe(true);
    // Second call is idempotent
    useExerciseSession.getState().showHint(questionId);
    expect(useExerciseSession.getState().sentenceOrderHintShown[questionId]).toBe(true);
  });

  it("startSession resets sentence_order slices (no cross-session bleed)", () => {
    const questionId = "q7";
    useExerciseSession.getState().initSentenceOrder(questionId, [makeToken("a")]);
    useExerciseSession.getState().showHint(questionId);
    expect(
      useExerciseSession.getState().sentenceOrderPool[questionId]
    ).toBeDefined();

    useExerciseSession.getState().startSession("new-song-id", [], "short");

    const s = useExerciseSession.getState();
    expect(s.sentenceOrderPool).toEqual({});
    expect(s.sentenceOrderAnswer).toEqual({});
    expect(s.sentenceOrderHintShown).toEqual({});
  });
});
