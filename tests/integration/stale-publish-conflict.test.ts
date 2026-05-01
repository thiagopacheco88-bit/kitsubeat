import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { Client } from "@neondatabase/serverless";

const TEST_DB = process.env.TEST_DATABASE_URL;

describe.skipIf(!TEST_DB)("stale publish detection (D-18)", () => {
  let client: Client;
  let testSongVersionId: string;
  let testBaseVersionId: string;

  beforeAll(async () => {
    client = new Client(TEST_DB!);
    await client.connect();
    const r = await client.query(
      `SELECT sv.id AS sv_id, sv.active_lyrics_version_id AS base
         FROM song_versions sv
         WHERE sv.active_lyrics_version_id IS NOT NULL
         LIMIT 1`
    );
    if (r.rows.length === 0)
      throw new Error("no seeded song — run Plan 01 backfill");
    testSongVersionId = r.rows[0].sv_id;
    testBaseVersionId = r.rows[0].base;
  });

  afterEach(async () => {
    await client.query(
      `UPDATE song_versions SET active_lyrics_version_id = $1 WHERE id = $2`,
      [testBaseVersionId, testSongVersionId]
    );
    await client.query(
      `DELETE FROM lyrics_versions WHERE song_version_id = $1 AND source = 'human'`,
      [testSongVersionId]
    );
  });

  it("UPDATE guarded by active_lyrics_version_id = baseVersionId rejects stale publish", async () => {
    // Admin A publishes (success)
    const newIdA = (
      await client.query(`SELECT gen_random_uuid()::text AS id`)
    ).rows[0].id;
    const nextN = (
      await client.query(
        `SELECT COALESCE(MAX(version_number),0)+1 AS n FROM lyrics_versions WHERE song_version_id=$1`,
        [testSongVersionId]
      )
    ).rows[0].n;
    await client.query(
      `INSERT INTO lyrics_versions
         (id, song_version_id, version_number, source, editor_id, verses, parent_version_id, created_at)
       VALUES ($1, $2, $3, 'human', 'A', '[]'::jsonb, $4, now())`,
      [newIdA, testSongVersionId, nextN, testBaseVersionId]
    );
    await client.query(
      `UPDATE song_versions
          SET active_lyrics_version_id = $1
        WHERE id = $2 AND active_lyrics_version_id = $3`,
      [newIdA, testSongVersionId, testBaseVersionId]
    );

    // Admin B (still on baseVersionId) tries to publish — guarded UPDATE returns 0 rows
    const newIdB = (
      await client.query(`SELECT gen_random_uuid()::text AS id`)
    ).rows[0].id;
    const updateB = await client.query(
      `UPDATE song_versions
          SET active_lyrics_version_id = $1
        WHERE id = $2 AND active_lyrics_version_id = $3
       RETURNING id`,
      [newIdB, testSongVersionId, testBaseVersionId]
    );
    expect(updateB.rows).toHaveLength(0); // guard rejected

    // Active pointer still on A's version
    const final = await client.query(
      `SELECT active_lyrics_version_id::text AS id FROM song_versions WHERE id = $1`,
      [testSongVersionId]
    );
    expect(final.rows[0].id).toBe(newIdA);
  });
});
