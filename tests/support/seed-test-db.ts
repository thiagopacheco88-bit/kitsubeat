/**
 * tests/support/seed-test-db.ts — Idempotent QA-suite seed/verify script.
 *
 * Run BEFORE the test suite (npm run test:seed, also chained first by test:all):
 *   npx tsx tests/support/seed-test-db.ts
 *
 * What this script does:
 *   1. Loads .env.test (TEST_DATABASE_URL).
 *   2. Connects to TEST_DATABASE_URL via getTestDb().
 *   3. Verifies each SEEDED_SLUGS entry exists in `songs` and has at least one
 *      `song_versions` row with non-null lesson JSONB.
 *   4. Calls resetTestProgress(TEST_USER_ID) so every CI run starts clean.
 *   5. Exits 0 on success, 1 with a clear error message on failure.
 *
 * What this script does NOT do:
 *   - It does NOT copy data from the dev DB. Operator must run `npm run seed:dev`
 *     against TEST_DATABASE_URL beforehand to populate songs/song_versions.
 *   - It does NOT mutate songs / song_versions. Catalog state is treated as immutable
 *     read-only fixture data.
 *
 * Why exit 1 on missing slugs?
 *   Better to fail loudly here than have downstream Playwright tests report cryptic
 *   404s or empty selectors. The whole `test:all` chain aborts early — saves the
 *   15-minute suite budget.
 */

import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";

// Load .env.test BEFORE importing test-db (so TEST_DATABASE_URL is set at module init).
const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../../.env.test") });
// Fallback to .env.local if .env.test does not export TEST_DATABASE_URL — useful for
// quick local runs where the operator sets TEST_DATABASE_URL inline in .env.local.
if (!process.env.TEST_DATABASE_URL) {
  config({ path: resolve(__dirname, "../../.env.local") });
}

import { sql } from "drizzle-orm";
import {
  getTestDb,
  resetTestProgress,
  seedTestUser,
  SEEDED_SLUGS,
  TEST_USER_ID,
} from "./test-db.js";

interface SlugCheckResult {
  slug: string;
  songFound: boolean;
  versionWithLesson: boolean;
}

async function checkSlug(slug: string): Promise<SlugCheckResult> {
  const db = getTestDb();
  const rows = (await db.execute(sql`
    SELECT s.id AS song_id,
           COUNT(v.id) FILTER (WHERE v.lesson IS NOT NULL) AS versions_with_lesson
      FROM songs s
      LEFT JOIN song_versions v ON v.song_id = s.id
     WHERE s.slug = ${slug}
     GROUP BY s.id
  `)) as unknown as Array<{ song_id: string; versions_with_lesson: number | string }>;

  if (rows.length === 0) {
    return { slug, songFound: false, versionWithLesson: false };
  }
  const versionsWithLesson = Number(rows[0].versions_with_lesson ?? 0);
  return { slug, songFound: true, versionWithLesson: versionsWithLesson > 0 };
}

async function main(): Promise<void> {
  if (!process.env.TEST_DATABASE_URL) {
    console.error(
      "[seed-test-db] FAIL: TEST_DATABASE_URL is not set.\n" +
        "  Copy .env.test.example to .env.test and point it at a separate Neon database.\n" +
        "  Then run `npm run seed:dev` against that database before re-running this script."
    );
    process.exit(1);
  }

  console.log(`[seed-test-db] Verifying ${SEEDED_SLUGS.length} seeded slugs in TEST_DATABASE_URL...`);

  const checks = await Promise.all(SEEDED_SLUGS.map(checkSlug));
  const missing = checks.filter((c) => !c.songFound);
  const lessonless = checks.filter((c) => c.songFound && !c.versionWithLesson);

  if (missing.length > 0 || lessonless.length > 0) {
    console.error("[seed-test-db] FAIL: catalog is not ready for the QA suite.");
    if (missing.length > 0) {
      console.error("  Missing slug(s) in `songs`:");
      for (const m of missing) console.error(`    - ${m.slug}`);
    }
    if (lessonless.length > 0) {
      console.error("  Slug(s) present but no song_versions row has lesson JSONB:");
      for (const l of lessonless) console.error(`    - ${l.slug}`);
    }
    console.error(
      "  Fix: run `npm run seed:dev` against TEST_DATABASE_URL (your test database)\n" +
        "  to populate the catalog, then re-run this script."
    );
    process.exit(1);
  }

  console.log("[seed-test-db] All seeded slugs present with lesson JSONB:");
  for (const c of checks) console.log(`    PASS  ${c.slug}`);

  // Idempotent reset of test-user progress so the suite always starts from zero.
  await seedTestUser();
  await resetTestProgress(TEST_USER_ID);
  console.log(`[seed-test-db] Reset progress / mastery / log rows for ${TEST_USER_ID}.`);

  console.log("[seed-test-db] OK — TEST_DATABASE_URL is ready.");
}

main().catch((err) => {
  console.error("[seed-test-db] FAIL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
