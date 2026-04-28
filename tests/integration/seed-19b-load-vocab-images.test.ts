import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { Pool } from "@neondatabase/serverless";
import { drizzle as drizzlePool } from "drizzle-orm/neon-serverless";
import { writeFileSync, unlinkSync, existsSync as fsExistsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join as pathJoin } from "node:path";
import { runLoad } from "../../scripts/seed/19b-load-vocab-images";

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

// ====================================================================
// Phase 11.4-03 extensions: runLoad() invocation tests (AC-8 happy / reject / skip)
// ====================================================================

describeIfTestDb("seed-19b-load-vocab-images — runLoad() AC-8 invocation", () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzlePool>;
  const tmpTsvPaths: string[] = [];
  const TEST_FORMS = ["テスト_LOAD_A", "テスト_LOAD_B"] as const;
  const testIds: { [k in typeof TEST_FORMS[number]]?: string } = {};

  function makeTmpTsv(rows: { vocab_item_id: string; dictionary_form: string; image_url: string }[]): string {
    const path = pathJoin(tmpdir(), `vocab-images-test-${Date.now()}-${Math.random().toString(36).slice(2)}.tsv`);
    const lines = ["# vocab_item_id\tdictionary_form\treading\tmeaning_en\tpart_of_speech\tsuggested_query\timage_url"];
    for (const r of rows) {
      lines.push([r.vocab_item_id, r.dictionary_form, "", "", "noun", "", r.image_url].join("\t"));
    }
    writeFileSync(path, lines.join("\n") + "\n", "utf-8");
    tmpTsvPaths.push(path);
    return path;
  }

  beforeEach(async () => {
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL! });
    db = drizzlePool(pool);
    // Insert test fixtures with sentinel dictionary_form values to avoid catalog collisions.
    for (const form of TEST_FORMS) {
      await db.execute(sql`
        DELETE FROM vocabulary_items WHERE dictionary_form = ${form}
      `);
      await db.execute(sql`
        INSERT INTO vocabulary_items (id, dictionary_form, reading, romaji, part_of_speech, meaning, image_url)
        VALUES (gen_random_uuid(), ${form}, 'てすと', 'tesuto', 'noun',
                '{"en":"test","pt-BR":"teste","es":"prueba"}'::jsonb, NULL)
      `);
      const rows = unwrap<{ id: string }>(await db.execute(sql`
        SELECT id FROM vocabulary_items WHERE dictionary_form = ${form}
      `));
      testIds[form] = rows[0]?.id;
    }
  });

  afterAll(async () => {
    if (pool) {
      for (const form of TEST_FORMS) {
        await db.execute(sql`DELETE FROM vocabulary_items WHERE dictionary_form = ${form}`).catch(() => {});
      }
      await pool.end();
    }
    for (const p of tmpTsvPaths) {
      if (fsExistsSync(p)) unlinkSync(p);
    }
  });

  it("AC-8: runLoad UPDATEs valid Unsplash URLs", async () => {
    const tsvPath = makeTmpTsv([
      { vocab_item_id: testIds["テスト_LOAD_A"]!, dictionary_form: "テスト_LOAD_A", image_url: "https://images.unsplash.com/photo-load-test-a" },
      { vocab_item_id: testIds["テスト_LOAD_B"]!, dictionary_form: "テスト_LOAD_B", image_url: "https://images.unsplash.com/photo-load-test-b" },
    ]);
    const result = await runLoad({ tsvPath });
    expect(result).toEqual({ loaded: 2, skipped: 0, invalid: 0, total: 2 });

    const rowsA = unwrap<{ image_url: string }>(await db.execute(sql`
      SELECT image_url FROM vocabulary_items WHERE id = ${testIds["テスト_LOAD_A"]!}
    `));
    expect(rowsA[0].image_url).toBe("https://images.unsplash.com/photo-load-test-a");
  });

  it("AC-8: runLoad rejects non-Unsplash URLs", async () => {
    const tsvPath = makeTmpTsv([
      { vocab_item_id: testIds["テスト_LOAD_A"]!, dictionary_form: "テスト_LOAD_A", image_url: "https://example.com/photo.jpg" },
    ]);
    const result = await runLoad({ tsvPath });
    expect(result).toEqual({ loaded: 0, skipped: 0, invalid: 1, total: 1 });

    const rows = unwrap<{ image_url: string | null }>(await db.execute(sql`
      SELECT image_url FROM vocabulary_items WHERE id = ${testIds["テスト_LOAD_A"]!}
    `));
    expect(rows[0].image_url).toBeNull();
  });

  it("AC-8: runLoad skips rows with empty image_url", async () => {
    const tsvPath = makeTmpTsv([
      { vocab_item_id: testIds["テスト_LOAD_A"]!, dictionary_form: "テスト_LOAD_A", image_url: "https://images.unsplash.com/photo-skip-test" },
      { vocab_item_id: testIds["テスト_LOAD_B"]!, dictionary_form: "テスト_LOAD_B", image_url: "" },
    ]);
    const result = await runLoad({ tsvPath });
    expect(result).toEqual({ loaded: 1, skipped: 1, invalid: 0, total: 2 });
  });
});
