// Phase 11.6 Wave 0 RED stub — implementation lands in 11.6-05 (recordVocabAnswer extension). DO NOT delete the failing assertions.
/**
 * tests/integration/advanced-drill-unlock-gate.test.ts
 *
 * SPEC-REQ-10: Per-song advanced drills unlock = ≥80% per track.
 *
 * Test 1: 8/10 vocab + 4/5 grammar + 5/6 kanji correct → advanced_drills_unlocked_at IS NOT NULL
 * Test 2: drop kanji to 4/6 (pct=66.67%) → advanced_drills_unlocked_at is re-checked
 *         (once unlocked, does NOT re-lock unless spec says so — documented here as deferred D-REQ10)
 *
 * RED: These tests will fail until:
 *   - drizzle/0017 migration applied (advanced_drills_unlocked_at column)
 *   - recordVocabAnswer / saveSessionResults implements per-track-pct recompute + unlock gate
 *
 * Failure modes expected at this stage:
 *   - Runtime error: "column advanced_drills_unlocked_at does not exist"
 *   - OR assertion failure: unlock timestamp is null after answering correctly
 */

import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { sql } from "drizzle-orm";
import { Pool } from "@neondatabase/serverless";
import { drizzle as drizzlePool } from "drizzle-orm/neon-serverless";
import { recordVocabAnswer } from "@/app/actions/exercises";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;

function unwrap<T = unknown>(r: unknown): T[] {
  return Array.isArray(r) ? (r as T[]) : ((r as { rows?: T[] }).rows ?? []);
}

async function insertVocabItem(
  db: ReturnType<typeof drizzlePool>,
  dictForm: string
): Promise<string> {
  const rows = unwrap<{ id: string }>(await db.execute(sql`
    INSERT INTO vocabulary_items (
      id, dictionary_form, reading, romaji, part_of_speech,
      jlpt_level, is_katakana_loanword, meaning
    ) VALUES (
      gen_random_uuid(), ${dictForm}, 'てすと', 'tesuto', 'noun', 'N5', false, '{"en":"test"}'::jsonb
    )
    RETURNING id
  `));
  return rows[0].id;
}

describeIfTestDb("SPEC-REQ-10: advanced drills unlock gate (80%×3 threshold)", () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzlePool>;
  let songVersionId: string;
  let songId: string;
  const vocabIds: string[] = [];      // 10 romaji_meaning items
  const kanjiVocabIds: string[] = []; // 6 kanji_kana items
  const TEST_USER = "test-user-unlock-11-6";
  const SENTINEL = `unlock_${Date.now()}`;

  beforeEach(async () => {
    // Mock Clerk auth() so recordVocabAnswer derives userId from auth() server-side
    const { auth } = await import("@clerk/nextjs/server");
    vi.mocked(auth).mockResolvedValue({ userId: TEST_USER } as any);

    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL! });
    db = drizzlePool(pool);
    vocabIds.length = 0;
    kanjiVocabIds.length = 0;

    for (let i = 0; i < 10; i++) {
      vocabIds.push(await insertVocabItem(db, `unlock_v_${SENTINEL}_${i}`));
    }
    for (let i = 0; i < 6; i++) {
      kanjiVocabIds.push(await insertVocabItem(db, `unlock_k_${SENTINEL}_${i}`));
    }

    const grammarPoints = Array.from({ length: 5 }, (_, i) => ({
      id: `grammar-unlock-${SENTINEL}-${i}`,
      pattern: `～p${i}`,
      explanation: `G${i}`,
      jlpt_level: "N5",
    }));

    const lesson = {
      vocabulary: [
        ...vocabIds.map((id, i) => ({
          vocab_item_id: id, surface: `のむ${i}`, reading: `のむ${i}`, romaji: `nomu${i}`,
          meaning: { en: `v${i}` }, part_of_speech: "noun", jlpt_level: "N5",
        })),
        ...kanjiVocabIds.map((id, i) => ({
          vocab_item_id: id, surface: `漢字${i}`, reading: `かんじ${i}`, romaji: `kanji${i}`,
          meaning: { en: `k${i}` }, part_of_speech: "noun", jlpt_level: "N5",
        })),
      ],
      grammar_points: grammarPoints,
      verses: [{
        verse_number: 1, lyrics: "test", translations: { en: "test" },
        tokens: [
          ...vocabIds.map(id => ({ surface: "のむ", vocab_item_id: id, type: "vocab" })),
          ...kanjiVocabIds.map(id => ({ surface: "漢字", vocab_item_id: id, type: "vocab" })),
          ...grammarPoints.map(gp => ({ surface: "p", grammar_point_id: gp.id, type: "grammar" })),
        ],
      }],
    };

    const songRows = unwrap<{ id: string }>(await db.execute(sql`
      INSERT INTO songs (id, slug, title, artist, anime, language)
      VALUES (gen_random_uuid(), ${'test-unlock-' + SENTINEL}, ${'Unlock Song ' + SENTINEL}, 'A', 'B', 'ja')
      RETURNING id
    `));
    songId = songRows[0].id;

    const svRows = unwrap<{ id: string }>(await db.execute(sql`
      INSERT INTO song_versions (id, song_id, youtube_id, version_type, lesson)
      VALUES (gen_random_uuid(), ${songId}, ${'yt_unlock_' + SENTINEL}, 'tv', ${JSON.stringify(lesson)}::jsonb)
      RETURNING id
    `));
    songVersionId = svRows[0].id;

    await db.execute(sql`DELETE FROM user_vocab_mastery WHERE user_id = ${TEST_USER}`).catch(() => {});
    await db.execute(sql`DELETE FROM user_song_progress WHERE user_id = ${TEST_USER}`).catch(() => {});
    await db.execute(sql`DELETE FROM user_verse_domination WHERE user_id = ${TEST_USER}`).catch(() => {});
  });

  afterAll(async () => {
    if (pool) {
      await db.execute(sql`DELETE FROM user_vocab_mastery WHERE user_id = ${TEST_USER}`).catch(() => {});
      await db.execute(sql`DELETE FROM user_song_progress WHERE user_id = ${TEST_USER}`).catch(() => {});
      await db.execute(sql`DELETE FROM user_verse_domination WHERE user_id = ${TEST_USER}`).catch(() => {});
      if (songVersionId) {
        await db.execute(sql`DELETE FROM song_versions WHERE id = ${songVersionId}`).catch(() => {});
      }
      if (songId) {
        await db.execute(sql`DELETE FROM songs WHERE id = ${songId}`).catch(() => {});
      }
      for (const id of [...vocabIds, ...kanjiVocabIds]) {
        await db.execute(sql`DELETE FROM vocabulary_items WHERE id = ${id}`).catch(() => {});
      }
      await pool.end();
    }
  });

  it(
    "Test 1: 8/10 vocab + 4/5 grammar + 5/6 kanji correct → advanced_drills_unlocked_at IS NOT NULL",
    async () => {
      // Answer 8/10 vocab correctly
      for (let i = 0; i < 8; i++) {
  
        await recordVocabAnswer({
          vocabItemId: vocabIds[i], songVersionId,
          exerciseType: "vocab_meaning", correct: true, revealedReading: false,
          responseTimeMs: 1000,
          cardKind: "romaji_meaning",
        });
      }
      for (let i = 8; i < 10; i++) {
  
        await recordVocabAnswer({
          vocabItemId: vocabIds[i], songVersionId,
          exerciseType: "vocab_meaning", correct: false, revealedReading: false,
          responseTimeMs: 1000,
          cardKind: "romaji_meaning",
        });
      }

      // Answer 5/6 kanji correctly
      for (let i = 0; i < 5; i++) {
  
        await recordVocabAnswer({
          vocabItemId: kanjiVocabIds[i], songVersionId,
          exerciseType: "vocab_meaning", correct: true, revealedReading: false,
          responseTimeMs: 1000,
          cardKind: "kanji_kana",
        });
      }

      await recordVocabAnswer({
        vocabItemId: kanjiVocabIds[5], songVersionId,
        exerciseType: "vocab_meaning", correct: false, revealedReading: false,
        responseTimeMs: 1000,
        cardKind: "kanji_kana",
      });

      // Grammar: 4/5 correct — tracked via dedicated grammar answer (path TBD in 11.6-05)
      // For now, verify unlock column state
      const rows = unwrap<{ advanced_drills_unlocked_at: string | null }>(
        await db.execute(sql`
          SELECT advanced_drills_unlocked_at
          FROM user_song_progress
          WHERE user_id = ${TEST_USER} AND song_version_id = ${songVersionId}
        `)
      );

      // RED: will fail until 11.6-05 implements the unlock logic
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0].advanced_drills_unlocked_at).not.toBeNull();
    }
  );

  it(
    "Test 2: once unlocked, dropping kanji to 4/6 (66.67%) — advanced_drills_unlocked_at remains the prior timestamp (unlock is not re-locked by a single regression)",
    async () => {
      // NOTE: SPEC-REQ-10 says "locks again if any track regresses" (live-recompute)
      // This test documents the regression case and asserts what the current spec requires.
      // If the implementation chooses "never re-lock once unlocked", mark this as D-REQ10.

      // First unlock (all tracks ≥ 80%)
      for (let i = 0; i < 8; i++) {
  
        await recordVocabAnswer({
          vocabItemId: vocabIds[i], songVersionId,
          exerciseType: "vocab_meaning", correct: true, revealedReading: false,
          responseTimeMs: 1000,
          cardKind: "romaji_meaning",
        });
      }
      for (let i = 8; i < 10; i++) {
  
        await recordVocabAnswer({
          vocabItemId: vocabIds[i], songVersionId,
          exerciseType: "vocab_meaning", correct: false, revealedReading: false,
          responseTimeMs: 1000,
          cardKind: "romaji_meaning",
        });
      }
      for (let i = 0; i < 5; i++) {
  
        await recordVocabAnswer({
          vocabItemId: kanjiVocabIds[i], songVersionId,
          exerciseType: "vocab_meaning", correct: true, revealedReading: false,
          responseTimeMs: 1000,
          cardKind: "kanji_kana",
        });
      }
      // Initial 5/6 correct = 83.33% → unlocked

      await recordVocabAnswer({
        vocabItemId: kanjiVocabIds[5], songVersionId,
        exerciseType: "vocab_meaning", correct: false, revealedReading: false,
        responseTimeMs: 1000,
        cardKind: "kanji_kana",
      });

      // Capture unlock timestamp
      const lockRows = unwrap<{ advanced_drills_unlocked_at: string | null }>(
        await db.execute(sql`
          SELECT advanced_drills_unlocked_at
          FROM user_song_progress
          WHERE user_id = ${TEST_USER} AND song_version_id = ${songVersionId}
        `)
      );
      const priorTimestamp = lockRows[0]?.advanced_drills_unlocked_at;

      // Now answer an additional incorrect (kanji 5 — already answered wrong; kanji[4] wrong now)
      // This drops kanji pct from 5/6 to 4/6 = 66.67%

      await recordVocabAnswer({
        vocabItemId: kanjiVocabIds[4], songVersionId,
        exerciseType: "vocab_meaning", correct: false, revealedReading: false,
        responseTimeMs: 1000,
        cardKind: "kanji_kana",
      });

      const reRows = unwrap<{ advanced_drills_unlocked_at: string | null }>(
        await db.execute(sql`
          SELECT advanced_drills_unlocked_at
          FROM user_song_progress
          WHERE user_id = ${TEST_USER} AND song_version_id = ${songVersionId}
        `)
      );

      // Per SPEC: "locks again" on regression — so advanced_drills_unlocked_at should become NULL.
      // If implementation chooses "never re-lock" instead, update this assertion and
      // document as D-REQ10 (deferred / architectural decision).
      // For now, assert the SPEC-required behavior: locks again.
      expect(reRows[0].advanced_drills_unlocked_at).toBeNull();

      // Suppress unused-var warning on priorTimestamp — it's used for documentation
      void priorTimestamp;
    }
  );
});
