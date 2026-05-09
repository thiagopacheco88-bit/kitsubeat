// Phase 11.6 Plan 05 GREEN — implementation landed in 11.6-05 (recordVocabAnswer extension).
/**
 * tests/integration/verse-domination-idempotent.test.ts
 *
 * SPEC-REQ-13: Per-verse domination state — tipping insert + ON CONFLICT no-op.
 * SPEC-REQ-15: Server returns `versesDominatedNow` flag on the tipping answer.
 *
 * GREEN after Plan 11.6-05:
 *   - drizzle/0017 migration applied (user_verse_domination table exists)
 *   - recordVocabAnswer accepts cardKind + returns versesDominatedNow: number[]
 *   - The verse-domination tipping logic is implemented
 */

import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
import { sql } from "drizzle-orm";
import { Pool } from "@neondatabase/serverless";
import { drizzle as drizzlePool } from "drizzle-orm/neon-serverless";
import { seedDualCardFixtures, teardownDualCardFixtures } from "./setup-card-kind";
import type { DualCardFixtures } from "./setup-card-kind";
import { recordVocabAnswer } from "@/app/actions/exercises";

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;

function unwrap<T = unknown>(r: unknown): T[] {
  return Array.isArray(r) ? (r as T[]) : ((r as { rows?: T[] }).rows ?? []);
}

describeIfTestDb("SPEC-REQ-13 + SPEC-REQ-15: verse domination idempotency", () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzlePool>;
  let fixtures: DualCardFixtures;
  const TEST_USER = "test-user-versedom-11-6";

  beforeEach(async () => {
    // Mock Clerk auth() so recordVocabAnswer derives userId from auth() server-side
    const { auth } = await import("@clerk/nextjs/server");
    vi.mocked(auth).mockResolvedValue({ userId: TEST_USER } as any);

    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL! });
    db = drizzlePool(pool);
    fixtures = await seedDualCardFixtures(db, TEST_USER);
    // Clean up prior state
    await db.execute(sql`
      DELETE FROM user_verse_domination WHERE user_id = ${TEST_USER}
    `).catch(() => {});
    await db.execute(sql`
      DELETE FROM user_vocab_mastery WHERE user_id = ${TEST_USER}
    `).catch(() => {});
  });

  afterAll(async () => {
    if (pool) {
      if (fixtures) {
        await db.execute(sql`
          DELETE FROM user_verse_domination WHERE user_id = ${TEST_USER}
        `).catch(() => {});
        await teardownDualCardFixtures(db, fixtures);
      }
      await db.execute(sql`
        DELETE FROM user_vocab_mastery WHERE user_id = ${TEST_USER}
      `).catch(() => {});
      await pool.end();
    }
  });

  it(
    "Test 1: answering 2 of 3 items in verse 2 correctly → NO row in user_verse_domination",
    async () => {
      // Verse 2 has: kanjiVocabId (vocab) + grammarPoint + kanjiVocabId (kanji card)
      // Per SPEC-REQ-13: verse dominated = every applicable item answered correctly ≥1 time
      // We answer only the vocab card (romaji_meaning) — not the grammar, not the kanji card

      await recordVocabAnswer({
        vocabItemId: fixtures.kanjiVocabId,
        songVersionId: fixtures.songVersionId,
        exerciseType: "vocab_meaning",
        correct: true,
        revealedReading: false,
        responseTimeMs: 1000,
        cardKind: "romaji_meaning",
      });

      const rows = unwrap<{ dominated_at: string }>(
        await db.execute(sql`
          SELECT dominated_at
          FROM user_verse_domination
          WHERE user_id = ${TEST_USER}
            AND song_version_id = ${fixtures.songVersionId}
            AND verse_number = 2
        `)
      );
      expect(rows).toHaveLength(0);
    }
  );

  it(
    "Test 2: tipping answer (all 3 items correct in verse 2) → versesDominatedNow includes 2 AND row exists in user_verse_domination",
    async () => {
      // Answer all required items for verse 2:
      //   kanjiVocabId romaji_meaning (vocab track)
      //   kanjiVocabId kanji_kana (kanji track — surface "飲む" has kanji)
      // Grammar point in verse 2 does NOT block domination in Phase 11.6
      // (no song_version_grammar_rules row for the lesson JSONB grammar point)

      const result1 = await recordVocabAnswer({
        vocabItemId: fixtures.kanjiVocabId,
        songVersionId: fixtures.songVersionId,
        exerciseType: "vocab_meaning",
        correct: true,
        revealedReading: false,
        responseTimeMs: 1000,
        cardKind: "romaji_meaning",
      });

      const result2 = await recordVocabAnswer({
        vocabItemId: fixtures.kanjiVocabId,
        songVersionId: fixtures.songVersionId,
        exerciseType: "vocab_meaning",
        correct: true,
        revealedReading: false,
        responseTimeMs: 1000,
        cardKind: "kanji_kana",
      });

      // Suppress unused var warning on result1
      void result1;

      // The last correct answer that tips verse 2 should return versesDominatedNow
      expect(result2.versesDominatedNow).toBeDefined();
      expect(result2.versesDominatedNow).toContain(2);

      // Verify DB row exists
      const rows = unwrap<{ dominated_at: string }>(
        await db.execute(sql`
          SELECT dominated_at
          FROM user_verse_domination
          WHERE user_id = ${TEST_USER}
            AND song_version_id = ${fixtures.songVersionId}
            AND verse_number = 2
        `)
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].dominated_at).toBeTruthy();
    }
  );

  it(
    "Test 3: re-answering after verse is dominated → versesDominatedNow is empty AND dominated_at is unchanged",
    async () => {
      // First dominate the verse
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
        correct: true,
        revealedReading: false,
        responseTimeMs: 1000,
        cardKind: "kanji_kana",
      });

      // Capture dominated_at timestamp
      const firstRows = unwrap<{ dominated_at: string }>(
        await db.execute(sql`
          SELECT dominated_at::text AS dominated_at
          FROM user_verse_domination
          WHERE user_id = ${TEST_USER}
            AND song_version_id = ${fixtures.songVersionId}
            AND verse_number = 2
        `)
      );
      const firstDominatedAt = firstRows[0]?.dominated_at;

      // Now re-answer one of the items
      const reResult = await recordVocabAnswer({
        vocabItemId: fixtures.kanjiVocabId,
        songVersionId: fixtures.songVersionId,
        exerciseType: "vocab_meaning",
        correct: true,
        revealedReading: false,
        responseTimeMs: 1000,
        cardKind: "romaji_meaning",
      });

      // versesDominatedNow must be empty (not re-dominating — ON CONFLICT DO NOTHING)
      expect(reResult.versesDominatedNow ?? []).toHaveLength(0);

      // dominated_at must be unchanged
      const reRows = unwrap<{ dominated_at: string }>(
        await db.execute(sql`
          SELECT dominated_at::text AS dominated_at
          FROM user_verse_domination
          WHERE user_id = ${TEST_USER}
            AND song_version_id = ${fixtures.songVersionId}
            AND verse_number = 2
        `)
      );
      expect(reRows[0].dominated_at).toBe(firstDominatedAt);
    }
  );
});
