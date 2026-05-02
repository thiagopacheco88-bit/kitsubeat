// Phase 11.6 Wave 0 RED stub — implementation in Task 2.
/**
 * tests/integration/review-queue-dual-cards.test.ts
 *
 * SPEC-REQ-17: /review queue dual-card emission + shared daily cap.
 *
 * RED: These tests will fail until Task 2 lands:
 *   - DueCardInput / ReviewQueueItem carry card_kind
 *   - buildReviewQueue routes kanji_kana → vocab_typed
 *   - recordReviewAnswer accepts cardKind
 *   - getDueReviewQueue SELECT includes card_kind
 *
 * Failure modes expected at this stage:
 *   - TypeScript error: "card_kind does not exist on DueCardInput"
 *   - OR test assertion failures because queue items lack card_kind
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { Pool } from "@neondatabase/serverless";
import { drizzle as drizzlePool } from "drizzle-orm/neon-serverless";
import { seedDualCardFixtures, teardownDualCardFixtures } from "./setup-card-kind";
import type { DualCardFixtures } from "./setup-card-kind";
// RED: card_kind not yet on DueCardInput / ReviewQueueItem
import { buildReviewQueue } from "@/lib/review/queue-builder";
import type { DueCardInput, NewCardInput } from "@/lib/review/queue-builder";
// RED: cardKind not yet on recordReviewAnswer
import { recordReviewAnswer } from "@/app/actions/review";
// RED: getDueReviewQueue SELECT does not include card_kind yet
import { getDueReviewQueue } from "@/lib/db/queries";

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;

function unwrap<T = unknown>(r: unknown): T[] {
  return Array.isArray(r) ? (r as T[]) : ((r as { rows?: T[] }).rows ?? []);
}

const TEST_USER = "test-user-review-dual-cards-11-6";

describeIfTestDb(
  "SPEC-REQ-17: /review queue emits both card_kinds + shared daily cap",
  () => {
    let pool: Pool;
    let db: ReturnType<typeof drizzlePool>;
    let fixtures: DualCardFixtures;

    beforeEach(async () => {
      pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL! });
      db = drizzlePool(pool);
      fixtures = await seedDualCardFixtures(db, TEST_USER);
      // Clean up mastery + budget rows for the test user
      await db.execute(sql`
        DELETE FROM user_vocab_mastery WHERE user_id = ${TEST_USER}
      `);
      await db.execute(sql`
        UPDATE users
        SET review_new_today = 0, review_new_today_date = NOW()::date
        WHERE id = ${TEST_USER}
      `).catch(() => {});
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
      "Test 1: queue emits both card_kinds for same vocab",
      async () => {
        // Seed 2 due user_vocab_mastery rows — same vocab_item_id, different card_kind
        const past = new Date(Date.now() - 1000 * 60).toISOString();
        await db.execute(sql`
          INSERT INTO user_vocab_mastery (
            user_id, vocab_item_id, card_kind, state, due,
            stability, difficulty, elapsed_days, scheduled_days, reps, lapses
          ) VALUES
            (${TEST_USER}, ${fixtures.kanjiVocabId}::uuid, 'romaji_meaning', 2, ${past}::timestamptz,
             1.0, 5.0, 1, 1, 1, 0),
            (${TEST_USER}, ${fixtures.kanjiVocabId}::uuid, 'kanji_kana', 2, ${past}::timestamptz,
             1.0, 5.0, 1, 1, 1, 0)
          ON CONFLICT (user_id, vocab_item_id, card_kind) DO NOTHING
        `);

        // Fetch from DB and build queue
        const queueData = await getDueReviewQueue(TEST_USER, 0); // newCardCap=0: due-only

        // RED: getDueReviewQueue should return card_kind on each row; currently it doesn't
        expect(queueData.due).toHaveLength(2);

        // Build queue from the due rows (cast is intentional — RED will fail at type level)
        const queue = buildReviewQueue(
          queueData.due as unknown as DueCardInput[],
          [],
          0
        );

        expect(queue).toHaveLength(2);
        expect(queue.map((i) => i.vocab_item_id)).toEqual([
          fixtures.kanjiVocabId,
          fixtures.kanjiVocabId,
        ]);

        // RED: card_kind should be present on each item
        const kinds = queue.map((i) => (i as { card_kind?: string }).card_kind);
        expect(kinds).toContain("romaji_meaning");
        expect(kinds).toContain("kanji_kana");

        // kanji_kana branch forces vocab_typed exerciseType
        const kanjiItem = queue.find(
          (i) => (i as { card_kind?: string }).card_kind === "kanji_kana"
        );
        expect(kanjiItem?.exerciseType).toBe("vocab_typed");

        // romaji_meaning uses hash-rotation (one of the 3 rotation types)
        const romajiItem = queue.find(
          (i) => (i as { card_kind?: string }).card_kind === "romaji_meaning"
        );
        expect(["vocab_meaning", "meaning_vocab", "reading_match"]).toContain(
          romajiItem?.exerciseType
        );
      }
    );

    it(
      "Test 2: daily cap shared across kinds — review_new_today increments once per isNew=true call",
      async () => {
        // Upsert the test user row so we can track review_new_today
        await db.execute(sql`
          INSERT INTO users (id, review_new_today, review_new_today_date, new_card_cap, email, name)
          VALUES (${TEST_USER}, 0, NOW()::date, 5, ${TEST_USER + '@test.local'}, ${TEST_USER})
          ON CONFLICT (id) DO UPDATE SET
            review_new_today = 0,
            review_new_today_date = NOW()::date,
            new_card_cap = 5
        `);

        // Record 5 new-card answers (alternating cardKind) — each should consume 1 slot
        for (let i = 0; i < 5; i++) {
          const cardKind = i % 2 === 0 ? "romaji_meaning" : "kanji_kana";
          // RED: cardKind param does not yet exist on recordReviewAnswer
          await recordReviewAnswer({
            userId: TEST_USER,
            vocabItemId: fixtures.kanjiVocabId,
            exerciseType: "vocab_meaning",
            // @ts-expect-error RED: cardKind not yet in recordReviewAnswer type
            cardKind,
            correct: true,
            responseTimeMs: 100,
            isNew: true,
          });
        }

        // review_new_today should be exactly 5 (shared cap, NOT 5+5=10)
        const rows = unwrap<{ review_new_today: number }>(
          await db.execute(sql`
            SELECT review_new_today FROM users WHERE id = ${TEST_USER}
          `)
        );
        expect(rows[0].review_new_today).toBe(5);

        // 6th call with isNew=true should be rejected
        await expect(
          recordReviewAnswer({
            userId: TEST_USER,
            vocabItemId: fixtures.kanjiVocabId,
            exerciseType: "vocab_meaning",
            // @ts-expect-error RED: cardKind not yet in recordReviewAnswer type
            cardKind: "kanji_kana",
            correct: true,
            responseTimeMs: 100,
            isNew: true,
          })
        ).rejects.toThrow("daily_new_card_cap_reached");
      }
    );

    it(
      "Test 3: recordReviewAnswer routes cardKind to recordVocabAnswer — mastery row has correct card_kind",
      async () => {
        // Ensure user row exists
        await db.execute(sql`
          INSERT INTO users (id, review_new_today, review_new_today_date, new_card_cap, email, name)
          VALUES (${TEST_USER}, 0, NOW()::date, 10, ${TEST_USER + '@test.local'}, ${TEST_USER})
          ON CONFLICT (id) DO UPDATE SET new_card_cap = 10
        `);

        // RED: cardKind param does not yet exist on recordReviewAnswer
        await recordReviewAnswer({
          userId: TEST_USER,
          vocabItemId: fixtures.kanjiVocabId,
          exerciseType: "vocab_meaning",
          // @ts-expect-error RED: cardKind not yet in recordReviewAnswer type
          cardKind: "kanji_kana",
          correct: true,
          responseTimeMs: 100,
          isNew: true,
        });

        // Verify user_vocab_mastery has a row with card_kind = 'kanji_kana'
        const rows = unwrap<{ card_kind: string }>(
          await db.execute(sql`
            SELECT card_kind FROM user_vocab_mastery
            WHERE user_id = ${TEST_USER}
              AND vocab_item_id = ${fixtures.kanjiVocabId}::uuid
          `)
        );

        expect(rows.some((r) => r.card_kind === "kanji_kana")).toBe(true);
      }
    );

    it(
      "Test 4: kanji_kana DueCardInput forces vocab_typed exerciseType in buildReviewQueue",
      () => {
        // RED: card_kind not yet part of DueCardInput interface
        const dueCards: DueCardInput[] = [
          {
            vocab_item_id: fixtures.kanjiVocabId,
            state: 2,
            due: new Date(),
            // @ts-expect-error RED: card_kind not yet on DueCardInput
            card_kind: "kanji_kana",
          },
        ];

        const queue = buildReviewQueue(dueCards, [], 0);

        expect(queue).toHaveLength(1);
        // RED: card_kind not yet propagated to ReviewQueueItem
        expect((queue[0] as { card_kind?: string }).card_kind).toBe("kanji_kana");
        // vocab_typed forced for kanji_kana
        expect(queue[0].exerciseType).toBe("vocab_typed");
      }
    );
  }
);
