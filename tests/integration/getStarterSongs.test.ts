/**
 * tests/integration/getStarterSongs.test.ts
 *
 * Integration coverage for getStarterSongs() filter + warn behavior.
 * Phase 14.1 D-01: filter-and-warn (not throw) for drifted starter slugs.
 *
 * Test 5 (live DB): confirms the current happy path returns exactly 3 rows
 * for the 3 known starter slugs when TEST_DATABASE_URL is available.
 *
 * Requires: TEST_DATABASE_URL set + test DB seeded with the 3 starter slugs.
 * Skip guard: uses describe.skip when TEST_DATABASE_URL is absent.
 */
import { describe, it, expect } from "vitest";
import { STARTER_SONG_SLUGS } from "@/lib/gamification/starter-songs";

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;

describeIfTestDb("getStarterSongs() — live DB integration (Test 5)", () => {
  it("returns exactly 3 rows matching the 3 approved starter slugs", async () => {
    // Import after skip guard so the db module is only loaded when TEST_DATABASE_URL
    // is available — avoids connection-refused errors in non-DB CI environments.
    const { getStarterSongs } = await import(
      "@/lib/gamification/starter-songs"
    );

    const result = await getStarterSongs();

    expect(result).toHaveLength(3);

    const returnedSlugs = result.map((r) => r.slug);
    for (const expectedSlug of STARTER_SONG_SLUGS) {
      expect(returnedSlugs).toContain(expectedSlug);
    }

    // Each row must have the StarterSongRow required fields
    for (const row of result) {
      expect(typeof row.slug).toBe("string");
      expect(typeof row.title).toBe("string");
      expect(typeof row.anime).toBe("string");
      // jlpt_level is nullable
      // youtube_id is nullable
      // thumbnail_url is derived from youtube_id — either null or a valid URL
      if (row.youtube_id !== null) {
        expect(row.thumbnail_url).toMatch(
          /https:\/\/img\.youtube\.com\/vi\/.+\/hqdefault\.jpg/
        );
      }
    }
  });
});
