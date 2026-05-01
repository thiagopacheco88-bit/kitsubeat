import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { Client } from "@neondatabase/serverless";

const TEST_DB = process.env.TEST_DATABASE_URL;

describe.skipIf(!TEST_DB)("lyrics_drafts upsert (SPEC #15)", () => {
  let client: Client;
  let testSongVersionId: string;
  let testBaseVersionId: string;

  beforeAll(async () => {
    client = new Client(TEST_DB!);
    await client.connect();

    // Pick any active song_versions row + its active lyrics_versions row
    const r = await client.query(`
      SELECT sv.id AS sv_id, sv.active_lyrics_version_id AS base
      FROM song_versions sv
      WHERE sv.active_lyrics_version_id IS NOT NULL
      LIMIT 1
    `);
    if (r.rows.length === 0) {
      throw new Error(
        "no song_versions with active_lyrics_version_id — run Plan 01 backfill first"
      );
    }
    testSongVersionId = r.rows[0].sv_id;
    testBaseVersionId = r.rows[0].base;
  });

  afterEach(async () => {
    await client.query(
      `DELETE FROM lyrics_drafts WHERE song_version_id = $1`,
      [testSongVersionId]
    );
  });

  it("inserts a new draft row on first save (per editor)", async () => {
    await client.query(
      `
      INSERT INTO lyrics_drafts (song_version_id, editor_id, base_version_id, verses, dirty_verse_numbers, updated_at)
      VALUES ($1, $2, $3, '[]'::jsonb, '{}', now())
    `,
      [testSongVersionId, "test_editor_A", testBaseVersionId]
    );

    const r = await client.query(
      `SELECT COUNT(*)::int AS n FROM lyrics_drafts WHERE song_version_id = $1`,
      [testSongVersionId]
    );
    expect(r.rows[0].n).toBe(1);
  });

  it("upserts: second save with same (song, editor) updates row, count unchanged", async () => {
    await client.query(
      `INSERT INTO lyrics_drafts (song_version_id, editor_id, base_version_id, verses, dirty_verse_numbers, updated_at) VALUES ($1, $2, $3, '[]'::jsonb, '{}', now())`,
      [testSongVersionId, "test_editor_A", testBaseVersionId]
    );
    await client.query(
      `
      INSERT INTO lyrics_drafts (song_version_id, editor_id, base_version_id, verses, dirty_verse_numbers, updated_at)
      VALUES ($1, $2, $3, '[{"verse_number":1}]'::jsonb, '{1}', now())
      ON CONFLICT (song_version_id, editor_id) DO UPDATE SET
        verses = EXCLUDED.verses,
        dirty_verse_numbers = EXCLUDED.dirty_verse_numbers,
        updated_at = EXCLUDED.updated_at
    `,
      [testSongVersionId, "test_editor_A", testBaseVersionId]
    );

    const r = await client.query(
      `SELECT COUNT(*)::int AS n, jsonb_array_length(verses) AS vl FROM lyrics_drafts WHERE song_version_id = $1`,
      [testSongVersionId]
    );
    expect(r.rows[0].n).toBe(1);
    expect(r.rows[0].vl).toBe(1);
  });

  it("per-editor isolation: different editor_id creates SECOND row for same song", async () => {
    await client.query(
      `INSERT INTO lyrics_drafts (song_version_id, editor_id, base_version_id, verses, dirty_verse_numbers, updated_at) VALUES ($1, $2, $3, '[]'::jsonb, '{}', now())`,
      [testSongVersionId, "test_editor_A", testBaseVersionId]
    );
    await client.query(
      `INSERT INTO lyrics_drafts (song_version_id, editor_id, base_version_id, verses, dirty_verse_numbers, updated_at) VALUES ($1, $2, $3, '[]'::jsonb, '{}', now())`,
      [testSongVersionId, "test_editor_B", testBaseVersionId]
    );

    const r = await client.query(
      `SELECT COUNT(*)::int AS n FROM lyrics_drafts WHERE song_version_id = $1`,
      [testSongVersionId]
    );
    expect(r.rows[0].n).toBe(2);
  });
});
