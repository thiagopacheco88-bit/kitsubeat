/**
 * tests/integration/getContinueLearning.test.ts
 *
 * Integration coverage for getContinueLearning() — filter + ordering + limit + shape + stars derivation.
 * Phase 14.2 D-01 / D-02 / D-03 / D-14.
 *
 * What is asserted:
 *   Test 1 (filter):            completion_pct = 0 rows are excluded; only > 0 rows returned.
 *   Test 2 (ordering):          results ordered by updated_at DESC (newer first).
 *   Test 3 (limit):             default limit = 3; explicit limit overrides.
 *   Test 4 (9 fields per D-03): returned shape has exactly slug, title, artist, anime, youtube_id,
 *                                jlpt_level, completion_pct, updated_at, stars.
 *   Test 5 (stars derivation):  stars computed via deriveStars() at read time (D-14 single-source-of-truth).
 *
 * Hermeticism:
 *   - beforeEach: resetTestProgress(TEST_USER_ID) — wipes all progress rows
 *   - afterAll:   resetTestProgress(TEST_USER_ID)
 *
 * Env requirement:
 *   - TEST_DATABASE_URL must be set.
 *   - Test DB must be seeded (npm run seed:dev against TEST_DATABASE_URL).
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import {
  getTestDb,
  resetTestProgress,
  TEST_USER_ID,
} from "../support/test-db";
import { deriveStars } from "@/lib/db/schema";

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;

// ---------------------------------------------------------------------------
// Test DB helpers
// ---------------------------------------------------------------------------

/**
 * Returns N song_versions from the test DB that belong to active ja songs
 * with a non-null youtube_id (TV version preferred). Capped to `count`.
 */
async function getTestSongVersions(count: number): Promise<
  Array<{
    id: string;
    song_id: string;
    slug: string;
    youtube_id: string | null;
    jlpt_level: string | null;
    has_grammar: boolean;
  }>
> {
  const db = getTestDb();
  const raw = (await db.execute(sql`
    SELECT
      sv.id::text                             AS id,
      sv.song_id::text                        AS song_id,
      s.slug,
      s.jlpt_level,
      (
        SELECT sv2.youtube_id
        FROM song_versions sv2
        WHERE sv2.song_id = sv.song_id AND sv2.youtube_id IS NOT NULL
        ORDER BY CASE sv2.version_type WHEN 'tv' THEN 0 ELSE 1 END
        LIMIT 1
      )                                       AS youtube_id,
      EXISTS (
        SELECT 1 FROM song_version_grammar_rules svgr
        WHERE svgr.song_version_id = sv.id
      )                                       AS has_grammar
    FROM song_versions sv
    INNER JOIN songs s ON s.id = sv.song_id
    WHERE sv.lesson IS NOT NULL
      AND s.language = 'ja'
      AND s.quality_status = 'active'
    ORDER BY s.popularity_rank ASC NULLS LAST
    LIMIT ${count}
  `)) as unknown as Array<{
    id: string;
    song_id: string;
    slug: string;
    youtube_id: string | null;
    jlpt_level: string | null;
    has_grammar: boolean;
  }> | { rows: Array<{
    id: string;
    song_id: string;
    slug: string;
    youtube_id: string | null;
    jlpt_level: string | null;
    has_grammar: boolean;
  }> };

  return Array.isArray(raw) ? raw : (raw.rows ?? []);
}

/**
 * Inserts a row directly into user_song_progress.
 * More deterministic than saveSessionResults for seeding specific values.
 */
async function insertProgress(opts: {
  userId: string;
  songVersionId: string;
  completionPct: number;
  updatedAt?: string; // ISO string; defaults to NOW()
  ex1_2_3?: number | null;
  ex4?: number | null;
  ex6?: number | null;
  grammarBestAccuracy?: number | null;
}): Promise<void> {
  const db = getTestDb();
  const {
    userId,
    songVersionId,
    completionPct,
    updatedAt,
    ex1_2_3 = null,
    ex4 = null,
    ex6 = null,
    grammarBestAccuracy = null,
  } = opts;

  if (updatedAt) {
    await db.execute(sql`
      INSERT INTO user_song_progress
        (user_id, song_version_id, completion_pct, updated_at,
         ex1_2_3_best_accuracy, ex4_best_accuracy, ex6_best_accuracy, grammar_best_accuracy)
      VALUES
        (${userId}, ${songVersionId}::uuid, ${completionPct}, ${updatedAt}::timestamptz,
         ${ex1_2_3}, ${ex4}, ${ex6}, ${grammarBestAccuracy})
      ON CONFLICT (user_id, song_version_id) DO UPDATE SET
        completion_pct           = EXCLUDED.completion_pct,
        updated_at               = EXCLUDED.updated_at,
        ex1_2_3_best_accuracy    = EXCLUDED.ex1_2_3_best_accuracy,
        ex4_best_accuracy        = EXCLUDED.ex4_best_accuracy,
        ex6_best_accuracy        = EXCLUDED.ex6_best_accuracy,
        grammar_best_accuracy    = EXCLUDED.grammar_best_accuracy
    `);
  } else {
    await db.execute(sql`
      INSERT INTO user_song_progress
        (user_id, song_version_id, completion_pct,
         ex1_2_3_best_accuracy, ex4_best_accuracy, ex6_best_accuracy, grammar_best_accuracy)
      VALUES
        (${userId}, ${songVersionId}::uuid, ${completionPct},
         ${ex1_2_3}, ${ex4}, ${ex6}, ${grammarBestAccuracy})
      ON CONFLICT (user_id, song_version_id) DO UPDATE SET
        completion_pct           = EXCLUDED.completion_pct,
        updated_at               = NOW(),
        ex1_2_3_best_accuracy    = EXCLUDED.ex1_2_3_best_accuracy,
        ex4_best_accuracy        = EXCLUDED.ex4_best_accuracy,
        ex6_best_accuracy        = EXCLUDED.ex6_best_accuracy,
        grammar_best_accuracy    = EXCLUDED.grammar_best_accuracy
    `);
  }
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describeIfTestDb("getContinueLearning() — live DB integration", () => {
  let testVersions: Awaited<ReturnType<typeof getTestSongVersions>>;

  beforeAll(async () => {
    // Load enough song versions for all tests (we need at least 5 for Test 3).
    testVersions = await getTestSongVersions(10);
    if (testVersions.length < 5) {
      throw new Error(
        "[getContinueLearning.test] Need at least 5 seeded active ja song_versions. " +
          "Run `npm run seed:dev` against TEST_DATABASE_URL first."
      );
    }
  });

  beforeEach(async () => {
    await resetTestProgress(TEST_USER_ID);
  });

  afterAll(async () => {
    await resetTestProgress(TEST_USER_ID);
  });

  // -------------------------------------------------------------------------
  // Test 1: filters out rows with completion_pct = 0
  // -------------------------------------------------------------------------
  it("Test 1: filters out rows with completion_pct = 0", async () => {
    const v0 = testVersions[0]!;
    const v1 = testVersions[1]!;

    // row A: completion_pct = 0 (should be excluded)
    await insertProgress({
      userId: TEST_USER_ID,
      songVersionId: v0.id,
      completionPct: 0,
    });

    // row B: completion_pct = 0.33 (should be included)
    await insertProgress({
      userId: TEST_USER_ID,
      songVersionId: v1.id,
      completionPct: 0.33,
    });

    const { getContinueLearning } = await import("@/lib/db/queries");
    const rows = await getContinueLearning(TEST_USER_ID);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.completion_pct).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // Test 2: orders results by updated_at DESC (newer first)
  // -------------------------------------------------------------------------
  it("Test 2: orders results by updated_at DESC (newer first)", async () => {
    const v0 = testVersions[0]!;
    const v1 = testVersions[1]!;

    // row A: updated_at = 1 hour ago
    const olderTime = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await insertProgress({
      userId: TEST_USER_ID,
      songVersionId: v0.id,
      completionPct: 0.5,
      updatedAt: olderTime,
    });

    // row B: updated_at = now (newer)
    await insertProgress({
      userId: TEST_USER_ID,
      songVersionId: v1.id,
      completionPct: 0.5,
      updatedAt: new Date().toISOString(),
    });

    const { getContinueLearning } = await import("@/lib/db/queries");
    const rows = await getContinueLearning(TEST_USER_ID);

    expect(rows).toHaveLength(2);
    // First row should be the newer one (updated_at later)
    const firstUpdated = new Date(rows[0]!.updated_at).getTime();
    const secondUpdated = new Date(rows[1]!.updated_at).getTime();
    expect(firstUpdated).toBeGreaterThan(secondUpdated);
  });

  // -------------------------------------------------------------------------
  // Test 3: respects limit parameter, defaults to 3
  // -------------------------------------------------------------------------
  it("Test 3: respects limit parameter, defaults to 3", async () => {
    // Seed 5 rows with completion_pct > 0, distinct updated_at
    for (let i = 0; i < 5; i++) {
      const v = testVersions[i]!;
      const updatedAt = new Date(Date.now() - i * 60_000).toISOString(); // 1 minute apart
      await insertProgress({
        userId: TEST_USER_ID,
        songVersionId: v.id,
        completionPct: 0.4,
        updatedAt,
      });
    }

    const { getContinueLearning } = await import("@/lib/db/queries");

    const defaultRows = await getContinueLearning(TEST_USER_ID);
    expect(defaultRows).toHaveLength(3);

    const fiveRows = await getContinueLearning(TEST_USER_ID, 5);
    expect(fiveRows).toHaveLength(5);

    const oneRow = await getContinueLearning(TEST_USER_ID, 1);
    expect(oneRow).toHaveLength(1);
  });

  // -------------------------------------------------------------------------
  // Test 4: returned shape has exactly 9 fields per D-03 + D-14 (stars added)
  // -------------------------------------------------------------------------
  it("Test 4: returned shape has exactly 9 fields per D-03 + D-14 (stars added)", async () => {
    const v = testVersions[0]!;

    await insertProgress({
      userId: TEST_USER_ID,
      songVersionId: v.id,
      completionPct: 0.6,
    });

    const { getContinueLearning } = await import("@/lib/db/queries");
    const rows = await getContinueLearning(TEST_USER_ID);

    expect(rows).toHaveLength(1);
    const [row] = rows;
    expect(row).toBeDefined();

    const keys = Object.keys(row!).sort();
    expect(keys).toEqual([
      "anime",
      "artist",
      "completion_pct",
      "jlpt_level",
      "slug",
      "stars",
      "title",
      "updated_at",
      "youtube_id",
    ]);

    expect(typeof row!.completion_pct).toBe("number");
    expect(typeof row!.stars).toBe("number");
    expect(row!.stars).toBeGreaterThanOrEqual(0);
    expect(row!.stars).toBeLessThanOrEqual(3);
  });

  // -------------------------------------------------------------------------
  // Test 5: stars derivation matches deriveStars() helper (D-14 single-source-of-truth)
  // -------------------------------------------------------------------------
  it("Test 5: stars derivation matches deriveStars() helper (D-14 single-source-of-truth)", async () => {
    // Find 3 vocab-only (has_grammar=false) song_versions for this test.
    const vocabOnly = testVersions.filter((v) => !v.has_grammar);
    if (vocabOnly.length < 3) {
      // If not enough vocab-only versions, use any 3 and test with the actual has_grammar flag.
      // The invariant still holds: getContinueLearning must return the same stars as deriveStars().
    }

    // Use the first 3 available versions (may be grammar or vocab).
    const vA = testVersions[0]!;
    const vB = testVersions[1]!;
    const vC = testVersions[2]!;

    // Find vocab-only versions if possible (for predictable Star 3 gate via ex6).
    const vocabA = vocabOnly[0] ?? vA;
    const vocabB = vocabOnly[1] ?? vB;
    const vocabC = vocabOnly[2] ?? vC;

    // row A: 3 stars — ex1_2_3=0.85, ex4=0.85, ex6=0.85 (vocab-only song)
    await insertProgress({
      userId: TEST_USER_ID,
      songVersionId: vocabA.id,
      completionPct: 0.9,
      updatedAt: new Date(Date.now() - 1 * 60_000).toISOString(),
      ex1_2_3: 0.85,
      ex4: 0.85,
      ex6: 0.85,
      grammarBestAccuracy: null,
    });

    // row B: 0 stars — all-zero accuracy
    await insertProgress({
      userId: TEST_USER_ID,
      songVersionId: vocabB.id,
      completionPct: 0.1,
      updatedAt: new Date(Date.now() - 2 * 60_000).toISOString(),
      ex1_2_3: 0,
      ex4: 0,
      ex6: 0,
      grammarBestAccuracy: null,
    });

    // row C: 1 star — ex1_2_3=0.85, ex4=null
    await insertProgress({
      userId: TEST_USER_ID,
      songVersionId: vocabC.id,
      completionPct: 0.5,
      updatedAt: new Date(Date.now() - 3 * 60_000).toISOString(),
      ex1_2_3: 0.85,
      ex4: null,
      ex6: null,
      grammarBestAccuracy: null,
    });

    const { getContinueLearning } = await import("@/lib/db/queries");
    const rows = await getContinueLearning(TEST_USER_ID, 5);

    expect(rows).toHaveLength(3);

    // All returned stars must be in valid range.
    for (const row of rows) {
      expect([0, 1, 2, 3]).toContain(row.stars);
    }

    // Assert at least one row landed at stars=3 and one at stars=0
    // (proves the formula is being applied, not hardcoded).
    const stars = rows.map((r) => r.stars);
    expect(stars).toContain(3);
    expect(stars).toContain(0);

    // Tautological invariant: re-derive expected stars via the SAME deriveStars helper.
    // The query MUST produce the same result as calling deriveStars() directly.
    // For the all-zero row: deriveStars returns 0.
    const zeroStarsExpected = deriveStars(
      { ex1_2_3_best_accuracy: 0, ex4_best_accuracy: 0, ex6_best_accuracy: 0, grammar_best_accuracy: null },
      false
    );
    expect(zeroStarsExpected).toBe(0);
    expect(stars).toContain(zeroStarsExpected);

    // For the 3-star row: deriveStars returns 3 (for vocab-only with ex6=0.85).
    const threeStarsExpected = deriveStars(
      { ex1_2_3_best_accuracy: 0.85, ex4_best_accuracy: 0.85, ex6_best_accuracy: 0.85, grammar_best_accuracy: null },
      vocabA.has_grammar
    );
    // If vocabA is actually a grammar song, the 3-star gate will use grammar_best_accuracy=null => 0 => returns 2.
    // Either way, the returned stars must match deriveStars applied to the same inputs.
    expect(stars).toContain(threeStarsExpected);
  });
});
