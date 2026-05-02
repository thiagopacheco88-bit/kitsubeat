import { test, expect } from "@playwright/test";
import { Client } from "@neondatabase/serverless";

const TEST_DB = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

test.describe("flagged song returns 404 (SPEC #22)", () => {
  let client: Client;
  let testSlug: string;
  let testSongId: string;

  test.beforeAll(async () => {
    if (!TEST_DB) {
      test.skip(true, "no database URL — skipping flagged-song-404 tests");
      return;
    }
    client = new Client(TEST_DB);
    await client.connect();
    const r = await client.query(
      `SELECT s.id::text AS id, s.slug
       FROM songs s
       WHERE s.quality_status = 'active'
       LIMIT 1`
    );
    if (r.rows.length === 0) {
      test.skip(true, "no active song to test against");
      return;
    }
    testSongId = r.rows[0].id;
    testSlug = r.rows[0].slug;
  });

  test.afterAll(async () => {
    if (!TEST_DB || !testSongId) return;
    await client.query(
      `UPDATE songs SET quality_status = 'active' WHERE id = $1`,
      [testSongId]
    );
    await client.end();
  });

  test("active song renders 200", async ({ page }) => {
    const r = await page.goto(`/songs/${testSlug}`, { waitUntil: "domcontentloaded" });
    expect(r?.status()).toBe(200);
  });

  test("flagged_wrong_song returns 404", async ({ page }) => {
    await client.query(
      `UPDATE songs SET quality_status = 'flagged_wrong_song' WHERE id = $1`,
      [testSongId]
    );
    const r = await page.goto(`/songs/${testSlug}`, { waitUntil: "domcontentloaded" });
    expect(r?.status()).toBe(404);
  });

  test("flagged_unfixable returns 404", async ({ page }) => {
    await client.query(
      `UPDATE songs SET quality_status = 'flagged_unfixable' WHERE id = $1`,
      [testSongId]
    );
    const r = await page.goto(`/songs/${testSlug}`, { waitUntil: "domcontentloaded" });
    expect(r?.status()).toBe(404);
  });

  test("clear flag restores 200", async ({ page }) => {
    await client.query(
      `UPDATE songs SET quality_status = 'active' WHERE id = $1`,
      [testSongId]
    );
    const r = await page.goto(`/songs/${testSlug}`, { waitUntil: "domcontentloaded" });
    expect(r?.status()).toBe(200);
  });
});
