/**
 * tests/integration/save-session-results.test.ts
 *
 * Integration test for `src/app/actions/exercises.ts::saveSessionResults` —
 * locks the upsert semantics that the entire star/progress UI relies on:
 *
 *   - First call inserts a fresh user_song_progress row
 *   - GREATEST keeps the BEST accuracy across calls (lower call never regresses it)
 *   - LEAST(100) caps completion_pct at 100
 *   - sessions_completed increments on every call
 *   - Stars are derived at read time (deriveStars), reflecting the GREATEST values
 *   - Unknown exercise types are silently dropped from accuracy aggregation
 *     (filter-based contract — neither thrown nor counted)
 *
 * Hermeticism:
 *   - beforeAll: pick any seeded songVersionId
 *   - beforeEach: resetTestProgress(TEST_USER_ID)
 *   - afterAll : resetTestProgress(TEST_USER_ID) — leaves the test user spotless
 *
 * Env requirement:
 *   - TEST_DATABASE_URL must be set (DB redirect happens in tests/integration/setup.ts)
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { saveSessionResults } from "@/app/actions/exercises";
import {
  getTestDb,
  resetTestProgress,
  TEST_USER_ID,
} from "../support/test-db";

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;

interface ProgressRow {
  user_id: string;
  song_version_id: string;
  completion_pct: number;
  ex1_2_3_best_accuracy: number | null;
  ex4_best_accuracy: number | null;
  sessions_completed: number;
}

async function fetchProgress(songVersionId: string): Promise<ProgressRow | null> {
  const db = getTestDb();
  const raw = (await db.execute(sql`
    SELECT user_id,
           song_version_id::text AS song_version_id,
           completion_pct,
           ex1_2_3_best_accuracy,
           ex4_best_accuracy,
           sessions_completed
      FROM user_song_progress
     WHERE user_id = ${TEST_USER_ID}
       AND song_version_id = ${songVersionId}::uuid
     LIMIT 1
  `)) as unknown as ProgressRow[] | { rows: ProgressRow[] };
  const rows = Array.isArray(raw) ? raw : (raw.rows ?? []);
  return rows[0] ?? null;
}

describeIfTestDb("saveSessionResults", () => {
  let songVersionId: string;

  beforeAll(async () => {
    // Pick any seeded song_versions row that has lesson data — saveSessionResults
    // does not actually consume the lesson, but using a real id keeps the FK
    // constraint happy and lines up with how the app calls it.
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
        "[save-session-results.test] No song_versions row with lesson IS NOT NULL " +
          "found in TEST_DATABASE_URL. Run `npm run seed:dev` first."
      );
    }
    songVersionId = rows[0].id;
  });

  beforeEach(async () => {
    await resetTestProgress(TEST_USER_ID);
  });

  afterAll(async () => {
    await resetTestProgress(TEST_USER_ID);
  });

  it("first call: all-correct vocab + fill_lyric → stars=2, completion=15", async () => {
    const result = await saveSessionResults({
      userId: TEST_USER_ID,
      songVersionId,
      mode: "short",
      durationMs: 60_000,
      answers: [
        { questionId: "q1", type: "vocab_meaning", chosen: "a", correct: true, timeMs: 1000 },
        { questionId: "q2", type: "meaning_vocab", chosen: "b", correct: true, timeMs: 1000 },
        { questionId: "q3", type: "reading_match", chosen: "c", correct: true, timeMs: 1000 },
        { questionId: "q4", type: "fill_lyric", chosen: "d", correct: true, timeMs: 1000 },
      ],
    });

    expect(result.stars).toBe(2);
    expect(result.previousStars).toBe(0);
    expect(result.completionPct).toBe(15);

    const row = await fetchProgress(songVersionId);
    expect(row).not.toBeNull();
    expect(row!.ex1_2_3_best_accuracy).toBe(1);
    expect(row!.ex4_best_accuracy).toBe(1);
    expect(row!.sessions_completed).toBe(1);
    expect(row!.completion_pct).toBe(15);
  });

  it("second call with LOWER accuracy: GREATEST keeps prior best, sessions++, completion=30", async () => {
    // First: perfect run.
    await saveSessionResults({
      userId: TEST_USER_ID,
      songVersionId,
      mode: "short",
      durationMs: 60_000,
      answers: [
        { questionId: "q1", type: "vocab_meaning", chosen: "a", correct: true, timeMs: 1000 },
        { questionId: "q2", type: "meaning_vocab", chosen: "b", correct: true, timeMs: 1000 },
        { questionId: "q4", type: "fill_lyric", chosen: "d", correct: true, timeMs: 1000 },
      ],
    });

    // Second: 50% on each group — must NOT lower the stored best accuracy.
    const result = await saveSessionResults({
      userId: TEST_USER_ID,
      songVersionId,
      mode: "short",
      durationMs: 60_000,
      answers: [
        { questionId: "q1", type: "vocab_meaning", chosen: "x", correct: false, timeMs: 1000 },
        { questionId: "q2", type: "vocab_meaning", chosen: "a", correct: true, timeMs: 1000 },
        { questionId: "q4", type: "fill_lyric", chosen: "x", correct: false, timeMs: 1000 },
        { questionId: "q5", type: "fill_lyric", chosen: "d", correct: true, timeMs: 1000 },
      ],
    });

    // Stars must NOT regress because GREATEST kept the 1.0 from the first call.
    expect(result.stars).toBe(2);
    expect(result.previousStars).toBe(2);
    expect(result.completionPct).toBe(30);

    const row = await fetchProgress(songVersionId);
    expect(row!.ex1_2_3_best_accuracy).toBe(1);
    expect(row!.ex4_best_accuracy).toBe(1);
    expect(row!.sessions_completed).toBe(2);
    expect(row!.completion_pct).toBe(30);
  });

  it("first call with ONLY ex1_2_3 answers (no fill_lyric) → stars=1, ex4=NULL", async () => {
    const result = await saveSessionResults({
      userId: TEST_USER_ID,
      songVersionId,
      mode: "short",
      durationMs: 60_000,
      answers: [
        { questionId: "q1", type: "vocab_meaning", chosen: "a", correct: true, timeMs: 1000 },
        { questionId: "q2", type: "meaning_vocab", chosen: "b", correct: true, timeMs: 1000 },
      ],
    });

    expect(result.stars).toBe(1);
    expect(result.previousStars).toBe(0);

    const row = await fetchProgress(songVersionId);
    expect(row!.ex1_2_3_best_accuracy).toBe(1);
    expect(row!.ex4_best_accuracy).toBeNull();
  });

  it("second call adds 90% fill_lyric → stars 1→2, previousStars=1, ex4=0.9", async () => {
    // First: only ex1_2_3 (perfect) — earns 1 star.
    await saveSessionResults({
      userId: TEST_USER_ID,
      songVersionId,
      mode: "short",
      durationMs: 60_000,
      answers: [
        { questionId: "q1", type: "vocab_meaning", chosen: "a", correct: true, timeMs: 1000 },
      ],
    });

    // Second: 9 of 10 fill_lyric correct → 0.9 accuracy → second star unlocks.
    const fillAnswers = Array.from({ length: 10 }, (_, i) => ({
      questionId: `f${i}`,
      type: "fill_lyric" as const,
      chosen: i < 9 ? "right" : "wrong",
      correct: i < 9,
      timeMs: 1000,
    }));

    const result = await saveSessionResults({
      userId: TEST_USER_ID,
      songVersionId,
      mode: "short",
      durationMs: 60_000,
      answers: fillAnswers,
    });

    expect(result.stars).toBe(2);
    expect(result.previousStars).toBe(1);

    const row = await fetchProgress(songVersionId);
    expect(row!.ex1_2_3_best_accuracy).toBe(1);
    // Floating-point — assert with closeTo to dodge 0.9 representation noise.
    expect(row!.ex4_best_accuracy).toBeCloseTo(0.9, 5);
  });

  it("mode=full: completion_pct increments by 30 per call and caps at 100", async () => {
    const baseAnswer = {
      questionId: "q1",
      type: "vocab_meaning" as const,
      chosen: "a",
      correct: true,
      timeMs: 1000,
    };

    // 1st call: 30
    let result = await saveSessionResults({
      userId: TEST_USER_ID,
      songVersionId,
      mode: "full",
      durationMs: 60_000,
      answers: [baseAnswer],
    });
    expect(result.completionPct).toBe(30);

    // 2nd call: 60
    result = await saveSessionResults({
      userId: TEST_USER_ID,
      songVersionId,
      mode: "full",
      durationMs: 60_000,
      answers: [baseAnswer],
    });
    expect(result.completionPct).toBe(60);

    // 3rd call: 90
    result = await saveSessionResults({
      userId: TEST_USER_ID,
      songVersionId,
      mode: "full",
      durationMs: 60_000,
      answers: [baseAnswer],
    });
    expect(result.completionPct).toBe(90);

    // 4th call: would be 120 — cap to 100.
    result = await saveSessionResults({
      userId: TEST_USER_ID,
      songVersionId,
      mode: "full",
      durationMs: 60_000,
      answers: [baseAnswer],
    });
    expect(result.completionPct).toBe(100);

    // 5th call: stays at 100.
    result = await saveSessionResults({
      userId: TEST_USER_ID,
      songVersionId,
      mode: "full",
      durationMs: 60_000,
      answers: [baseAnswer],
    });
    expect(result.completionPct).toBe(100);
  });

  it("unknown exercise types are silently dropped (no throw, not counted)", async () => {
    // Mixed batch: one unknown-type answer + one valid vocab_meaning answer.
    // Only the vocab_meaning entry should affect the stored accuracy.
    // We deliberately bypass the AnswerRecord.type compile-time check via `as any`
    // because the contract under test is RUNTIME behavior for unrecognised strings
    // arriving from a future exercise type or a malformed client payload.
    const mixed = [
      {
        questionId: "qg",
        type: "grammar_conjugation" as unknown as "vocab_meaning",
        chosen: "x",
        correct: true,
        timeMs: 1000,
      },
      {
        questionId: "q1",
        type: "vocab_meaning" as const,
        chosen: "a",
        correct: true,
        timeMs: 1000,
      },
    ];

    const result = await saveSessionResults({
      userId: TEST_USER_ID,
      songVersionId,
      mode: "short",
      durationMs: 60_000,
      answers: mixed,
    });

    // The unknown row was filtered out of BOTH groups; only the vocab_meaning
    // counted toward ex1_2_3, so accuracy is 1.0 → stars 1, ex4 untouched.
    expect(result.stars).toBe(1);
    expect(result.previousStars).toBe(0);
    expect(result.completionPct).toBe(15);

    const row = await fetchProgress(songVersionId);
    expect(row!.ex1_2_3_best_accuracy).toBe(1);
    expect(row!.ex4_best_accuracy).toBeNull();
    expect(row!.sessions_completed).toBe(1);

    // Reset for the all-unknown subcase.
    await resetTestProgress(TEST_USER_ID);

    // ONLY unknown-type answers → both group accuracies stay NULL, stars=0,
    // but the row still gets inserted (sessions_completed=1, completion_pct=15).
    const onlyUnknown = await saveSessionResults({
      userId: TEST_USER_ID,
      songVersionId,
      mode: "short",
      durationMs: 60_000,
      answers: [
        {
          questionId: "qg",
          type: "grammar_conjugation" as unknown as "vocab_meaning",
          chosen: "x",
          correct: true,
          timeMs: 1000,
        },
        {
          questionId: "ql",
          type: "listening_drill" as unknown as "vocab_meaning",
          chosen: "y",
          correct: true,
          timeMs: 1000,
        },
        {
          questionId: "qe",
          type: "" as unknown as "vocab_meaning",
          chosen: "z",
          correct: false,
          timeMs: 1000,
        },
      ],
    });

    expect(onlyUnknown.stars).toBe(0);
    expect(onlyUnknown.previousStars).toBe(0);
    expect(onlyUnknown.completionPct).toBe(15);

    const onlyUnknownRow = await fetchProgress(songVersionId);
    expect(onlyUnknownRow!.ex1_2_3_best_accuracy).toBeNull();
    expect(onlyUnknownRow!.ex4_best_accuracy).toBeNull();
    expect(onlyUnknownRow!.sessions_completed).toBe(1);
  });
});
