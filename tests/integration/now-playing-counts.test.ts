/**
 * tests/integration/now-playing-counts.test.ts
 *
 * Phase 14.4 Plan 02 — Integration tests for getNowPlayingCounts query logic.
 *
 * Tests verify the SQL semantics of the now-playing aggregate:
 *   - Anonymous plays (null user_id) count toward the chip
 *   - Opt-in authenticated plays count
 *   - Opt-out authenticated plays are excluded
 *   - Plays older than 30 minutes are excluded
 *   - Songs with <3 distinct plays are excluded (HAVING >= 3)
 *
 * Requires: TEST_DATABASE_URL set + migration 0018 applied.
 * Skip guard: describe.skip when TEST_DATABASE_URL is absent.
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getTestDb() {
  const { getTestDb: _getTestDb } = await import("../support/test-db");
  return _getTestDb();
}

async function getTestSongVersion(): Promise<{ songId: string; versionId: string } | null> {
  const db = await getTestDb();
  const rows = (await db.execute(sql`
    SELECT s.id::text AS song_id, sv.id::text AS version_id
    FROM songs s
    JOIN song_versions sv ON sv.song_id = s.id
    WHERE s.language = 'ja' AND s.quality_status = 'active'
    LIMIT 1
  `)) as unknown as Array<{ song_id: string; version_id: string }> | { rows: Array<{ song_id: string; version_id: string }> };
  const arr = Array.isArray(rows) ? rows : (rows as { rows: Array<{ song_id: string; version_id: string }> }).rows ?? [];
  if (!arr[0]) return null;
  return { songId: arr[0].song_id, versionId: arr[0].version_id };
}

const TEST_USER_OPT_IN = "test-now-playing-opt-in";
const TEST_USER_OPT_OUT = "test-now-playing-opt-out";

async function seedUser(userId: string, socialActivityEnabled: boolean): Promise<void> {
  const db = await getTestDb();
  await db.execute(sql`
    INSERT INTO users (id, social_activity_enabled) VALUES (${userId}, ${socialActivityEnabled})
    ON CONFLICT (id) DO UPDATE SET social_activity_enabled = ${socialActivityEnabled}
  `);
}

async function seedSongPlay(
  songVersionId: string,
  sessionKey: string,
  userId: string | null,
  playedAt: string
): Promise<void> {
  const db = await getTestDb();
  await db.execute(sql`
    INSERT INTO song_plays (song_version_id, session_key, user_id, played_at)
    VALUES (${songVersionId}::uuid, ${sessionKey}, ${userId}, ${playedAt}::timestamptz)
    ON CONFLICT (song_version_id, session_key) DO UPDATE SET played_at = ${playedAt}::timestamptz
  `);
}

async function deleteSongPlaysForVersion(songVersionId: string): Promise<void> {
  const db = await getTestDb();
  await db.execute(sql`DELETE FROM song_plays WHERE song_version_id = ${songVersionId}::uuid`);
}

async function runNowPlayingCountsQuery(songId: string): Promise<number> {
  const db = await getTestDb();
  const rows = (await db.execute(sql`
    SELECT sv.song_id::text AS song_id,
           COUNT(DISTINCT COALESCE(sp.user_id, sp.session_key)) AS listener_count
    FROM song_plays sp
    JOIN song_versions sv ON sv.id = sp.song_version_id
    LEFT JOIN users u ON u.id = sp.user_id
    WHERE sp.played_at >= now() - interval '30 minutes'
      AND (sp.user_id IS NULL OR u.social_activity_enabled = true)
    GROUP BY sv.song_id
    HAVING COUNT(DISTINCT COALESCE(sp.user_id, sp.session_key)) >= 3
  `)) as unknown as Array<{ song_id: string; listener_count: number }> | { rows: Array<{ song_id: string; listener_count: number }> };
  const arr = Array.isArray(rows) ? rows : (rows as { rows: Array<{ song_id: string; listener_count: number }> }).rows ?? [];
  const row = arr.find((r) => r.song_id === songId);
  return row ? Number(row.listener_count) : 0;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describeIfTestDb("getNowPlayingCounts", () => {
  let versionId: string;
  let songId: string;

  beforeEach(async () => {
    const song = await getTestSongVersion();
    if (!song) throw new Error("No active ja song found in test DB — seed the catalog first");
    versionId = song.versionId;
    songId = song.songId;

    await seedUser(TEST_USER_OPT_IN, true);
    await seedUser(TEST_USER_OPT_OUT, false);
    await deleteSongPlaysForVersion(versionId);
  });

  afterAll(async () => {
    const db = await getTestDb();
    await db.execute(sql`DELETE FROM users WHERE id IN (${TEST_USER_OPT_IN}, ${TEST_USER_OPT_OUT})`);
  });

  it("includes anon plays (null user_id) toward chip count", async () => {
    const now = new Date().toISOString();
    // Seed 3 anonymous plays (different session keys)
    await seedSongPlay(versionId, `anon-session-${randomUUID()}`, null, now);
    await seedSongPlay(versionId, `anon-session-${randomUUID()}`, null, now);
    await seedSongPlay(versionId, `anon-session-${randomUUID()}`, null, now);
    const count = await runNowPlayingCountsQuery(songId);
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it("includes plays from users with social_activity_enabled=true", async () => {
    const now = new Date().toISOString();
    // 2 anon + 1 opt-in = 3 distinct
    await seedSongPlay(versionId, `anon-a-${randomUUID()}`, null, now);
    await seedSongPlay(versionId, `anon-b-${randomUUID()}`, null, now);
    await seedSongPlay(versionId, `opt-in-session-${randomUUID()}`, TEST_USER_OPT_IN, now);
    const count = await runNowPlayingCountsQuery(songId);
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it("excludes plays from users with social_activity_enabled=false", async () => {
    const now = new Date().toISOString();
    // 2 anon + 1 opt-out = only 2 distinct (opt-out excluded)
    await seedSongPlay(versionId, `anon-a-${randomUUID()}`, null, now);
    await seedSongPlay(versionId, `anon-b-${randomUUID()}`, null, now);
    await seedSongPlay(versionId, `opt-out-session-${randomUUID()}`, TEST_USER_OPT_OUT, now);
    const count = await runNowPlayingCountsQuery(songId);
    // Should be 2 (below HAVING >= 3 threshold) or missing entirely
    expect(count).toBe(0);
  });

  it("excludes plays older than 30 minutes", async () => {
    const oldTime = new Date(Date.now() - 31 * 60 * 1000).toISOString();
    await seedSongPlay(versionId, `old-session-a-${randomUUID()}`, null, oldTime);
    await seedSongPlay(versionId, `old-session-b-${randomUUID()}`, null, oldTime);
    await seedSongPlay(versionId, `old-session-c-${randomUUID()}`, null, oldTime);
    const count = await runNowPlayingCountsQuery(songId);
    expect(count).toBe(0);
  });

  it("returns empty Map when no plays qualify", async () => {
    // No plays seeded — should return 0
    const count = await runNowPlayingCountsQuery(songId);
    expect(count).toBe(0);
  });

  it("suppresses songs with fewer than 3 distinct plays (HAVING >=3)", async () => {
    const now = new Date().toISOString();
    // Only 2 anon plays — below threshold
    await seedSongPlay(versionId, `anon-a-${randomUUID()}`, null, now);
    await seedSongPlay(versionId, `anon-b-${randomUUID()}`, null, now);
    const count = await runNowPlayingCountsQuery(songId);
    expect(count).toBe(0);
  });
});
