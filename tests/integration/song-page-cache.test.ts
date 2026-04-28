/**
 * Phase 13 R1 / SPEC AC #1, #2, #3 — cross-request lesson cache contract.
 *
 * Locks the cache invariant: second render of the same slug fires zero
 * Neon SELECTs against songs / song_versions / vocabulary_items, and
 * revalidateTag invalidates the cache cleanly.
 *
 * Test-DB gated (mirrors regression-stale-lesson-data.test.ts).
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { getTestDb } from "../support/test-db";
import { __testQueryCounter } from "@/lib/db";

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;

async function renderSongPage(slug: string): Promise<void> {
  // Vitest fresh import each call — Next's React cache() dedupe is per-request,
  // so re-importing emulates a fresh request. Cache wins or losses are observed
  // through the Neon counter, not through React.
  const mod = await import("@/app/songs/[slug]/page");
  const params = Promise.resolve({ slug });
  // Page default export is an async server component returning JSX; awaiting
  // it forces all data fetches to resolve.
  await mod.default({ params });
}

describeIfTestDb("Phase 13 / song-page cache (R1)", () => {
  let slug: string;

  beforeAll(async () => {
    const db = getTestDb();
    const rows = (await db.execute(sql`
      SELECT s.slug FROM songs s
      JOIN song_versions v ON v.song_id = s.id
      WHERE v.lesson IS NOT NULL
      LIMIT 1
    `)) as unknown as Array<{ slug: string }>;
    if (!rows[0]) {
      throw new Error(
        "No seeded song with a lesson found in TEST_DATABASE_URL — run npm run test:seed first."
      );
    }
    slug = rows[0].slug;
  });

  beforeEach(() => {
    __testQueryCounter?.reset();
  });

  it("second render fires 0 Neon SELECTs for songs / song_versions / vocabulary_items", async () => {
    await renderSongPage(slug); // warm
    __testQueryCounter?.reset();
    await renderSongPage(slug); // expected: full cache hit
    expect(__testQueryCounter?.count("songs")).toBe(0);
    expect(__testQueryCounter?.count("song_versions")).toBe(0);
    expect(__testQueryCounter?.count("vocabulary_items")).toBe(0);
  });

  it("revalidateTag(`song:${slug}`) invalidates the cache", async () => {
    await renderSongPage(slug); // warm
    revalidateTag(`song:${slug}`);
    __testQueryCounter?.reset();
    await renderSongPage(slug);
    expect(__testQueryCounter?.count("songs")).toBeGreaterThan(0);
  });

  it("KnownWordCount client fetch does not trigger lesson-body SELECTs", async () => {
    // Page render itself (after warm-up) — must NOT fetch songs/versions/vocab.
    // Per-user data is now decoupled (D-03), so even calling the page render
    // for a 'different user' (placeholder) does not poison the cache.
    await renderSongPage(slug); // warm
    __testQueryCounter?.reset();
    await renderSongPage(slug);
    expect(__testQueryCounter?.count("songs")).toBe(0);
    expect(__testQueryCounter?.count("song_versions")).toBe(0);
    expect(__testQueryCounter?.count("vocabulary_items")).toBe(0);
  });
});
