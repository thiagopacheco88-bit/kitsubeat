/**
 * tests/support/fixtures.ts — Shared Playwright test fixtures for the QA suite.
 *
 * Re-exports `test` and `expect` from @playwright/test extended with two fixtures:
 *
 *   testUser     — async fixture that returns TEST_USER_ID and runs resetTestProgress
 *                  AFTER the test (cleanup phase). Use this in any test that touches
 *                  user_song_progress, user_vocab_mastery, or user_exercise_log.
 *
 *   seededSong   — async fixture that resolves a slug to { slug, songId, songVersionId }
 *                  by querying TEST_DATABASE_URL once per worker. Cached per worker so
 *                  many tests on the same song don't repeatedly hit the DB.
 *
 * Usage example:
 *
 *   import { test, expect } from "../support/fixtures";
 *
 *   test("plays a known song", async ({ page, testUser, seededSong }) => {
 *     const song = await seededSong("again-yui");
 *     await page.goto(`/songs/${song.slug}`);
 *     // ...assertions touching user_song_progress for testUser will be reset after
 *   });
 *
 * IMPORTANT: keep this file pure — no top-level DB queries. Playwright parses fixture
 * files at collect time; any module-level await would block the runner.
 */

import { test as base, expect } from "@playwright/test";
import { sql } from "drizzle-orm";
import {
  getTestDb,
  resetTestProgress,
  TEST_USER_ID,
  type SeededSlug,
} from "./test-db";

interface SeededSongRow {
  slug: string;
  songId: string;
  songVersionId: string;
}

/** Per-worker cache so multiple tests targeting the same slug do not re-query. */
const seededSongCache = new Map<string, SeededSongRow>();

async function loadSeededSong(slug: SeededSlug | string): Promise<SeededSongRow> {
  const cached = seededSongCache.get(slug);
  if (cached) return cached;

  const db = getTestDb();
  const rows = (await db.execute(sql`
    SELECT s.slug AS slug, s.id AS song_id, v.id AS song_version_id
      FROM songs s
      JOIN song_versions v ON v.song_id = s.id
     WHERE s.slug = ${slug}
       AND v.lesson IS NOT NULL
     ORDER BY v.version_type ASC
     LIMIT 1
  `)) as unknown as Array<{ slug: string; song_id: string; song_version_id: string }>;

  if (rows.length === 0) {
    throw new Error(
      `[fixtures] seededSong("${slug}") not found in TEST_DATABASE_URL. ` +
        `Run \`npm run test:seed\` first.`
    );
  }

  const row: SeededSongRow = {
    slug: rows[0].slug,
    songId: rows[0].song_id,
    songVersionId: rows[0].song_version_id,
  };
  seededSongCache.set(slug, row);
  return row;
}

/**
 * Fixture types extending the Playwright base test.
 * - testUser   : the TEST_USER_ID string. Cleanup wipes its progress after the test.
 * - seededSong : a function (slug) -> SeededSongRow. Memoised per worker.
 */
type Fixtures = {
  testUser: string;
  seededSong: (slug: SeededSlug | string) => Promise<SeededSongRow>;
};

export const test = base.extend<Fixtures>({
  // Worker-scoped cleanup is overkill — per-test reset is the right granularity for
  // exercise/progress writes. Each test starts with a clean slate after the previous.
  testUser: async ({}, use) => {
    await use(TEST_USER_ID);
    // Cleanup phase: wipe everything this test wrote so the next test is isolated.
    await resetTestProgress(TEST_USER_ID);
  },

  seededSong: async ({}, use) => {
    await use(loadSeededSong);
  },
});

export { expect };
