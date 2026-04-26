/**
 * tests/integration/seed-05-insert-db-rollback.test.ts
 *
 * Integration test for `scripts/seed/05-insert-db.ts::insertSongTransactional` —
 * locks the transactional rollback semantics that prevent half-written catalog rows:
 *
 *   - A forced mid-transaction failure (NOT NULL violation on song_versions.lesson)
 *     rolls back BOTH songs and song_versions for the failing slug (SPEC AC #7)
 *   - Mixed batch: passing slug writes both rows; failing slug writes none (SPEC AC #8)
 *
 * Driver note: the test builds its OWN Pool from TEST_DATABASE_URL because
 * insertSongTransactional requires a WebSocket-backed drizzle instance that supports
 * db.transaction(). The getTestDb() helper in tests/support/test-db.ts returns
 * NeonHttpDatabase (HTTP) which does NOT support callback transactions.
 *
 * Env requirement:
 *   - TEST_DATABASE_URL must be set (loaded by tests/integration/setup.ts from .env.test)
 */

import { readFileSync } from "fs";
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { Pool } from "@neondatabase/serverless";
import { drizzle as drizzlePool } from "drizzle-orm/neon-serverless";
import { insertSongTransactional } from "../../scripts/seed/05-insert-db.js";

// ---------------------------------------------------------------------------
// Skip guard: test requires a real Postgres connection
// ---------------------------------------------------------------------------
const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;

// ---------------------------------------------------------------------------
// Test fixture slugs — test- prefix + -11-1 suffix avoids catalog collisions
// ---------------------------------------------------------------------------
const FAILING_SLUG = "test-rollback-11-1";
const PASSING_SLUG = "test-passing-11-1";

// ---------------------------------------------------------------------------
// Pool builder — uses TEST_DATABASE_URL, never DATABASE_URL (T-11.1.02-06)
// ---------------------------------------------------------------------------
function buildTestPool() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL not set");
  const pool = new Pool({ connectionString: url });
  return { pool, db: drizzlePool(pool) };
}

type TestDb = ReturnType<typeof drizzlePool>;

// ---------------------------------------------------------------------------
// Cleanup helper — deletes test slugs from both tables (order matters: FK)
// ---------------------------------------------------------------------------
async function clearTestSlugs(db: TestDb) {
  await db.execute(sql`
    DELETE FROM song_versions
    WHERE song_id IN (SELECT id FROM songs WHERE slug IN (${FAILING_SLUG}, ${PASSING_SLUG}))
  `);
  await db.execute(sql`
    DELETE FROM songs WHERE slug IN (${FAILING_SLUG}, ${PASSING_SLUG})
  `);
}

// ---------------------------------------------------------------------------
// Shared minimal song fixture (only the fields insertSongTransactional reads)
// ---------------------------------------------------------------------------
const FAILING_SONG = {
  slug: FAILING_SLUG,
  title: "Rollback Test",
  artist: "Test Artist",
  anime: "Test Anime",
  youtube_id: "test_yt_rollback",
} as const;

const PASSING_SONG = {
  slug: PASSING_SLUG,
  title: "Passing Test",
  artist: "Test Artist",
  anime: "Test Anime",
  youtube_id: "test_yt_passing",
} as const;

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describeIfTestDb("05-insert-db transactional rollback", () => {
  let pool: Pool;
  let db: TestDb;

  beforeEach(async () => {
    ({ pool, db } = buildTestPool());
    await clearTestSlugs(db);
  });

  afterAll(async () => {
    // Cleanup: leave test DB spotless for next run
    if (db) await clearTestSlugs(db);
    if (pool) await pool.end();
  });

  // -------------------------------------------------------------------------
  // Test 1: forced FK/NOT NULL violation → both tables rolled back (SPEC AC #7)
  // -------------------------------------------------------------------------
  it("forced failure mid-transaction rolls back BOTH songs and song_versions for failing slug", async () => {
    // Forcing function: pass lesson=null which violates the NOT NULL constraint
    // on song_versions.lesson. The songs upsert succeeds (songs has no lesson
    // column), then the song_versions insert throws "null value in column
    // \"lesson\" violates not-null constraint". Drizzle/PG rolls back both writes.
    let threw = false;
    try {
      await insertSongTransactional(
        db,
        FAILING_SONG as any, // TS cast: minimal fields satisfy the runtime shape
        {
          lesson: null as any, // forces NOT NULL violation in song_versions
          lyricsSource: null,
          syncedLrc: null,
          canonicalLyrics: null,
          whisperLyrics: null,
          timingYoutubeId: null,
          timingData: null,
        },
      );
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);

    // Both tables MUST have zero rows for the failing slug (PG rollback contract).
    const songRowsRaw = await db.execute(
      sql`SELECT id FROM songs WHERE slug = ${FAILING_SLUG}`,
    );
    const versionRowsRaw = await db.execute(
      sql`SELECT sv.id FROM song_versions sv
          JOIN songs s ON s.id = sv.song_id
          WHERE s.slug = ${FAILING_SLUG}`,
    );

    const unwrap = (raw: unknown) =>
      Array.isArray(raw) ? raw : (raw as { rows?: unknown[] }).rows ?? [];

    expect(unwrap(songRowsRaw).length).toBe(0);
    expect(unwrap(versionRowsRaw).length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Test 2: mixed batch — passing slug commits both rows; failing slug writes none
  //         (SPEC AC #8 + AC #9)
  // -------------------------------------------------------------------------
  it("mixed batch: passing slug writes both rows; failing slug writes none", async () => {
    // 1. Run the failing call first (expect throw).
    let failingThrew = false;
    try {
      await insertSongTransactional(
        db,
        FAILING_SONG as any,
        {
          lesson: null as any, // forces NOT NULL violation
          lyricsSource: null,
          syncedLrc: null,
          canonicalLyrics: null,
          whisperLyrics: null,
          timingYoutubeId: null,
          timingData: null,
        },
      );
    } catch {
      failingThrew = true;
    }
    expect(failingThrew).toBe(true);

    // 2. Run the passing call with a real lesson from the seeded cache.
    //    again-yui.json is the canonical happy-path song in SEEDED_SLUGS.
    //    Fallback: if the file doesn't exist, this test will throw a readable error.
    const minimalLesson = JSON.parse(
      readFileSync("data/lessons-cache/again-yui.json", "utf-8"),
    );

    await insertSongTransactional(
      db,
      PASSING_SONG as any,
      {
        lesson: minimalLesson,
        lyricsSource: null,
        syncedLrc: null,
        canonicalLyrics: null,
        whisperLyrics: null,
        timingYoutubeId: null,
        timingData: null,
      },
    );

    // 3. Assert table state:
    //    PASSING slug → 1 row in songs AND 1 row in song_versions
    //    FAILING slug → 0 rows in both (rolled back in step 1)
    const passingSong = await db.execute(
      sql`SELECT id FROM songs WHERE slug = ${PASSING_SLUG}`,
    );
    const passingVersion = await db.execute(
      sql`SELECT sv.id FROM song_versions sv
          JOIN songs s ON s.id = sv.song_id
          WHERE s.slug = ${PASSING_SLUG}`,
    );
    const failingSong = await db.execute(
      sql`SELECT id FROM songs WHERE slug = ${FAILING_SLUG}`,
    );

    const unwrap = (raw: unknown) =>
      Array.isArray(raw) ? raw : (raw as { rows?: unknown[] }).rows ?? [];

    expect(unwrap(passingSong).length).toBe(1);
    expect(unwrap(passingVersion).length).toBe(1);
    expect(unwrap(failingSong).length).toBe(0);
  });
});
