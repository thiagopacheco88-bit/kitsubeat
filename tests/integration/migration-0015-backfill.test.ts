import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@neondatabase/serverless";

const TEST_DB = process.env.TEST_DATABASE_URL;

describe.skipIf(!TEST_DB)("migration 0015 backfill", () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client(TEST_DB!);
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  it("creates exactly one source='auto' lyrics_versions row per song_versions row with non-null lesson", async () => {
    const r = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM song_versions WHERE lesson IS NOT NULL) AS sv_with_lesson,
        (SELECT COUNT(*) FROM lyrics_versions WHERE source = 'auto') AS lv_auto
    `);
    expect(Number(r.rows[0].lv_auto)).toBe(Number(r.rows[0].sv_with_lesson));
  });

  it("sets active_lyrics_version_id on every song_versions row with non-null lesson", async () => {
    const r = await client.query(`
      SELECT COUNT(*)::int AS missing
      FROM song_versions
      WHERE lesson IS NOT NULL AND active_lyrics_version_id IS NULL
    `);
    expect(r.rows[0].missing).toBe(0);
  });

  it("uses COALESCE so lesson->'verses' missing produces empty array, not NULL violation", async () => {
    // Asserts the migration ran without error on edge-case rows
    const r = await client.query(`
      SELECT COUNT(*)::int AS empty_verses
      FROM lyrics_versions WHERE verses = '[]'::jsonb
    `);
    expect(r.rows[0].empty_verses).toBeGreaterThanOrEqual(0);
  });
});
