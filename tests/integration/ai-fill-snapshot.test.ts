import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { Client } from "@neondatabase/serverless";

const TEST_DB = process.env.TEST_DATABASE_URL;

describe.skipIf(!TEST_DB)("ai-fill snapshot row (SPEC #11)", () => {
  let client: Client;
  let testSongVersionId: string;
  let testBaseVersionId: string;

  beforeAll(async () => {
    client = new Client(TEST_DB!);
    await client.connect();
    const r = await client.query(`
      SELECT sv.id AS sv_id, sv.active_lyrics_version_id AS base
      FROM song_versions sv
      WHERE sv.active_lyrics_version_id IS NOT NULL
      LIMIT 1
    `);
    if (r.rows.length === 0) throw new Error("no seeded song with active version — run Plan 01");
    testSongVersionId = r.rows[0].sv_id;
    testBaseVersionId = r.rows[0].base;
  });

  afterEach(async () => {
    await client.query(`DELETE FROM lyrics_versions WHERE song_version_id = $1 AND source = 'ai-assist'`, [testSongVersionId]);
  });

  it("inserting an ai-assist row carries source='ai-assist' and parent=base", async () => {
    const r = await client.query(
      `INSERT INTO lyrics_versions
         (song_version_id, version_number, source, editor_id, verses, parent_version_id, created_at)
       VALUES
         ($1, (SELECT COALESCE(MAX(version_number),0)+1 FROM lyrics_versions WHERE song_version_id=$1),
          'ai-assist', 'test_editor', '[]'::jsonb, $2, now())
       RETURNING id`,
      [testSongVersionId, testBaseVersionId]
    );
    expect(r.rows[0].id).toBeTruthy();

    const got = await client.query(`SELECT source, parent_version_id::text AS parent FROM lyrics_versions WHERE id = $1`, [r.rows[0].id]);
    expect(got.rows[0].source).toBe("ai-assist");
    expect(got.rows[0].parent).toBe(testBaseVersionId);
  });

  it("multiple clicks produce multiple rows (SPEC #11: every click)", async () => {
    for (let i = 0; i < 3; i++) {
      await client.query(
        `INSERT INTO lyrics_versions
           (song_version_id, version_number, source, editor_id, verses, parent_version_id, created_at)
         VALUES
           ($1, (SELECT COALESCE(MAX(version_number),0)+1 FROM lyrics_versions WHERE song_version_id=$1),
            'ai-assist', 'test_editor', '[]'::jsonb, $2, now())`,
        [testSongVersionId, testBaseVersionId]
      );
    }
    const r = await client.query(`SELECT COUNT(*)::int AS n FROM lyrics_versions WHERE song_version_id = $1 AND source = 'ai-assist'`, [testSongVersionId]);
    expect(r.rows[0].n).toBe(3);
  });
});
