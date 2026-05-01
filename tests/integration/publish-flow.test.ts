import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { Client } from "@neondatabase/serverless";

const TEST_DB = process.env.TEST_DATABASE_URL;

describe.skipIf(!TEST_DB)("publish flow atomicity (SPEC #15-#17, D-15)", () => {
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
      throw new Error("no seeded song with active version — run Plan 01");
    testSongVersionId = r.rows[0].sv_id;
    testBaseVersionId = r.rows[0].base;
  });

  afterEach(async () => {
    // Reset to baseline: delete any 'human' rows we added
    await client.query(
      `UPDATE song_versions SET active_lyrics_version_id = $1 WHERE id = $2`,
      [testBaseVersionId, testSongVersionId]
    );
    await client.query(
      `DELETE FROM lyrics_versions WHERE song_version_id = $1 AND source = 'human'`,
      [testSongVersionId]
    );
    await client.query(
      `DELETE FROM lyrics_drafts WHERE song_version_id = $1`,
      [testSongVersionId]
    );
  });

  it("atomic batch: insert + update active + delete draft all succeed together", async () => {
    // Setup: write a draft
    await client.query(
      `INSERT INTO lyrics_drafts (song_version_id, editor_id, base_version_id, verses, dirty_verse_numbers, updated_at)
       VALUES ($1, 'test_editor', $2, '[]'::jsonb, '{}', now())`,
      [testSongVersionId, testBaseVersionId]
    );

    const beforeLv = await client.query(
      `SELECT COUNT(*)::int AS n FROM lyrics_versions WHERE song_version_id = $1`,
      [testSongVersionId]
    );
    const beforeDraft = await client.query(
      `SELECT COUNT(*)::int AS n FROM lyrics_drafts WHERE song_version_id = $1`,
      [testSongVersionId]
    );
    expect(beforeDraft.rows[0].n).toBe(1);

    // Simulate publishLyricsVersion's batch (3 statements)
    await client.query(`BEGIN`);
    const newId = (
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
       VALUES ($1, $2, $3, 'human', 'test_editor', '[{"verse_number":1}]'::jsonb, $4, now())`,
      [newId, testSongVersionId, nextN, testBaseVersionId]
    );
    await client.query(
      `UPDATE song_versions
          SET active_lyrics_version_id = $1,
              lesson = jsonb_set(COALESCE(lesson, '{}'::jsonb), '{verses}', '[{"verse_number":1}]'::jsonb)
        WHERE id = $2 AND active_lyrics_version_id = $3`,
      [newId, testSongVersionId, testBaseVersionId]
    );
    await client.query(
      `DELETE FROM lyrics_drafts WHERE song_version_id = $1 AND editor_id = 'test_editor'`,
      [testSongVersionId]
    );
    await client.query(`COMMIT`);

    const afterLv = await client.query(
      `SELECT COUNT(*)::int AS n FROM lyrics_versions WHERE song_version_id = $1`,
      [testSongVersionId]
    );
    const afterDraft = await client.query(
      `SELECT COUNT(*)::int AS n FROM lyrics_drafts WHERE song_version_id = $1`,
      [testSongVersionId]
    );
    const activeId = (
      await client.query(
        `SELECT active_lyrics_version_id::text AS id FROM song_versions WHERE id = $1`,
        [testSongVersionId]
      )
    ).rows[0].id;

    expect(afterLv.rows[0].n).toBe(beforeLv.rows[0].n + 1);
    expect(afterDraft.rows[0].n).toBe(0);
    expect(activeId).toBe(newId);
  });

  it("jsonb_set preserves vocabulary + grammar_points siblings", async () => {
    // Setup: ensure lesson has non-verses keys
    await client.query(
      `UPDATE song_versions
          SET lesson = jsonb_set(COALESCE(lesson, '{}'::jsonb), '{vocabulary}', '[{"sentinel":true}]'::jsonb)
        WHERE id = $1
          AND (lesson->'vocabulary' IS NULL OR lesson->'vocabulary' = 'null'::jsonb)`,
      [testSongVersionId]
    );

    const before = await client.query(
      `SELECT lesson->'vocabulary' AS vocab FROM song_versions WHERE id = $1`,
      [testSongVersionId]
    );

    // Run a jsonb_set verses-only update
    await client.query(
      `UPDATE song_versions
          SET lesson = jsonb_set(COALESCE(lesson, '{}'::jsonb), '{verses}', '[{"verse_number":1}]'::jsonb)
        WHERE id = $1`,
      [testSongVersionId]
    );

    const after = await client.query(
      `SELECT lesson->'vocabulary' AS vocab, lesson->'verses' AS verses
         FROM song_versions WHERE id = $1`,
      [testSongVersionId]
    );

    expect(JSON.stringify(after.rows[0].vocab)).toBe(
      JSON.stringify(before.rows[0].vocab)
    );
    expect(after.rows[0].verses).toEqual([{ verse_number: 1 }]);
  });
});
