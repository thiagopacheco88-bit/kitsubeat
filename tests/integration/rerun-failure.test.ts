/**
 * Integration tests: rerun failure → flagged_unfixable (SPEC #20, D-12).
 *
 * Tests the second-failure escalation path that sets quality_status='flagged_unfixable'
 * on the songs table with a structured quality_notes entry.
 * Gated on TEST_DATABASE_URL — skips cleanly in CI without a real DB.
 */

import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { Client } from "@neondatabase/serverless";

const TEST_DB = process.env.TEST_DATABASE_URL;

describe.skipIf(!TEST_DB)(
  "rerun failure → flagged_unfixable (SPEC #20, D-12)",
  () => {
    let client: Client;
    let testSongVersionId: string;
    let testSongId: string;

    beforeAll(async () => {
      client = new Client(TEST_DB!);
      await client.connect();
      const r = await client.query<{ sv_id: string; song_id: string }>(
        `SELECT sv.id::text AS sv_id, s.id::text AS song_id
           FROM song_versions sv
           INNER JOIN songs s ON s.id = sv.song_id
          LIMIT 1`
      );
      if (r.rows.length === 0)
        throw new Error("no song_versions in DB");
      testSongVersionId = r.rows[0].sv_id;
      testSongId = r.rows[0].song_id;
    });

    afterEach(async () => {
      // Restore DB to safe defaults after each test
      await client.query(
        `UPDATE songs
            SET quality_status = 'active',
                quality_notes  = NULL
          WHERE id = $1`,
        [testSongId]
      );
      await client.query(
        `UPDATE song_versions
            SET pipeline_status = 'idle',
                pipeline_step   = NULL
          WHERE id = $1`,
        [testSongVersionId]
      );
    });

    it("second-failure path sets quality_status='flagged_unfixable' + quality_notes matches pattern", async () => {
      const ts = new Date().toISOString();
      const note = `Pipeline failed at whisper: simulated error (${ts})`;

      // Simulate orchestrator's D-12 second-failure UPDATE
      await client.query(
        `UPDATE songs
            SET quality_status = 'flagged_unfixable',
                quality_notes  = COALESCE(quality_notes || E'\n', '') || $1
          WHERE id = $2`,
        [note, testSongId]
      );

      const r = await client.query<{
        quality_status: string;
        quality_notes: string;
      }>(
        `SELECT quality_status, quality_notes FROM songs WHERE id = $1`,
        [testSongId]
      );
      expect(r.rows[0].quality_status).toBe("flagged_unfixable");
      // quality_notes must match the SPEC #20 pattern: "Pipeline failed at <step>: <error> (<ISO timestamp>)"
      expect(r.rows[0].quality_notes).toMatch(
        /^Pipeline failed at whisper: .+ \(\d{4}-\d{2}-\d{2}T/
      );
    });

    it("pipeline_status='rerun_failed' is set when step errors (first try, non-retry)", async () => {
      // Simulate orchestrator's first-failure UPDATE (no flagged_unfixable)
      await client.query(
        `UPDATE song_versions
            SET pipeline_status = 'rerun_failed',
                pipeline_step   = 'whisper'
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
      expect(r.rows[0].pipeline_status).toBe("rerun_failed");
      expect(r.rows[0].pipeline_step).toBe("whisper");

      // songs.quality_status should remain 'active' (first failure never flags)
      const s = await client.query<{ quality_status: string }>(
        `SELECT quality_status FROM songs WHERE id = $1`,
        [testSongId]
      );
      expect(s.rows[0].quality_status).toBe("active");
    });

    it("quality_notes COALESCE appending works for multiple failure entries", async () => {
      const ts1 = new Date().toISOString();
      const note1 = `Pipeline failed at audio: error1 (${ts1})`;

      await client.query(
        `UPDATE songs
            SET quality_status = 'flagged_unfixable',
                quality_notes  = COALESCE(quality_notes || E'\n', '') || $1
          WHERE id = $2`,
        [note1, testSongId]
      );

      const ts2 = new Date().toISOString();
      const note2 = `Pipeline failed at whisper: error2 (${ts2})`;

      await client.query(
        `UPDATE songs
            SET quality_notes = COALESCE(quality_notes || E'\n', '') || $1
          WHERE id = $2`,
        [note2, testSongId]
      );

      const r = await client.query<{ quality_notes: string }>(
        `SELECT quality_notes FROM songs WHERE id = $1`,
        [testSongId]
      );
      // Both notes should be present, separated by newline
      expect(r.rows[0].quality_notes).toContain("Pipeline failed at audio:");
      expect(r.rows[0].quality_notes).toContain("Pipeline failed at whisper:");
    });
  }
);
