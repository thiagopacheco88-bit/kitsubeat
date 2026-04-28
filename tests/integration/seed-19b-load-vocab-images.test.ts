import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { Pool } from "@neondatabase/serverless";
import { drizzle as drizzlePool } from "drizzle-orm/neon-serverless";

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;

const URL_PATTERN = /^https:\/\/images\.unsplash\.com\/.+/;

function unwrap<T = unknown>(r: unknown): T[] {
  return Array.isArray(r) ? (r as T[]) : ((r as { rows?: T[] }).rows ?? []);
}

describeIfTestDb("seed-19b-load-vocab-images — Phase 11.4 Wave 0 contracts", () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzlePool>;
  const TEST_DICT_FORM = "テスト_11_4_W0"; // unique sentinel to avoid collision

  beforeEach(async () => {
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL! });
    db = drizzlePool(pool);
    // Cleanup any leftover sentinel rows from prior runs
    await db.execute(
      sql`DELETE FROM vocabulary_items WHERE dictionary_form = ${TEST_DICT_FORM}`
    );
  });

  afterAll(async () => {
    if (pool) {
      await pool
        .query?.(
          `DELETE FROM vocabulary_items WHERE dictionary_form = '${TEST_DICT_FORM}'`
        )
        .catch(() => {});
      await pool.end();
    }
  });

  it("AC-1: vocabulary_items.image_url column exists and accepts a text value", async () => {
    await db.execute(sql`
      INSERT INTO vocabulary_items (id, dictionary_form, reading, romaji, part_of_speech, meaning, image_url)
      VALUES (gen_random_uuid(), ${TEST_DICT_FORM}, 'てすと', 'tesuto', 'noun',
              '{"en":"test","pt-BR":"teste","es":"prueba"}'::jsonb,
              'https://images.unsplash.com/photo-test')
    `);
    const rows = unwrap<{ image_url: string }>(
      await db.execute(sql`
        SELECT image_url FROM vocabulary_items
        WHERE dictionary_form = ${TEST_DICT_FORM}
      `)
    );
    expect(rows.length).toBe(1);
    expect(rows[0].image_url).toBe("https://images.unsplash.com/photo-test");
  });

  it("AC-1 negative: image_url is nullable (omitted on insert → null)", async () => {
    await db.execute(sql`
      INSERT INTO vocabulary_items (id, dictionary_form, reading, romaji, part_of_speech, meaning)
      VALUES (gen_random_uuid(), ${TEST_DICT_FORM}, 'てすと', 'tesuto', 'noun',
              '{"en":"test","pt-BR":"teste","es":"prueba"}'::jsonb)
    `);
    const rows = unwrap<{ image_url: string | null }>(
      await db.execute(sql`
        SELECT image_url FROM vocabulary_items
        WHERE dictionary_form = ${TEST_DICT_FORM}
      `)
    );
    expect(rows.length).toBe(1);
    expect(rows[0].image_url).toBeNull();
  });

  it("AC-8: URL regex accepts canonical Unsplash CDN URL", () => {
    expect(URL_PATTERN.test("https://images.unsplash.com/photo-1234567890")).toBe(
      true
    );
    expect(
      URL_PATTERN.test(
        "https://images.unsplash.com/photo-x?ixid=foo&q=80&w=400"
      )
    ).toBe(true);
  });

  it("AC-8: URL regex rejects non-Unsplash URLs", () => {
    expect(URL_PATTERN.test("https://example.com/photo.jpg")).toBe(false);
    expect(URL_PATTERN.test("https://unsplash.com/photos/abc")).toBe(false); // page URL, not CDN
    expect(URL_PATTERN.test("http://images.unsplash.com/photo-x")).toBe(false); // http not https
    expect(URL_PATTERN.test("not-a-url")).toBe(false);
    expect(URL_PATTERN.test("")).toBe(false);
  });
});
