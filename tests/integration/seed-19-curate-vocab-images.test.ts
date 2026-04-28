/**
 * tests/integration/seed-19-curate-vocab-images.test.ts
 *
 * Integration test for `scripts/seed/19-curate-vocab-images.ts::runCurate` —
 * covers AC-7 (Phase 11.4 visual vocabulary foundation):
 *
 *   - TSV emits at most --limit rows (50 default)
 *   - Every emitted row has part_of_speech in {noun, verb}
 *   - Rows are sorted by appearance_count DESC (frequency-rank)
 *   - Already-curated rows (image_url IS NOT NULL) are skipped on re-run
 *
 * Skip guard: requires TEST_DATABASE_URL. Setup.ts swaps DATABASE_URL → TEST_DATABASE_URL
 * before module-level imports resolve, so getDb() inside runCurate() points at the test DB.
 *
 * The beforeEach wipes vocabulary_items.image_url destructively — appropriate on a test DB.
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { Pool } from "@neondatabase/serverless";
import { drizzle as drizzlePool } from "drizzle-orm/neon-serverless";
import { readFileSync, existsSync, unlinkSync } from "node:fs";
import { runCurate, TSV_PATH } from "../../scripts/seed/19-curate-vocab-images";

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;

function unwrap<T = unknown>(r: unknown): T[] {
  return Array.isArray(r) ? (r as T[]) : ((r as { rows?: T[] }).rows ?? []);
}

describeIfTestDb("seed-19-curate-vocab-images — AC-7", () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzlePool>;

  beforeEach(async () => {
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL! });
    db = drizzlePool(pool);
    // Reset: ensure no leftover image_url values affect the run.
    // Destructive on test DB only — production DB is never targeted (skip-guard
    // requires TEST_DATABASE_URL, not DATABASE_URL).
    await db.execute(sql`UPDATE vocabulary_items SET image_url = NULL WHERE image_url IS NOT NULL`);
    if (existsSync(TSV_PATH)) unlinkSync(TSV_PATH);
  });

  afterAll(async () => {
    if (pool) await pool.end();
    if (existsSync(TSV_PATH)) unlinkSync(TSV_PATH);
  });

  it("emits TSV with at most 50 rows and only noun/verb POS (AC-7)", async () => {
    const result = await runCurate({ limit: 50 });
    expect(existsSync(TSV_PATH)).toBe(true);

    const content = readFileSync(TSV_PATH, "utf-8");
    const lines = content
      .split(/\r?\n/)
      .filter((l) => l.trim() && !l.startsWith("#"));
    expect(lines.length).toBeLessThanOrEqual(50);
    expect(lines.length).toBe(result.count);

    for (const line of lines) {
      const cols = line.split("\t");
      const partOfSpeech = cols[4];
      expect(["noun", "verb"]).toContain(partOfSpeech);
    }
  });

  it("rows are sorted by frequency DESC (AC-7)", async () => {
    await runCurate({ limit: 10 });
    const lines = readFileSync(TSV_PATH, "utf-8")
      .split(/\r?\n/)
      .filter((l) => l.trim() && !l.startsWith("#"));

    if (lines.length < 2) {
      // Test DB has too few rows to assert ordering — skip gracefully.
      return;
    }

    const ids = lines.map((l) => l.split("\t")[0]);
    // Re-query each id's appearance_count and assert non-increasing.
    const counts: number[] = [];
    for (const id of ids) {
      const rawRows = await db.execute(sql`
        SELECT COUNT(*)::int AS c FROM vocab_global WHERE vocab_item_id = ${id}
      `);
      const [{ c }] = unwrap<{ c: number }>(rawRows);
      counts.push(c);
    }
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeLessThanOrEqual(counts[i - 1]);
    }
  });

  it("skips already-curated rows on re-run (AC-7 resume gate)", async () => {
    await runCurate({ limit: 5 });
    const firstRunLines = readFileSync(TSV_PATH, "utf-8")
      .split(/\r?\n/)
      .filter((l) => l.trim() && !l.startsWith("#"));
    if (firstRunLines.length === 0) return; // empty test DB

    const targetId = firstRunLines[0].split("\t")[0];

    // Curate a fake URL onto that row.
    await db.execute(sql`
      UPDATE vocabulary_items
        SET image_url = 'https://images.unsplash.com/photo-fake-resume-test'
        WHERE id = ${targetId}
    `);

    // Re-run curate — target should NOT appear (WHERE vi.image_url IS NULL gate).
    await runCurate({ limit: 50 });
    const secondRunLines = readFileSync(TSV_PATH, "utf-8")
      .split(/\r?\n/)
      .filter((l) => l.trim() && !l.startsWith("#"));
    const secondRunIds = secondRunLines.map((l) => l.split("\t")[0]);
    expect(secondRunIds).not.toContain(targetId);

    // Cleanup: reset that row.
    await db.execute(sql`
      UPDATE vocabulary_items SET image_url = NULL WHERE id = ${targetId}
    `);
  });
});
