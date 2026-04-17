/**
 * Integration test for recordVocabAnswer server action.
 *
 * Requires TEST_DATABASE_URL to be set (see tests/integration/setup.ts).
 * Protected by describe.skip guard when not available — follows the same
 * pattern established in Phase 08.1-03 integration tests.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;

describeIfTestDb("recordVocabAnswer", () => {
  // Use a unique userId per test run to avoid collisions with other runs
  const userId = `test-recordvocab-${Date.now()}`;
  let vocabItemId: string;
  let db: Awaited<typeof import("@/lib/db/index")>["db"];

  beforeAll(async () => {
    // Import db after setup.ts has swapped DATABASE_URL → TEST_DATABASE_URL
    const dbModule = await import("@/lib/db/index");
    db = dbModule.db;

    // Find a real vocab_item_id from the seeded DB
    const rows = await db.execute(
      sql`SELECT id FROM vocabulary_items LIMIT 1`
    );
    const raw = Array.isArray(rows)
      ? rows
      : ((rows as unknown as { rows?: { id: string }[] }).rows ?? []);
    const first = (raw[0] as { id: string } | undefined);
    if (!first?.id) {
      throw new Error("No vocabulary_items rows found — seed the test DB first");
    }
    vocabItemId = first.id;

    // Pre-clean any existing rows for this test user
    await db.execute(
      sql`DELETE FROM user_exercise_log WHERE user_id = ${userId}`
    );
    await db.execute(
      sql`DELETE FROM user_vocab_mastery WHERE user_id = ${userId}`
    );
  });

  afterAll(async () => {
    // Cleanup rows created during the test
    await db.execute(
      sql`DELETE FROM user_exercise_log WHERE user_id = ${userId}`
    );
    await db.execute(
      sql`DELETE FROM user_vocab_mastery WHERE user_id = ${userId}`
    );
  });

  it("happy path: records one log row + one mastery row, returns expected shape", async () => {
    const { recordVocabAnswer } = await import("../exercises");

    const result = await recordVocabAnswer({
      userId,
      vocabItemId,
      songVersionId: null,
      exerciseType: "vocab_meaning",
      correct: true,
      responseTimeMs: 1234,
    });

    // Return shape assertions
    expect(result.reps).toBe(1);
    expect(result.newState).toBeGreaterThanOrEqual(1); // new → learning after first answer
    expect([1, 2, 3]).toContain(result.newTier);
    const dueDate = new Date(result.due);
    // Due date should be parseable and in the future (or very close to now)
    expect(isNaN(dueDate.getTime())).toBe(false);

    // DB: exactly 1 log row
    const logRows = await db.execute(
      sql`SELECT * FROM user_exercise_log WHERE user_id = ${userId} AND vocab_item_id = ${vocabItemId}::uuid`
    );
    const logArr = Array.isArray(logRows)
      ? logRows
      : ((logRows as unknown as { rows?: unknown[] }).rows ?? []);
    expect(logArr).toHaveLength(1);

    // DB: exactly 1 mastery row
    const masteryRows = await db.execute(
      sql`SELECT * FROM user_vocab_mastery WHERE user_id = ${userId} AND vocab_item_id = ${vocabItemId}::uuid`
    );
    const masteryArr = Array.isArray(masteryRows)
      ? masteryRows
      : ((masteryRows as unknown as { rows?: unknown[] }).rows ?? []);
    expect(masteryArr).toHaveLength(1);
    const mastery = masteryArr[0] as Record<string, unknown>;
    expect(Number(mastery.reps)).toBe(1);
    expect(Number(mastery.state)).toBeGreaterThanOrEqual(1);
  });

  it("throws if vocabItemId is empty", async () => {
    const { recordVocabAnswer } = await import("../exercises");

    await expect(
      recordVocabAnswer({
        userId,
        vocabItemId: "",
        songVersionId: null,
        exerciseType: "vocab_meaning",
        correct: true,
        responseTimeMs: 500,
      })
    ).rejects.toThrow("vocabItemId must be a non-empty UUID");
  });

  it("second answer: reps increments to 2, mastery row count stays at 1", async () => {
    const { recordVocabAnswer } = await import("../exercises");

    const result = await recordVocabAnswer({
      userId,
      vocabItemId,
      songVersionId: null,
      exerciseType: "meaning_vocab",
      correct: true,
      responseTimeMs: 800,
    });

    expect(result.reps).toBe(2);

    // Still exactly 1 mastery row (upsert, not insert)
    const masteryRows = await db.execute(
      sql`SELECT * FROM user_vocab_mastery WHERE user_id = ${userId} AND vocab_item_id = ${vocabItemId}::uuid`
    );
    const masteryArr = Array.isArray(masteryRows)
      ? masteryRows
      : ((masteryRows as unknown as { rows?: unknown[] }).rows ?? []);
    expect(masteryArr).toHaveLength(1);

    // Now 2 log rows (one per call)
    const logRows = await db.execute(
      sql`SELECT * FROM user_exercise_log WHERE user_id = ${userId} AND vocab_item_id = ${vocabItemId}::uuid`
    );
    const logArr = Array.isArray(logRows)
      ? logRows
      : ((logRows as unknown as { rows?: unknown[] }).rows ?? []);
    expect(logArr).toHaveLength(2);
  });
});
