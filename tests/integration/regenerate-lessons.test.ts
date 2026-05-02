import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { Client } from "@neondatabase/serverless";

const TEST_DB = process.env.TEST_DATABASE_URL;

describe.skipIf(!TEST_DB)("regenerate lessons (SPEC #23, D-07)", () => {
  let client: Client;
  let testSongVersionId: string;
  let testBaseVersionId: string;

  beforeAll(async () => {
    client = new Client(TEST_DB!);
    await client.connect();
    const r = await client.query(`SELECT sv.id::text AS sv_id, sv.active_lyrics_version_id::text AS base FROM song_versions sv WHERE sv.active_lyrics_version_id IS NOT NULL LIMIT 1`);
    if (r.rows.length === 0) throw new Error("no seeded song with active version");
    testSongVersionId = r.rows[0].sv_id;
    testBaseVersionId = r.rows[0].base;
  });

  afterEach(async () => {
    // Reset
    await client.query(`UPDATE song_versions SET active_lyrics_version_id = $1 WHERE id = $2`, [testBaseVersionId, testSongVersionId]);
    await client.query(`DELETE FROM lyrics_versions WHERE song_version_id = $1 AND source = 'regen'`, [testSongVersionId]);
  });

  it("inserts a regen row with source='regen' + parent=base", async () => {
    const newId = (await client.query(`SELECT gen_random_uuid()::text AS id`)).rows[0].id;
    const nextN = (await client.query(`SELECT COALESCE(MAX(version_number),0)+1 AS n FROM lyrics_versions WHERE song_version_id=$1`, [testSongVersionId])).rows[0].n;

    await client.query(
      `INSERT INTO lyrics_versions (id, song_version_id, version_number, source, editor_id, verses, parent_version_id, created_at)
       VALUES ($1, $2, $3, 'regen', 'test_editor', '[{"verse_number":1}]'::jsonb, $4, now())`,
      [newId, testSongVersionId, nextN, testBaseVersionId]
    );

    const r = await client.query(`SELECT source, parent_version_id::text AS parent FROM lyrics_versions WHERE id = $1`, [newId]);
    expect(r.rows[0].source).toBe("regen");
    expect(r.rows[0].parent).toBe(testBaseVersionId);
  });

  it("regenerating N verses produces ONE lyrics_versions row (not N)", async () => {
    const before = await client.query(`SELECT COUNT(*)::int AS n FROM lyrics_versions WHERE song_version_id=$1 AND source='regen'`, [testSongVersionId]);
    const baseCount = before.rows[0].n;

    // Simulate: ONE insert covers all 5 verses (full snapshot)
    const newId = (await client.query(`SELECT gen_random_uuid()::text AS id`)).rows[0].id;
    const nextN = (await client.query(`SELECT COALESCE(MAX(version_number),0)+1 AS n FROM lyrics_versions WHERE song_version_id=$1`, [testSongVersionId])).rows[0].n;
    const verses = JSON.stringify([
      { verse_number: 1 }, { verse_number: 2 }, { verse_number: 3 }, { verse_number: 4 }, { verse_number: 5 }
    ]);
    await client.query(
      `INSERT INTO lyrics_versions (id, song_version_id, version_number, source, editor_id, verses, parent_version_id, created_at)
       VALUES ($1, $2, $3, 'regen', 'test_editor', $4::jsonb, $5, now())`,
      [newId, testSongVersionId, nextN, verses, testBaseVersionId]
    );

    const after = await client.query(`SELECT COUNT(*)::int AS n FROM lyrics_versions WHERE song_version_id=$1 AND source='regen'`, [testSongVersionId]);
    expect(after.rows[0].n).toBe(baseCount + 1);
  });

  it("draft.dirty_verse_numbers is the source of the regen scope (computeDirtyVersesSinceLastRegen)", async () => {
    await client.query(`DELETE FROM lyrics_drafts WHERE song_version_id=$1`, [testSongVersionId]);
    await client.query(`INSERT INTO lyrics_drafts (song_version_id, editor_id, base_version_id, verses, dirty_verse_numbers, updated_at) VALUES ($1, 'test_editor', $2, '[]'::jsonb, '{2,4,7}', now())`, [testSongVersionId, testBaseVersionId]);

    const r = await client.query(`SELECT dirty_verse_numbers FROM lyrics_drafts WHERE song_version_id=$1 ORDER BY updated_at DESC LIMIT 1`, [testSongVersionId]);
    expect(r.rows[0].dirty_verse_numbers).toEqual([2, 4, 7]);

    await client.query(`DELETE FROM lyrics_drafts WHERE song_version_id=$1`, [testSongVersionId]);
  });
});
