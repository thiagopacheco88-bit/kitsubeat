// Phase 11.6 Wave 0 RED stub — implementation lands in 11.6-05 (recordVocabAnswer extension). DO NOT delete the failing assertions.
/**
 * tests/integration/record-vocab-answer-cardkind.test.ts
 *
 * SPEC-REQ-4: Dual FSRS cards per word.
 *
 * RED: These tests will fail until:
 *   - drizzle/0017 migration is applied (card_kind column exists on user_vocab_mastery)
 *   - recordVocabAnswer in src/app/actions/exercises.ts accepts a `cardKind` argument
 *
 * Failure modes expected at this stage:
 *   - TypeScript compile error: "cardKind" does not exist in RecordAnswerInput
 *   - OR runtime error: "column card_kind does not exist"
 */

import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
import { sql } from "drizzle-orm";
import { Pool } from "@neondatabase/serverless";
import { drizzle as drizzlePool } from "drizzle-orm/neon-serverless";
import { seedDualCardFixtures, teardownDualCardFixtures } from "./setup-card-kind";
import type { DualCardFixtures } from "./setup-card-kind";
// RED: recordVocabAnswer does not yet accept cardKind — import will compile but runtime will fail
import { recordVocabAnswer } from "@/app/actions/exercises";

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;

function unwrap<T = unknown>(r: unknown): T[] {
  return Array.isArray(r) ? (r as T[]) : ((r as { rows?: T[] }).rows ?? []);
}

describeIfTestDb("SPEC-REQ-4: dual FSRS cards per vocab item (cardKind branching)", () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzlePool>;
  let fixtures: DualCardFixtures;
  const TEST_USER = "test-user-cardkind-11-6";

  beforeEach(async () => {
    // Mock Clerk auth() so recordVocabAnswer derives userId from auth() server-side
    const { auth } = await import("@clerk/nextjs/server");
    vi.mocked(auth).mockResolvedValue({ userId: TEST_USER } as any);

    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL! });
    db = drizzlePool(pool);
    fixtures = await seedDualCardFixtures(db, TEST_USER);
    // Clean up any prior mastery rows for this user+vocab
    await db.execute(sql`
      DELETE FROM user_vocab_mastery
      WHERE user_id = ${TEST_USER}
        AND vocab_item_id = ${fixtures.kanjiVocabId}
    `);
  });

  afterAll(async () => {
    if (pool) {
      if (fixtures) {
        await teardownDualCardFixtures(db, fixtures);
      }
      await db.execute(sql`
        DELETE FROM user_vocab_mastery WHERE user_id = ${TEST_USER}
      `).catch(() => {});
      await pool.end();
    }
  });

  it(
    "Test 1: recording romaji_meaning and kanji_kana answers for the same vocab creates 2 distinct rows with diverged FSRS state",
    async () => {
      // GREEN (11.6-05): cardKind is now part of RecordAnswerInput
      await recordVocabAnswer({
        vocabItemId: fixtures.kanjiVocabId,
        songVersionId: fixtures.songVersionId,
        exerciseType: "vocab_meaning",
        correct: true,
        revealedReading: false,
        responseTimeMs: 1000,
        cardKind: "romaji_meaning",
      });

      await recordVocabAnswer({
        vocabItemId: fixtures.kanjiVocabId,
        songVersionId: fixtures.songVersionId,
        exerciseType: "vocab_meaning",
        correct: false,
        revealedReading: false,
        responseTimeMs: 1000,
        cardKind: "kanji_kana",
      });

      const rows = unwrap<{ card_kind: string; state: number; reps: number }>(
        await db.execute(sql`
          SELECT card_kind, state, reps
          FROM user_vocab_mastery
          WHERE user_id = ${TEST_USER}
            AND vocab_item_id = ${fixtures.kanjiVocabId}
          ORDER BY card_kind
        `)
      );

      // Expect 2 rows — one per card_kind
      expect(rows).toHaveLength(2);

      const romajiRow = rows.find(r => r.card_kind === "romaji_meaning");
      const kanjiRow = rows.find(r => r.card_kind === "kanji_kana");

      expect(romajiRow).toBeDefined();
      expect(kanjiRow).toBeDefined();

      // FSRS state should diverge: correct answer → state >= 1 (Learning); incorrect → state = 0 or reps differs
      expect(romajiRow!.reps).toBeGreaterThanOrEqual(1);
      expect(kanjiRow!.reps).toBeGreaterThanOrEqual(1);

      // States must differ (correct vs incorrect)
      expect(romajiRow!.state).not.toEqual(kanjiRow!.state);
    }
  );

  it(
    "Test 2: after migration wipe, zero user_vocab_mastery rows have card_kind IS NULL",
    async () => {
      const rows = unwrap<{ count: string }>(
        await db.execute(sql`
          SELECT count(*)::text AS count
          FROM user_vocab_mastery
          WHERE card_kind IS NULL
        `)
      );
      expect(parseInt(rows[0].count, 10)).toBe(0);
    }
  );
});
