// Phase 11.6 Wave 0 RED stub — implementation lands in Task 2 of this plan. DO NOT delete the failing assertions.
/**
 * tests/integration/verses-dominated-now-flag.test.ts
 *
 * SPEC-REQ-15: Server returns `versesDominatedNow` flag on the tipping answer.
 * SPEC-REQ-10: advancedDrillsUnlockedNow is true on the answer that completes the third 80% threshold.
 * D-03: trackPct return matches live user_song_progress row.
 *
 * These tests verify the server-response shape of the extended recordVocabAnswer.
 *
 * RED: All tests will fail until Task 2 of this plan (11.6-05) extends:
 *   - recordVocabAnswer to accept `cardKind` argument
 *   - recordVocabAnswer to return `versesDominatedNow`, `advancedDrillsUnlockedNow`, `trackPct`
 *   - per-track-pct recompute + user_song_progress upsert
 *   - user_verse_domination atomic insert with ON CONFLICT DO NOTHING
 *
 * Failure modes expected at RED stage:
 *   - TypeScript compile error: `cardKind` not in RecordAnswerInput
 *   - OR TypeScript compile error: `versesDominatedNow` not in RecordAnswerResult
 *   - OR assertion failure: response shape missing new fields
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { Pool } from "@neondatabase/serverless";
import { drizzle as drizzlePool } from "drizzle-orm/neon-serverless";
import {
  seedDualCardFixtures,
  teardownDualCardFixtures,
} from "./setup-card-kind";
import type { DualCardFixtures } from "./setup-card-kind";
import { recordVocabAnswer } from "@/app/actions/exercises";

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;

function unwrap<T = unknown>(r: unknown): T[] {
  return Array.isArray(r) ? (r as T[]) : ((r as { rows?: T[] }).rows ?? []);
}

async function insertVocabItem(
  db: ReturnType<typeof drizzlePool>,
  dictForm: string,
  hasKanji: boolean
): Promise<string> {
  const rows = unwrap<{ id: string }>(
    await db.execute(sql`
      INSERT INTO vocabulary_items (
        id, dictionary_form, reading, romaji, part_of_speech,
        jlpt_level, is_katakana_loanword, meaning
      ) VALUES (
        gen_random_uuid(),
        ${dictForm},
        'てすと',
        'tesuto',
        'noun',
        'N5',
        false,
        '{"en":"test"}'::jsonb
      )
      RETURNING id
    `)
  );
  return rows[0].id;
}

describeIfTestDb(
  "SPEC-REQ-15 + SPEC-REQ-10 + D-03: verses-dominated-now-flag server response",
  () => {
    let pool: Pool;
    let db: ReturnType<typeof drizzlePool>;
    let fixtures: DualCardFixtures;
    const TEST_USER = "test-user-vdnow-11-6";

    beforeEach(async () => {
      pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL! });
      db = drizzlePool(pool);
      fixtures = await seedDualCardFixtures(db, TEST_USER);
      // Clean up prior state for this test user
      await db
        .execute(
          sql`DELETE FROM user_verse_domination WHERE user_id = ${TEST_USER}`
        )
        .catch(() => {});
      await db
        .execute(
          sql`DELETE FROM user_vocab_mastery WHERE user_id = ${TEST_USER}`
        )
        .catch(() => {});
      await db
        .execute(
          sql`DELETE FROM user_song_progress WHERE user_id = ${TEST_USER}`
        )
        .catch(() => {});
    });

    afterAll(async () => {
      if (pool) {
        if (fixtures) {
          await db
            .execute(
              sql`DELETE FROM user_verse_domination WHERE user_id = ${TEST_USER}`
            )
            .catch(() => {});
          await db
            .execute(
              sql`DELETE FROM user_song_progress WHERE user_id = ${TEST_USER}`
            )
            .catch(() => {});
          await teardownDualCardFixtures(db, fixtures);
        }
        await db
          .execute(
            sql`DELETE FROM user_vocab_mastery WHERE user_id = ${TEST_USER}`
          )
          .catch(() => {});
        await pool.end();
      }
    });

    it(
      "Test 1: first vocab answer in verse 1 does NOT tip (versesDominatedNow === [])",
      async () => {
        // Verse 1 has: hiraganaVocabId (romaji_meaning only) + kanjiVocabId (romaji_meaning + kanji_kana)
        // Answering only hiraganaVocabId romaji_meaning should NOT dominate verse 1

        const response = (await recordVocabAnswer({
          userId: TEST_USER,
          vocabItemId: fixtures.hiraganaVocabId,
          songVersionId: fixtures.songVersionId,
          exerciseType: "vocab_meaning",
          correct: true,
          revealedReading: false,
          responseTimeMs: 1000,
          cardKind: "romaji_meaning",
        })) as unknown as { versesDominatedNow?: number[] };

        // RED: versesDominatedNow does not exist on RecordAnswerResult yet
        expect(response.versesDominatedNow).toBeDefined();
        expect(response.versesDominatedNow).toEqual([]);
      }
    );

    it(
      "Test 2: tipping answer (all items in verse 1 correct) returns versesDominatedNow with verse 1",
      async () => {
        // Verse 1 items:
        //   hiraganaVocabId → romaji_meaning card (no kanji in surface)
        //   kanjiVocabId    → romaji_meaning card + kanji_kana card (kanji in surface "飲む")
        // All three must be correct to dominate verse 1.

        // Step 1: answer hiraganaVocabId romaji_meaning correctly
        await recordVocabAnswer({
          userId: TEST_USER,
          vocabItemId: fixtures.hiraganaVocabId,
          songVersionId: fixtures.songVersionId,
          exerciseType: "vocab_meaning",
          correct: true,
          revealedReading: false,
          responseTimeMs: 1000,
          cardKind: "romaji_meaning",
        });

        // Step 2: answer kanjiVocabId romaji_meaning correctly
        await recordVocabAnswer({
          userId: TEST_USER,
          vocabItemId: fixtures.kanjiVocabId,
          songVersionId: fixtures.songVersionId,
          exerciseType: "vocab_meaning",
          correct: true,
          revealedReading: false,
          responseTimeMs: 1000,
          cardKind: "romaji_meaning",
        });

        // Step 3: tipping answer — kanjiVocabId kanji_kana correctly (completes verse 1)
        const tippingResult = (await recordVocabAnswer({
          userId: TEST_USER,
          vocabItemId: fixtures.kanjiVocabId,
          songVersionId: fixtures.songVersionId,
          exerciseType: "vocab_meaning",
          correct: true,
          revealedReading: false,
          responseTimeMs: 1000,
          cardKind: "kanji_kana",
        })) as unknown as { versesDominatedNow?: number[] };

        // RED: versesDominatedNow does not exist on RecordAnswerResult yet
        expect(tippingResult.versesDominatedNow).toBeDefined();
        expect(tippingResult.versesDominatedNow).toContain(1);

        // Verify DB row exists
        const rows = unwrap<{ dominated_at: string }>(
          await db.execute(sql`
            SELECT dominated_at FROM user_verse_domination
            WHERE user_id = ${TEST_USER}
              AND song_version_id = ${fixtures.songVersionId}
              AND verse_number = 1
          `)
        );
        expect(rows).toHaveLength(1);
      }
    );

    it(
      "Test 3: revisit after verse 1 domination returns empty versesDominatedNow (ON CONFLICT DO NOTHING idempotency)",
      async () => {
        // First dominate verse 1
        await recordVocabAnswer({
          userId: TEST_USER,
          vocabItemId: fixtures.hiraganaVocabId,
          songVersionId: fixtures.songVersionId,
          exerciseType: "vocab_meaning",
          correct: true,
          revealedReading: false,
          responseTimeMs: 1000,
          cardKind: "romaji_meaning",
        });
        await recordVocabAnswer({
          userId: TEST_USER,
          vocabItemId: fixtures.kanjiVocabId,
          songVersionId: fixtures.songVersionId,
          exerciseType: "vocab_meaning",
          correct: true,
          revealedReading: false,
          responseTimeMs: 1000,
          cardKind: "romaji_meaning",
        });
        await recordVocabAnswer({
          userId: TEST_USER,
          vocabItemId: fixtures.kanjiVocabId,
          songVersionId: fixtures.songVersionId,
          exerciseType: "vocab_meaning",
          correct: true,
          revealedReading: false,
          responseTimeMs: 1000,
          cardKind: "kanji_kana",
        });

        // Now revisit — re-answer the same vocab
        const revisitResult = (await recordVocabAnswer({
          userId: TEST_USER,
          vocabItemId: fixtures.kanjiVocabId,
          songVersionId: fixtures.songVersionId,
          exerciseType: "vocab_meaning",
          correct: true,
          revealedReading: false,
          responseTimeMs: 1000,
          cardKind: "kanji_kana",
        })) as unknown as { versesDominatedNow?: number[] };

        // RED: versesDominatedNow must be empty (already dominated, ON CONFLICT DO NOTHING)
        expect(revisitResult.versesDominatedNow).toBeDefined();
        expect(revisitResult.versesDominatedNow ?? []).toHaveLength(0);
      }
    );

    it(
      "Test 4: incorrect answer never tips verse domination",
      async () => {
        // Answer hiraganaVocabId correctly but kanjiVocabId incorrectly
        await recordVocabAnswer({
          userId: TEST_USER,
          vocabItemId: fixtures.hiraganaVocabId,
          songVersionId: fixtures.songVersionId,
          exerciseType: "vocab_meaning",
          correct: true,
          revealedReading: false,
          responseTimeMs: 1000,
          cardKind: "romaji_meaning",
        });

        const incorrectResult = (await recordVocabAnswer({
          userId: TEST_USER,
          vocabItemId: fixtures.kanjiVocabId,
          songVersionId: fixtures.songVersionId,
          exerciseType: "vocab_meaning",
          correct: false,
          revealedReading: false,
          responseTimeMs: 1000,
          cardKind: "romaji_meaning",
        })) as unknown as { versesDominatedNow?: number[] };

        // Incorrect answer must NOT dominate
        expect(incorrectResult.versesDominatedNow).toBeDefined();
        expect(incorrectResult.versesDominatedNow ?? []).toHaveLength(0);

        // No DB row
        const rows = unwrap<{ dominated_at: string }>(
          await db.execute(sql`
            SELECT dominated_at FROM user_verse_domination
            WHERE user_id = ${TEST_USER}
              AND song_version_id = ${fixtures.songVersionId}
              AND verse_number = 1
          `)
        );
        expect(rows).toHaveLength(0);
      }
    );

    it(
      "Test 5: advancedDrillsUnlockedNow is true when all three tracks cross 80% on the same answer",
      async () => {
        // Build a song with 5 vocab items only (no grammar, no kanji-bearing) so grammar auto-passes (100%)
        // and kanji auto-passes (100%). We need 5/5 vocab correct → 100% → unlocked.
        const SENTINEL = `vdnow5_${Date.now()}`;
        const vocabIds: string[] = [];

        for (let i = 0; i < 5; i++) {
          vocabIds.push(
            await insertVocabItem(db, `vdnow_v_${SENTINEL}_${i}`, false)
          );
        }

        const lesson = {
          vocabulary: vocabIds.map((id, i) => ({
            vocab_item_id: id,
            surface: `のむ${i}`,
            reading: `のむ${i}`,
            romaji: `nomu${i}`,
            meaning: { en: `word ${i}` },
            part_of_speech: "noun",
            jlpt_level: "N5",
          })),
          grammar_points: [],
          verses: [
            {
              verse_number: 1,
              lyrics: "test",
              translations: { en: "test" },
              tokens: vocabIds.map((id) => ({
                surface: "のむ",
                vocab_item_id: id,
                type: "vocab",
              })),
            },
          ],
        };

        const songRows = unwrap<{ id: string }>(
          await db.execute(sql`
            INSERT INTO songs (id, slug, title, artist, anime, language)
            VALUES (gen_random_uuid(), ${"test-vdnow5-" + SENTINEL}, ${"VDNOW5 " + SENTINEL}, 'A', 'B', 'ja')
            RETURNING id
          `)
        );
        const songId = songRows[0].id;

        const svRows = unwrap<{ id: string }>(
          await db.execute(sql`
            INSERT INTO song_versions (id, song_id, youtube_id, version_type, lesson)
            VALUES (gen_random_uuid(), ${songId}, ${"yt_vdnow5_" + SENTINEL}, 'tv', ${JSON.stringify(lesson)}::jsonb)
            RETURNING id
          `)
        );
        const testSongVersionId = svRows[0].id;

        try {
          // Answer 4/5 vocab correctly → 80% vocab track → should unlock
          for (let i = 0; i < 4; i++) {
                await recordVocabAnswer({
              userId: TEST_USER,
              vocabItemId: vocabIds[i],
              songVersionId: testSongVersionId,
              exerciseType: "vocab_meaning",
              correct: true,
              revealedReading: false,
              responseTimeMs: 1000,
              cardKind: "romaji_meaning",
            });
          }

          // 5th answer (tipping to 100% — already above 80%, but this is the final answer)
          // Since grammar=null→100% auto-pass, kanji=null→100% auto-pass,
          // and this brings vocab to 100%, unlock should fire.
            const tippingResult = (await recordVocabAnswer({
            userId: TEST_USER,
            vocabItemId: vocabIds[4],
            songVersionId: testSongVersionId,
            exerciseType: "vocab_meaning",
            correct: true,
            revealedReading: false,
            responseTimeMs: 1000,
            cardKind: "romaji_meaning",
          })) as unknown as {
            advancedDrillsUnlockedNow?: boolean;
            trackPct?: { vocab: number; grammar: number; kanji: number };
          };

          // RED: advancedDrillsUnlockedNow does not exist on RecordAnswerResult yet
          expect(tippingResult.advancedDrillsUnlockedNow).toBeDefined();
          expect(tippingResult.advancedDrillsUnlockedNow).toBe(true);

          // Re-answer after unlock — must be false (already unlocked, no transition)
            const reResult = (await recordVocabAnswer({
            userId: TEST_USER,
            vocabItemId: vocabIds[0],
            songVersionId: testSongVersionId,
            exerciseType: "vocab_meaning",
            correct: true,
            revealedReading: false,
            responseTimeMs: 1000,
            cardKind: "romaji_meaning",
          })) as unknown as { advancedDrillsUnlockedNow?: boolean };

          expect(reResult.advancedDrillsUnlockedNow).toBe(false);
        } finally {
          // Cleanup test-local song
          await db
            .execute(
              sql`DELETE FROM user_song_progress WHERE user_id = ${TEST_USER} AND song_version_id = ${testSongVersionId}`
            )
            .catch(() => {});
          await db
            .execute(
              sql`DELETE FROM user_vocab_mastery WHERE user_id = ${TEST_USER} AND vocab_item_id IN (${vocabIds[0]}, ${vocabIds[1]}, ${vocabIds[2]}, ${vocabIds[3]}, ${vocabIds[4]})`
            )
            .catch(() => {});
          await db
            .execute(
              sql`DELETE FROM song_versions WHERE id = ${testSongVersionId}`
            )
            .catch(() => {});
          await db
            .execute(sql`DELETE FROM songs WHERE id = ${songId}`)
            .catch(() => {});
          for (const id of vocabIds) {
            await db
              .execute(sql`DELETE FROM vocabulary_items WHERE id = ${id}`)
              .catch(() => {});
          }
        }
      }
    );

    it(
      "Test 6: trackPct return matches live user_song_progress row after answer",
      async () => {
        const response = (await recordVocabAnswer({
          userId: TEST_USER,
          vocabItemId: fixtures.hiraganaVocabId,
          songVersionId: fixtures.songVersionId,
          exerciseType: "vocab_meaning",
          correct: true,
          revealedReading: false,
          responseTimeMs: 1000,
          cardKind: "romaji_meaning",
        })) as unknown as {
          trackPct?: { vocab: number; grammar: number; kanji: number };
        };

        // RED: trackPct does not exist on RecordAnswerResult yet
        expect(response.trackPct).toBeDefined();
        expect(typeof response.trackPct?.vocab).toBe("number");
        expect(typeof response.trackPct?.grammar).toBe("number");
        expect(typeof response.trackPct?.kanji).toBe("number");

        // trackPct must match the live DB row
        const progressRows = unwrap<{
          vocab_track_pct: string | null;
          grammar_track_pct: string | null;
          kanji_track_pct: string | null;
        }>(
          await db.execute(sql`
            SELECT vocab_track_pct, grammar_track_pct, kanji_track_pct
            FROM user_song_progress
            WHERE user_id = ${TEST_USER}
              AND song_version_id = ${fixtures.songVersionId}
          `)
        );

        expect(progressRows.length).toBeGreaterThan(0);
        const dbRow = progressRows[0];

        const dbVocab =
          dbRow.vocab_track_pct != null
            ? parseFloat(dbRow.vocab_track_pct)
            : 100;
        const dbGrammar =
          dbRow.grammar_track_pct != null
            ? parseFloat(dbRow.grammar_track_pct)
            : 100;
        const dbKanji =
          dbRow.kanji_track_pct != null
            ? parseFloat(dbRow.kanji_track_pct)
            : 100;

        expect(response.trackPct?.vocab).toBeCloseTo(dbVocab, 1);
        expect(response.trackPct?.grammar).toBeCloseTo(dbGrammar, 1);
        expect(response.trackPct?.kanji).toBeCloseTo(dbKanji, 1);
      }
    );
  }
);
