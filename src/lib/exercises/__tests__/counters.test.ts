/**
 * Phase 10-01 — user_exercise_song_counters integration coverage.
 *
 * Exercises the drizzle round-trip for the three counter primitives behind
 * the TEST_DATABASE_URL gate. Mirrors the describe.skip pattern introduced
 * in Phase 08.1-03 (queries-progress.test.ts) so this suite stays green when
 * TEST_DATABASE_URL is unset — operator provisioning activates it.
 *
 * Asserts:
 *   1. recordSongAttempt is idempotent (ON CONFLICT DO NOTHING — row count
 *      stays at 1 across repeated calls for the same triple).
 *   2. getSongCountForFamily returns 0 before any insert, then N after
 *      N distinct recordSongAttempt calls.
 *   3. userHasTouchedSong correctly reports boolean membership on the
 *      (user, family, song_version_id) triple.
 *   4. Family independence — recording in one family does not bleed into
 *      the other family's count.
 *
 * Hermeticism:
 *   - beforeEach: resetTestProgress(TEST_USER_ID) — which now also clears
 *     user_exercise_song_counters (see Phase 10 update in test-db.ts).
 *   - afterAll:   resetTestProgress(TEST_USER_ID).
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import {
  getSongCountForFamily,
  recordSongAttempt,
  userHasTouchedSong,
} from "../counters";
import {
  getTestDb,
  resetTestProgress,
  TEST_USER_ID,
} from "../../../../tests/support/test-db";

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;

describeIfTestDb("user_exercise_song_counters — counters.ts round trip", () => {
  let songVersionA: string;
  let songVersionB: string;

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
        "[counters.test] No song_versions row with lesson IS NOT NULL found in " +
          "TEST_DATABASE_URL. Run `npm run seed:dev` first."
      );
    }
    songVersionA = rows[0].id;
    songVersionB = rows[1]?.id ?? rows[0].id;
  });

  beforeEach(async () => {
    await resetTestProgress(TEST_USER_ID);
  });

  afterAll(async () => {
    await resetTestProgress(TEST_USER_ID);
  });

  it("getSongCountForFamily returns 0 before any insert", async () => {
    expect(
      await getSongCountForFamily(TEST_USER_ID, "listening")
    ).toBe(0);
    expect(
      await getSongCountForFamily(TEST_USER_ID, "advanced_drill")
    ).toBe(0);
  });

  it("userHasTouchedSong returns false before any insert", async () => {
    expect(
      await userHasTouchedSong(TEST_USER_ID, "listening", songVersionA)
    ).toBe(false);
  });

  it("recordSongAttempt is idempotent — repeated calls for the same triple leave count at 1", async () => {
    await recordSongAttempt(TEST_USER_ID, "listening", songVersionA);
    await recordSongAttempt(TEST_USER_ID, "listening", songVersionA);
    await recordSongAttempt(TEST_USER_ID, "listening", songVersionA);

    const count = await getSongCountForFamily(TEST_USER_ID, "listening");
    expect(count).toBe(1);

    expect(
      await userHasTouchedSong(TEST_USER_ID, "listening", songVersionA)
    ).toBe(true);
  });

  it("getSongCountForFamily returns N after N DISTINCT recordSongAttempt calls", async () => {
    if (songVersionA === songVersionB) {
      // Only one song available in TEST_DATABASE_URL — skip the N=2 assertion
      // and verify N=1 still holds. Seeding 2+ lessoned song_versions promotes
      // this to the stronger assertion automatically.
      await recordSongAttempt(TEST_USER_ID, "listening", songVersionA);
      expect(
        await getSongCountForFamily(TEST_USER_ID, "listening")
      ).toBe(1);
      return;
    }
    await recordSongAttempt(TEST_USER_ID, "listening", songVersionA);
    await recordSongAttempt(TEST_USER_ID, "listening", songVersionB);

    expect(
      await getSongCountForFamily(TEST_USER_ID, "listening")
    ).toBe(2);
  });

  it("family independence — recording listening does NOT bleed into advanced_drill count", async () => {
    await recordSongAttempt(TEST_USER_ID, "listening", songVersionA);

    expect(
      await getSongCountForFamily(TEST_USER_ID, "listening")
    ).toBe(1);
    expect(
      await getSongCountForFamily(TEST_USER_ID, "advanced_drill")
    ).toBe(0);
  });

  it("same song in both families counts separately — they are distinct UNIQUE rows", async () => {
    await recordSongAttempt(TEST_USER_ID, "listening", songVersionA);
    await recordSongAttempt(TEST_USER_ID, "advanced_drill", songVersionA);

    expect(await getSongCountForFamily(TEST_USER_ID, "listening")).toBe(1);
    expect(await getSongCountForFamily(TEST_USER_ID, "advanced_drill")).toBe(1);

    expect(
      await userHasTouchedSong(TEST_USER_ID, "listening", songVersionA)
    ).toBe(true);
    expect(
      await userHasTouchedSong(TEST_USER_ID, "advanced_drill", songVersionA)
    ).toBe(true);
  });
});
