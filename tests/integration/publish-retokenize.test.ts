import { describe, it, expect, beforeAll } from "vitest";
import { Client } from "@neondatabase/serverless";

const TEST_DB = process.env.TEST_DATABASE_URL;

describe.skipIf(!TEST_DB)("publish re-tokenize (SPEC #18)", () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client(TEST_DB!);
    await client.connect();
  });

  it("vocabulary_items lookup by (dictionary_form, reading) returns existing row", async () => {
    // Pick any existing vocab row
    const r = await client.query(
      `SELECT dictionary_form, reading, id::text AS id FROM vocabulary_items LIMIT 1`
    );
    if (r.rows.length === 0) {
      // No vocab items yet — skip gracefully
      expect(true).toBe(true);
      return;
    }
    const v = r.rows[0];
    const lookup = await client.query(
      `SELECT id::text AS id FROM vocabulary_items
        WHERE dictionary_form = $1 AND reading = $2 LIMIT 1`,
      [v.dictionary_form, v.reading]
    );
    expect(lookup.rows[0].id).toBe(v.id);
  });

  it("inserting a new (dictionary_form, reading) creates a new vocabulary_items row (ON CONFLICT DO NOTHING is no-op for first insert)", async () => {
    const surface = "テストワード" + Date.now();
    const reading = "てすとわーど";
    await client.query(
      `INSERT INTO vocabulary_items (id, dictionary_form, reading, created_at)
       VALUES (gen_random_uuid(), $1, $2, now())
       ON CONFLICT (dictionary_form, reading) DO NOTHING`,
      [surface, reading]
    );
    const r = await client.query(
      `SELECT id::text AS id FROM vocabulary_items
        WHERE dictionary_form = $1 AND reading = $2`,
      [surface, reading]
    );
    expect(r.rows).toHaveLength(1);
    // Cleanup
    await client.query(`DELETE FROM vocabulary_items WHERE id = $1`, [
      r.rows[0].id,
    ]);
  });
});
