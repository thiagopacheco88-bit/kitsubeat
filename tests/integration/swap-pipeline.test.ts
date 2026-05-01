/**
 * Integration tests: swap pipeline status writes (SPEC #19/#20).
 *
 * Tests the guarded UPDATE pattern (Pitfall 12) and song_video_history insertability.
 * Gated on TEST_DATABASE_URL — skips cleanly in CI without a real DB.
 */

import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { Client } from "@neondatabase/serverless";

const TEST_DB = process.env.TEST_DATABASE_URL;

describe.skipIf(!TEST_DB)("swap pipeline status writes (SPEC #19/#20)", () => {
  let client: Client;
  let testSongVersionId: string;

  beforeAll(async () => {
    client = new Client(TEST_DB!);
    await client.connect();
    const r = await client.query<{ id: string }>(
      `SELECT id::text AS id FROM song_versions LIMIT 1`
    );
    if (r.rows.length === 0) throw new Error("no song_versions in DB");
    testSongVersionId = r.rows[0].id;
  });

  afterEach(async () => {
    // Restore to idle so each test starts clean
    await client.query(
      `UPDATE song_versions
          SET pipeline_status = 'idle',
              pipeline_step = NULL,
              pipeline_started_at = NULL
        WHERE id = $1`,
      [testSongVersionId]
    );
  });

  it("guarded UPDATE rejects double-trigger when pipeline_status != 'idle'", async () => {
    // Simulate an in-progress rerun
    await client.query(
      `UPDATE song_versions SET pipeline_status = 'rerun_in_progress' WHERE id = $1`,
      [testSongVersionId]
    );
    // Try to start another rerun with the guard (WHERE pipeline_status = 'idle')
    const r = await client.query<{ id: string }>(
      `UPDATE song_versions
          SET pipeline_status = 'rerun_in_progress'
        WHERE id = $1
          AND pipeline_status = 'idle'
        RETURNING id::text AS id`,
      [testSongVersionId]
    );
    // Guard rejected — 0 rows returned (Pitfall 12)
    expect(r.rows).toHaveLength(0);
  });

  it("song_video_history insert is appendable + queryable by song_version_id", async () => {
    await client.query(
      `INSERT INTO song_video_history
         (song_version_id, old_youtube_id, new_youtube_id, changed_by, reason)
       VALUES ($1, 'oldid12345', 'newid12345', 'test-admin', 'wrong cut')`,
      [testSongVersionId]
    );
    const r = await client.query<{ n: number }>(
      `SELECT count(*)::int AS n
         FROM song_video_history
        WHERE song_version_id = $1`,
      [testSongVersionId]
    );
    expect(r.rows[0].n).toBeGreaterThanOrEqual(1);
    // Cleanup to avoid polluting other tests
    await client.query(
      `DELETE FROM song_video_history
        WHERE song_version_id = $1 AND new_youtube_id = 'newid12345'`,
      [testSongVersionId]
    );
  });

  it("pipeline_step write reflects correctly in subsequent SELECT", async () => {
    await client.query(
      `UPDATE song_versions
          SET pipeline_status = 'rerun_in_progress',
              pipeline_step   = 'audio',
              pipeline_started_at = now()
        WHERE id = $1`,
      [testSongVersionId]
    );
    const r = await client.query<{
      pipeline_status: string;
      pipeline_step: string;
    }>(
      `SELECT pipeline_status, pipeline_step FROM song_versions WHERE id = $1`,
      [testSongVersionId]
    );
    expect(r.rows[0].pipeline_status).toBe("rerun_in_progress");
    expect(r.rows[0].pipeline_step).toBe("audio");
  });
});
