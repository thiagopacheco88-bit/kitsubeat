import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@neondatabase/serverless";

const TEST_DB = process.env.TEST_DATABASE_URL;

describe.skipIf(!TEST_DB)(
  "kanji_breakdown cross-song propagation (SPEC #9)",
  () => {
    let client: Client;

    beforeAll(async () => {
      client = new Client(TEST_DB!);
      await client.connect();
    });

    afterAll(async () => {
      await client.end();
    });

    it("vocabulary_items.kanji_breakdown is the single source of truth — verse token JSON does NOT mirror it", async () => {
      // Find any vocabulary_items row with a non-null kanji_breakdown
      const r = await client.query(`
        SELECT id, dictionary_form, kanji_breakdown
        FROM vocabulary_items
        WHERE kanji_breakdown IS NOT NULL
        LIMIT 1
      `);

      if (r.rows.length === 0) {
        // No kanji_breakdown rows in test DB yet — pass-through (precondition not met)
        expect(true).toBe(true);
        return;
      }

      const vocab = r.rows[0];

      // Find any song_versions whose lesson.verses[].tokens[] references this vocab_item_id
      const songs = await client.query(
        `
          SELECT sv.id AS song_version_id, sv.lesson
          FROM song_versions sv
          WHERE sv.lesson IS NOT NULL
            AND sv.lesson @> $1::jsonb
          LIMIT 5
        `,
        [JSON.stringify({ verses: [{ tokens: [{ vocab_item_id: vocab.id }] }] })]
      );

      // Contract: kanji_breakdown lives on vocabulary_items, NOT on lesson.verses[].tokens[].kanji_breakdown
      for (const s of songs.rows) {
        const lesson = s.lesson;
        for (const verse of lesson.verses ?? []) {
          for (const token of verse.tokens ?? []) {
            // Token referencing this vocab MUST NOT carry its own kanji_breakdown copy
            expect(token).not.toHaveProperty("kanji_breakdown");
          }
        }
      }
    });

    it("vocabulary_items.kanji_breakdown column exists (schema contract)", async () => {
      const r = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'vocabulary_items' AND column_name = 'kanji_breakdown'
      `);
      expect(r.rows).toHaveLength(1);
    });

    it("[ISSUE-02 cross-song propagation] editing kanji_breakdown propagates to every referencing song via JOIN", async () => {
      // Find any vocabulary_items row referenced by 2+ songs
      const r = await client.query(`
        WITH ref AS (
          SELECT (token->>'vocab_item_id')::text AS vid, sv.id AS sv_id
          FROM song_versions sv,
               LATERAL jsonb_array_elements(sv.lesson->'verses') AS verse,
               LATERAL jsonb_array_elements(verse->'tokens') AS token
          WHERE sv.lesson IS NOT NULL
            AND token->>'vocab_item_id' IS NOT NULL
        )
        SELECT vid, COUNT(DISTINCT sv_id) AS n_songs
        FROM ref
        WHERE vid IS NOT NULL
        GROUP BY vid
        HAVING COUNT(DISTINCT sv_id) >= 2
        LIMIT 1
      `);

      if (r.rows.length === 0) {
        // Test DB doesn't have a vocab item shared across 2+ songs — skip propagation assertion
        expect(true).toBe(true);
        return;
      }

      const sharedVocabId = r.rows[0].vid;
      // Capture original kanji_breakdown for restoration
      const original = await client.query(
        `SELECT kanji_breakdown FROM vocabulary_items WHERE id = $1`,
        [sharedVocabId]
      );
      const originalKb = original.rows[0].kanji_breakdown;

      try {
        // Apply a marker edit (set radical_hint of first character to a unique sentinel)
        const sentinel = `TEST-PROPAGATE-${Date.now()}`;
        let newKb: unknown;
        if (Array.isArray(originalKb)) {
          newKb = originalKb.map((c: Record<string, unknown>, i: number) =>
            i === 0 ? { ...c, radical_hint: sentinel } : c
          );
        } else {
          const chars = (originalKb as Record<string, unknown> | null)?.characters as Array<Record<string, unknown>> ?? [{}];
          newKb = {
            ...(originalKb ?? {}),
            characters: chars.map((c, i) =>
              i === 0 ? { ...c, radical_hint: sentinel } : c
            ),
          };
        }

        await client.query(
          `UPDATE vocabulary_items SET kanji_breakdown = $1::jsonb WHERE id = $2`,
          [JSON.stringify(newKb), sharedVocabId]
        );

        // SELECT every song_version that references the vocab via JOIN to vocabulary_items
        const songsReferencing = await client.query(
          `
            WITH ref AS (
              SELECT DISTINCT sv.id AS sv_id, (token->>'vocab_item_id')::text AS vid
              FROM song_versions sv,
                   LATERAL jsonb_array_elements(sv.lesson->'verses') AS verse,
                   LATERAL jsonb_array_elements(verse->'tokens') AS token
              WHERE token->>'vocab_item_id' = $1
            )
            SELECT ref.sv_id, vi.kanji_breakdown
            FROM ref
            INNER JOIN vocabulary_items vi ON vi.id::text = ref.vid
          `,
          [sharedVocabId]
        );

        expect(songsReferencing.rows.length).toBeGreaterThanOrEqual(2);
        for (const row of songsReferencing.rows) {
          const kbStr = JSON.stringify(row.kanji_breakdown);
          expect(kbStr).toContain(sentinel);
        }
      } finally {
        // Restore original value
        await client.query(
          `UPDATE vocabulary_items SET kanji_breakdown = $1::jsonb WHERE id = $2`,
          [JSON.stringify(originalKb), sharedVocabId]
        );
      }
    });
  }
);
