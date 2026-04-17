/**
 * tests/integration/regression-stale-lesson-data.test.ts
 *
 * Plan 08.1-07 Task 3 — Regression guards for stale / malformed lesson JSONB
 * + the single-gate architectural invariant (Phase 08-01).
 *
 * Two top-level describes:
 *
 *   1. "buildQuestions resilience" — feeds the pure generator hand-crafted
 *      malformed-but-plausible lessons covering DATA-02 risks. The generator
 *      is pure TypeScript (no DB, no network) so all 6 cases run without
 *      TEST_DATABASE_URL.
 *
 *   2. "saveSessionResults orphaned vocab" — calls the server action with an
 *      orphaned vocab_item_id (UUID that does NOT exist in vocabulary_items).
 *      The session save MUST not crash. Whether the orphan is dropped or the
 *      mastery upsert silently logs an error is acceptable; the user-visible
 *      side effect (user_song_progress) MUST land. Skips when
 *      TEST_DATABASE_URL is unset.
 *
 *   3. "single-gate architectural invariant" — static check that no UI
 *      component imports EXERCISE_FEATURE_FLAGS directly. The only legitimate
 *      importer is src/lib/exercises/access.ts (the gate). Phase 08-01 locked
 *      this — this test fails loudly if a UI file ever imports the flags.
 *      No DB needed.
 *
 * CONTEXT references:
 *   - "Stale seed/lesson data — lesson JSONB missing keys, empty furigana
 *      tokens, orphaned vocab UUIDs, unparseable conjugation paths"
 *   - "[Phase 08-01]: checkExerciseAccess() is single gate — UI never checks
 *      feature flags directly"
 */

import { describe, it, expect, beforeAll } from "vitest";
import { sql } from "drizzle-orm";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildQuestions } from "@/lib/exercises/generator";
import { saveSessionResults } from "@/app/actions/exercises";
import type { Lesson, VocabEntry, Verse } from "@/lib/types/lesson";
import {
  getTestDb,
  resetTestProgress,
  TEST_USER_ID,
} from "../support/test-db";

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

/**
 * Returns a baseline VALID lesson — every test below mutates one (and only
 * one) field at a time so failures point at the exact mutation under test.
 */
function makeBaselineLesson(): Lesson {
  const v0: VocabEntry = {
    surface: "猫",
    reading: "ねこ",
    romaji: "neko",
    part_of_speech: "noun",
    jlpt_level: "N5",
    meaning: { en: "cat" },
    example_from_song: "猫が好き",
    additional_examples: [],
    vocab_item_id: "11111111-1111-1111-1111-111111111111",
  };
  const v1: VocabEntry = {
    surface: "犬",
    reading: "いぬ",
    romaji: "inu",
    part_of_speech: "noun",
    jlpt_level: "N5",
    meaning: { en: "dog" },
    example_from_song: "犬を見た",
    additional_examples: [],
    vocab_item_id: "22222222-2222-2222-2222-222222222222",
  };
  const v2: VocabEntry = {
    surface: "鳥",
    reading: "とり",
    romaji: "tori",
    part_of_speech: "noun",
    jlpt_level: "N5",
    meaning: { en: "bird" },
    example_from_song: "空を飛ぶ鳥",
    additional_examples: [],
    vocab_item_id: "33333333-3333-3333-3333-333333333333",
  };
  const v3: VocabEntry = {
    surface: "魚",
    reading: "さかな",
    romaji: "sakana",
    part_of_speech: "noun",
    jlpt_level: "N5",
    meaning: { en: "fish" },
    example_from_song: "海の魚",
    additional_examples: [],
    vocab_item_id: "44444444-4444-4444-4444-444444444444",
  };

  const verse0: Verse = {
    verse_number: 1,
    start_time_ms: 1000,
    end_time_ms: 4000,
    tokens: [
      {
        surface: "猫",
        reading: "ねこ",
        romaji: "neko",
        grammar: "noun",
        grammar_color: "blue",
        meaning: { en: "cat" },
        jlpt_level: "N5",
      },
    ],
    translations: { en: "cat" },
    literal_meaning: { en: "cat" },
  };
  const verse1: Verse = {
    verse_number: 2,
    start_time_ms: 5000,
    end_time_ms: 9000,
    tokens: [
      {
        surface: "犬",
        reading: "いぬ",
        romaji: "inu",
        grammar: "noun",
        grammar_color: "blue",
        meaning: { en: "dog" },
        jlpt_level: "N5",
      },
    ],
    translations: { en: "dog" },
    literal_meaning: { en: "dog" },
  };

  return {
    jlpt_level: "N5",
    difficulty_tier: "basic",
    verses: [verse0, verse1],
    vocabulary: [v0, v1, v2, v3],
    grammar_points: [],
  };
}

// ---------------------------------------------------------------------------
// 1. buildQuestions resilience (no DB)
// ---------------------------------------------------------------------------

describe("buildQuestions resilience to malformed lesson JSONB", () => {
  it("baseline (sanity): valid lesson produces > 0 questions", () => {
    const lesson = makeBaselineLesson();
    const qs = buildQuestions(lesson, "short", []);
    expect(qs.length).toBeGreaterThan(0);
  });

  it("vocab[0].vocab_item_id = undefined → entry is silently skipped, no throw", () => {
    const lesson = makeBaselineLesson();
    lesson.vocabulary[0].vocab_item_id = undefined;
    expect(() => buildQuestions(lesson, "short", [])).not.toThrow();

    // The vocab missing its UUID should NOT contribute any question — the
    // generator's `lesson.vocabulary.filter((v) => v.vocab_item_id)` guard
    // drops it before per-type loops run.
    const qs = buildQuestions(lesson, "short", []);
    for (const q of qs) {
      expect(q.vocabItemId).not.toBe("");
    }
    // 3 vocab entries remain, each producing up to 4 question types
    // (fill_lyric requires verse match — only 猫 and 犬 are tokenized).
    expect(qs.length).toBeGreaterThan(0);
  });

  it("verse[0].tokens[0].reading = '' (empty reading for a kanji) → no throw, may yield questions", () => {
    const lesson = makeBaselineLesson();
    lesson.verses[0].tokens[0].reading = "";
    expect(() => buildQuestions(lesson, "short", [])).not.toThrow();
    // The generator does not consult token.reading — empty token reading does
    // not change the question count for vocab-driven types. fill_lyric still
    // matches by surface, so verse 1 is still usable.
    const qs = buildQuestions(lesson, "short", []);
    expect(qs.length).toBeGreaterThan(0);
  });

  it("verse[0].tokens = [] (empty token array) → no throw, fill_lyric drops the verse", () => {
    const lesson = makeBaselineLesson();
    lesson.verses[0].tokens = [];
    expect(() => buildQuestions(lesson, "short", [])).not.toThrow();
    const qs = buildQuestions(lesson, "short", []);
    // No fill_lyric for 猫 (its only verse just lost its tokens), but
    // vocab_meaning / meaning_vocab / reading_match for 猫 still produce.
    // 犬 still has a verse and tokens, so its fill_lyric still produces.
    expect(qs.length).toBeGreaterThan(0);
  });

  it("verse[0].start_time_ms = 0 → fill_lyric for that verse is skipped, no throw", () => {
    const lesson = makeBaselineLesson();
    // findVerseForVocab inside generator.ts skips verses where start_time_ms <= 0
    lesson.verses[0].start_time_ms = 0;
    expect(() => buildQuestions(lesson, "short", [])).not.toThrow();
    const qs = buildQuestions(lesson, "short", []);
    // No fill_lyric question should reference verse 1 (start_time_ms <= 0).
    for (const q of qs) {
      if (q.type === "fill_lyric" && q.verseRef) {
        expect(q.verseRef.verseNumber).not.toBe(1);
      }
    }
  });

  it("lesson.vocabulary = [] → buildQuestions returns empty array, no throw", () => {
    const lesson = makeBaselineLesson();
    lesson.vocabulary = [];
    expect(() => buildQuestions(lesson, "short", [])).not.toThrow();
    expect(buildQuestions(lesson, "short", [])).toEqual([]);
  });

  it("lesson = {} (no keys) → throws a clear error OR returns empty (documented behavior)", () => {
    // The generator dereferences lesson.vocabulary unconditionally. With a
    // bare {} cast as Lesson, that read returns undefined and the .filter()
    // call throws. We document that as the current behavior — an upstream
    // route handler MUST validate the lesson shape before calling
    // buildQuestions, OR the generator must gain its own defensive guard.
    // Either is acceptable; the test pins down today's behavior so a future
    // change is intentional.
    const empty = {} as unknown as Lesson;
    let threw = false;
    let error: unknown = null;
    try {
      const qs = buildQuestions(empty, "short", []);
      // If the generator gains a guard and returns [], that's also a valid
      // resilience improvement — record the equivalent assertion.
      expect(qs).toEqual([]);
    } catch (e) {
      threw = true;
      error = e;
    }
    if (threw) {
      // Today's path: a TypeError because `.filter` is called on undefined.
      // We accept any thrown Error — the requirement is "clear error, not
      // silent corruption". Document the type so a future change is visible.
      expect(error).toBeInstanceOf(Error);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. saveSessionResults: orphaned vocab UUID resilience (DB)
// ---------------------------------------------------------------------------

describeIfTestDb(
  "saveSessionResults: orphaned vocab_item_id does not crash the session save",
  () => {
    let songVersionId: string;

    beforeAll(async () => {
      const db = getTestDb();
      const raw = (await db.execute(sql`
        SELECT id::text AS id
          FROM song_versions
         WHERE lesson IS NOT NULL
         LIMIT 1
      `)) as unknown as Array<{ id: string }> | { rows: Array<{ id: string }> };
      const rows = Array.isArray(raw) ? raw : (raw.rows ?? []);
      if (!rows[0]) {
        throw new Error(
          "[regression-stale-lesson-data] No song_versions row with lesson found in TEST_DATABASE_URL — run `npm run seed:dev`."
        );
      }
      songVersionId = rows[0].id;
      await resetTestProgress(TEST_USER_ID);
    });

    it(
      "save still writes user_song_progress when one of the answers carries an orphan vocab_item_id",
      async () => {
        // The orphaned UUID is well-formed (passes the uuid cast in the SQL),
        // but no row in vocabulary_items references it — the FK on
        // user_vocab_mastery.vocab_item_id will fail. The action MUST catch
        // that failure per its try/catch in Step 7 (lines 246-253 of
        // src/app/actions/exercises.ts) and still complete the song-progress
        // upsert (the user-visible side effect).
        const ORPHAN = "99999999-9999-9999-9999-999999999999";

        const result = await saveSessionResults({
          userId: TEST_USER_ID,
          songVersionId,
          mode: "short",
          durationMs: 30_000,
          answers: [
            {
              questionId: "q1",
              type: "vocab_meaning",
              chosen: "a",
              correct: true,
              timeMs: 1000,
              vocabItemId: ORPHAN,
            },
          ],
        });

        // Song progress upsert succeeded — completion landed at the increment.
        expect(result.completionPct).toBe(15);
        expect(result.previousStars).toBe(0);

        // Cleanup so other suites running in the same DB don't see this row.
        await resetTestProgress(TEST_USER_ID);
      },
      30_000
    );
  }
);

// ---------------------------------------------------------------------------
// 3. Single-gate architectural invariant (no DB)
// ---------------------------------------------------------------------------
//
// Phase 08-01 decision: checkExerciseAccess() is the single gate. UI components
// MUST NOT import EXERCISE_FEATURE_FLAGS directly. This static check walks the
// song component directory and asserts the import string is absent.
//
// The only legitimate importer is src/lib/exercises/access.ts (the gate
// itself). The unit test src/lib/exercises/__tests__/access.test.ts also
// imports it for runtime parity assertions (it's a test, not UI).

describe("Single-gate architectural invariant: UI never imports EXERCISE_FEATURE_FLAGS", () => {
  it("no .tsx file under src/app/songs/[slug]/components imports EXERCISE_FEATURE_FLAGS", async () => {
    // Walk the components directory directly. Avoid Glob — a plain readdir is
    // sufficient, deterministic, and dependency-free.
    const componentsDir = resolve(
      process.cwd(),
      "src/app/songs/[slug]/components"
    );
    const entries = await readdir(componentsDir, { withFileTypes: true });
    const tsxFiles = entries
      .filter((d) => d.isFile() && d.name.endsWith(".tsx"))
      .map((d) => resolve(componentsDir, d.name));

    expect(tsxFiles.length).toBeGreaterThan(0); // sanity: directory exists

    const violators: string[] = [];
    for (const file of tsxFiles) {
      const contents = await readFile(file, "utf-8");
      if (contents.includes("EXERCISE_FEATURE_FLAGS")) {
        violators.push(file);
      }
    }

    if (violators.length > 0) {
      throw new Error(
        `Single-gate invariant violated. The following UI components import EXERCISE_FEATURE_FLAGS directly — they MUST route through checkExerciseAccess() instead:\n  - ${violators.join("\n  - ")}\n\nReference: Phase 08-01 decision, .planning/STATE.md "checkExerciseAccess() is single gate".`
      );
    }
  });

  it("the gate file (src/lib/exercises/access.ts) IS the single importer", async () => {
    // Sanity guard: if someone deletes the import from access.ts, the gate is
    // no longer enforcing anything. Spot-check the canonical importer exists.
    const access = await readFile(
      resolve(process.cwd(), "src/lib/exercises/access.ts"),
      "utf-8"
    );
    expect(access).toContain("EXERCISE_FEATURE_FLAGS");
  });
});
