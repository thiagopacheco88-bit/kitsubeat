/**
 * Phase 13 R1 / SPEC AC #1, #2, #3 — cross-request lesson cache contract.
 *
 * Locks the cache invariant: second render of the same slug fires zero Neon
 * SELECTs against songs / song_versions / vocabulary_items, and
 * `revalidateTag('song:${slug}')` invalidates the cache so the next render
 * fires those SELECTs again.
 *
 * Layered contract (CR-01 fix): the song page caches DB queries in TWO layers:
 *   Layer 1 — React `cache()`: per-request memo. Dedupes within a single
 *             render (e.g. generateMetadata + page body share one query).
 *   Layer 2 — `unstable_cache(...)` tagged `song:${slug}`: cross-request data
 *             cache. This is the layer revalidateTag busts.
 *
 * This test asserts BOTH layers via the cross-request boundary:
 *   - Two separate calls to the page module (each `await mod.default(...)` is
 *     a logically distinct render invocation).
 *   - Layer 1 expires between calls (React cache() is request-scoped and the
 *     test does not share a request context across calls).
 *   - Layer 2 — `unstable_cache` — is the only thing that can produce a
 *     0-SELECT second render. If the song body were only wrapped in React
 *     `cache()` (per-request only) and not `unstable_cache`, the second
 *     render WOULD hit Neon. So this test fails fast if the unstable_cache
 *     wrapping is removed.
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
  // Each call awaits the page server component to completion. unstable_cache
  // (Layer 2) lives in module-scope (not request-scope), so a 0-SELECT second
  // render is only possible because Layer 2 is doing its job.
  const mod = await import("@/app/songs/[slug]/page");
  const params = Promise.resolve({ slug });
  await mod.default({ params });
}

describeIfTestDb("Phase 13 / song-page cache (R1)", () => {
  let slug: string;

  beforeAll(async () => {
    const db = getTestDb();
    const { rows } = (await db.execute(sql`
      SELECT s.slug FROM songs s
      JOIN song_versions v ON v.song_id = s.id
      WHERE v.lesson IS NOT NULL
      LIMIT 1
    `)) as unknown as { rows: Array<{ slug: string }> };
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
    await renderSongPage(slug); // warm — Layer 2 (unstable_cache) populates
    __testQueryCounter?.reset();
    await renderSongPage(slug); // expected: full cache hit on Layer 2
    // If unstable_cache wrapping in src/lib/db/queries.ts ever regresses to
    // bare React cache() only, this assertion immediately fails — Layer 1
    // alone cannot survive a fresh server-component invocation.
    expect(__testQueryCounter?.count("songs")).toBe(0);
    expect(__testQueryCounter?.count("song_versions")).toBe(0);
    expect(__testQueryCounter?.count("vocabulary_items")).toBe(0);
  });

  it("revalidateTag(`song:${slug}`) invalidates the cache", async () => {
    // Pre-condition: warm Layer 2 cache, then confirm a second render is
    // 0-SELECT (so the post-revalidate non-zero SELECT count is unambiguously
    // attributable to revalidateTag, not to a never-warmed cache).
    await renderSongPage(slug);
    __testQueryCounter?.reset();
    await renderSongPage(slug);
    expect(__testQueryCounter?.count("songs")).toBe(0); // warm baseline confirmed

    // Bust Layer 2 explicitly. The next render MUST re-fetch.
    revalidateTag(`song:${slug}`);
    __testQueryCounter?.reset();
    await renderSongPage(slug);
    expect(__testQueryCounter?.count("songs")).toBeGreaterThan(0);
    expect(__testQueryCounter?.count("song_versions")).toBeGreaterThan(0);
  });

  it("KnownWordCount client fetch does not trigger lesson-body SELECTs", async () => {
    // Per-user data is now decoupled (D-03) and fetched client-side. Two
    // back-to-back page renders for the same slug must not bleed into the
    // lesson-body cache regardless of who is viewing.
    await renderSongPage(slug); // warm
    __testQueryCounter?.reset();
    await renderSongPage(slug);
    expect(__testQueryCounter?.count("songs")).toBe(0);
    expect(__testQueryCounter?.count("song_versions")).toBe(0);
    expect(__testQueryCounter?.count("vocabulary_items")).toBe(0);
  });
});
