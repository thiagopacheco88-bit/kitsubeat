/**
 * tests/integration/queries-progress.test.ts
 *
 * Integration test for `src/lib/db/queries.ts` progress reads — anchors the
 * Phase 08-01 architectural decision: **stars are derived at read time**, never
 * stored as a column.
 *
 * What is asserted:
 *   1. No row → query returns null without throwing
 *   2. Saved progress with ex1_2_3=0.85 + ex4=0.85 → query row carries stars=2
 *      (added by the query layer, not present in the DB)
 *   3. Saved progress with ex1_2_3=0.85 + ex4=0.70 → stars=1
 *   4. Batch query (getUserSongProgressBatch) returns a per-version Map with
 *      derived stars for each entry
 *   5. information_schema invariant: user_song_progress has NO `stars` column.
 *      If anyone ever adds one, this test fails loudly — the architectural
 *      decision is enforced at the schema level.
 *
 * Hermeticism:
 *   - beforeEach: resetTestProgress(TEST_USER_ID)
 *   - afterAll : resetTestProgress(TEST_USER_ID)
 *
 * Env requirement:
 *   - TEST_DATABASE_URL must be set (DB redirect happens in tests/integration/setup.ts)
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import {
  getUserSongProgress,
  getUserSongProgressBatch,
} from "@/lib/db/queries";
import { saveSessionResults } from "@/app/actions/exercises";
import {
  getTestDb,
  resetTestProgress,
  TEST_USER_ID,
} from "../support/test-db";

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;

/**
 * Drives saveSessionResults to land an exact (ex1_2_3, ex4) accuracy pair on the
 * progress row. Uses 20 ex1_2_3 + 20 ex4 answers so 0.85 / 0.70 / 0.0 / 1.0 are
 * representable as integer correct counts (17/20, 14/20, 0/20, 20/20).
 */
async function primeProgress(opts: {
  songVersionId: string;
  ex1_2_3: number; // target accuracy in [0,1]
  ex4: number | null; // null = no fill_lyric answers
}): Promise<void> {
  const denom = 20;
  const ex1Correct = Math.round(opts.ex1_2_3 * denom);
  const ex1Answers = Array.from({ length: denom }, (_, i) => ({
    questionId: `v${i}`,
    type: "vocab_meaning" as const,
    chosen: i < ex1Correct ? "right" : "wrong",
    correct: i < ex1Correct,
    timeMs: 1000,
  }));

  const ex4Answers =
    opts.ex4 === null
      ? []
      : Array.from({ length: denom }, (_, i) => ({
          questionId: `f${i}`,
          type: "fill_lyric" as const,
          chosen: i < Math.round(opts.ex4! * denom) ? "right" : "wrong",
          correct: i < Math.round(opts.ex4! * denom),
          timeMs: 1000,
        }));

  await saveSessionResults({
    userId: TEST_USER_ID,
    songVersionId: opts.songVersionId,
    mode: "short",
    durationMs: 60_000,
    answers: [...ex1Answers, ...ex4Answers],
  });
}

describeIfTestDb("queries.ts — progress reads + star derivation", () => {
  let songVersionId: string;
  let secondSongVersionId: string;

  beforeAll(async () => {
    const db = getTestDb();
    const raw = (await db.execute(sql`
      SELECT id::text AS id
        FROM song_versions
       WHERE lesson IS NOT NULL
       LIMIT 2
    `)) as unknown as Array<{ id: string }> | { rows: Array<{ id: string }> };
    const rows = Array.isArray(raw) ? raw : (raw.rows ?? []);
    if (rows.length < 1) {
      throw new Error(
        "[queries-progress.test] No song_versions row with lesson IS NOT NULL " +
          "found in TEST_DATABASE_URL. Run `npm run seed:dev` first."
      );
    }
    songVersionId = rows[0].id;
    // Batch test wants 2 versions. If only 1 exists, reuse it — the assertion
    // still proves the Map keying works (1 entry).
    secondSongVersionId = rows[1]?.id ?? songVersionId;
  });

  beforeEach(async () => {
    await resetTestProgress(TEST_USER_ID);
  });

  afterAll(async () => {
    await resetTestProgress(TEST_USER_ID);
  });

  it("returns null (no throw) when the user has no progress row", async () => {
    const result = await getUserSongProgress(TEST_USER_ID, songVersionId);
    expect(result).toBeNull();
  });

  it("with ex1_2_3=0.85 + ex4=0.85 → query row carries stars=2", async () => {
    await primeProgress({ songVersionId, ex1_2_3: 0.85, ex4: 0.85 });

    const row = await getUserSongProgress(TEST_USER_ID, songVersionId);
    expect(row).not.toBeNull();
    expect(row!.stars).toBe(2);
    expect(row!.ex1_2_3_best_accuracy).toBeCloseTo(0.85, 5);
    expect(row!.ex4_best_accuracy).toBeCloseTo(0.85, 5);
  });

  it("with ex1_2_3=0.85 + ex4=0.70 → stars=1 (ex4 below threshold)", async () => {
    await primeProgress({ songVersionId, ex1_2_3: 0.85, ex4: 0.7 });

    const row = await getUserSongProgress(TEST_USER_ID, songVersionId);
    expect(row).not.toBeNull();
    expect(row!.stars).toBe(1);
    expect(row!.ex1_2_3_best_accuracy).toBeCloseTo(0.85, 5);
    expect(row!.ex4_best_accuracy).toBeCloseTo(0.7, 5);
  });

  it("getUserSongProgressBatch returns derived stars per version", async () => {
    // Prime version A: 1 star. Prime version B (if distinct): 2 stars.
    await primeProgress({ songVersionId, ex1_2_3: 0.85, ex4: 0.5 });
    if (secondSongVersionId !== songVersionId) {
      await primeProgress({ songVersionId: secondSongVersionId, ex1_2_3: 0.9, ex4: 0.9 });
    }

    const versionIds = Array.from(new Set([songVersionId, secondSongVersionId]));
    const map = await getUserSongProgressBatch(TEST_USER_ID, versionIds);

    expect(map.size).toBe(versionIds.length);
    expect(map.get(songVersionId)?.stars).toBe(1);
    if (secondSongVersionId !== songVersionId) {
      expect(map.get(secondSongVersionId)?.stars).toBe(2);
    }
  });

  it("invariant: user_song_progress has NO `stars` column (read-time derivation enforced at schema level)", async () => {
    // If a future refactor adds a `stars` column, the architectural decision
    // from Phase 08-01 has been broken — fail loudly here.
    const db = getTestDb();
    const raw = (await db.execute(sql`
      SELECT column_name
        FROM information_schema.columns
       WHERE table_name = 'user_song_progress'
    `)) as unknown as Array<{ column_name: string }> | { rows: Array<{ column_name: string }> };
    const rows = Array.isArray(raw) ? raw : (raw.rows ?? []);
    const cols = rows.map((r) => r.column_name);

    expect(cols.length).toBeGreaterThan(0); // sanity: table exists
    expect(cols).not.toContain("stars");
  });
});
