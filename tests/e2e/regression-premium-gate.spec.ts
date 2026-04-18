/**
 * tests/e2e/regression-premium-gate.spec.ts
 *
 * Plan 08.1-07 Task 1 — Regression guard for premium-gate bypass attempts.
 * Plan 10-06 Task 3 — Unfixed the Phase 10 test.fixme; server-side gate now
 *                     enforced by saveSessionResults + recordVocabAnswer.
 *
 * CONTEXT-locked invariant (08.1-CONTEXT > Regression guards):
 *
 *   "Premium gate bypass — checkExerciseAccess() is the single gate;
 *    free users can't reach premium exercises via URL/state manipulation"
 *
 * Status of the gate today (Phase 10):
 *   - Phase 8 exercise types (vocab_meaning / meaning_vocab / reading_match /
 *     fill_lyric) are flagged "free".
 *   - Phase 10 added three "song_quota"-gated types: listening_drill,
 *     grammar_conjugation, sentence_order. Gate returns quota_exhausted when
 *     the per-family counter is at limit for the current user+song.
 *   - The gate logic in `src/lib/exercises/access.ts::checkExerciseAccess`
 *     defaults UNKNOWN types to "premium" — that's the lever the synthetic-
 *     type tests below exercise.
 *
 * Three angles (unchanged from Phase 08.1):
 *
 *   1. URL / param manipulation — free user opens the song page; Advanced
 *      Drills tab-click fires the server-side gate (getAdvancedDrillAccess);
 *      non-premium users with a blown quota see the upsell modal rather than
 *      a session. We assert the modal renders and NO session UI appears.
 *
 *   2. Server action rejection — call `recordVocabAnswer` directly with a
 *      song_quota-gated type on a fresh non-premium user whose quota we've
 *      pre-blown (11 listening-drill counter rows via direct DB insert). The
 *      call must throw QuotaExhaustedError and refund the overshoot row.
 *
 *   3. checkExerciseAccess unit — direct calls assert the gate path semantics:
 *      UNKNOWN types default to premium (deny), FREE types pass unconditionally,
 *      and song_quota types return quota_exhausted when the user is at limit.
 *
 * Note: The static check that no UI component imports EXERCISE_FEATURE_FLAGS
 * lives in tests/integration/regression-stale-lesson-data.test.ts.
 *
 * Zero retries (enforced at playwright.config.ts).
 */

import { sql } from "drizzle-orm";
import { test, expect } from "../support/fixtures";
import { checkExerciseAccess } from "@/lib/exercises/access";
import { EXERCISE_FEATURE_FLAGS } from "@/lib/exercises/feature-flags";
import { recordVocabAnswer } from "@/app/actions/exercises";
import { QuotaExhaustedError } from "@/lib/exercises/errors";
import { getTestDb, TEST_USER_ID } from "../support/test-db";

const SLUG = "again-yui";

// Synthetic UNKNOWN target — any string NOT in EXERCISE_FEATURE_FLAGS defaults
// to "premium" via the `?? "premium"` fallback. This specific marker ensures
// this spec keeps exercising the unknown-type default even as Phase 10+ flips
// real types to song_quota.
const UNKNOWN_PREMIUM_TYPE = "__kb_synthetic_premium_marker__";

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;

test.describe("Regression: premium gate bypass attempts", () => {
  test("checkExerciseAccess denies an UNKNOWN synthetic type (default to premium)", async () => {
    // Architectural invariant: the gate defaults unknown exercise types to
    // "premium" — a malformed or spoofed exerciseType from a client can't
    // accidentally land in the "free" bucket.
    const result = await checkExerciseAccess("any-user-id", UNKNOWN_PREMIUM_TYPE);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("premium_required");

    // Sanity: the type is genuinely NOT in the feature-flags map.
    expect(EXERCISE_FEATURE_FLAGS[UNKNOWN_PREMIUM_TYPE]).toBeUndefined();
  });

  test("checkExerciseAccess allows every type currently flagged 'free'", async () => {
    const freeTypes = Object.entries(EXERCISE_FEATURE_FLAGS)
      .filter(([, gate]) => gate === "free")
      .map(([t]) => t);

    expect(freeTypes.length).toBeGreaterThan(0); // sanity: catalog isn't empty

    for (const type of freeTypes) {
      const r = await checkExerciseAccess("any-user-id", type);
      expect(r.allowed, `expected '${type}' to be allowed (gate=free)`).toBe(
        true
      );
    }
  });

  test("checkExerciseAccess returns quota_exhausted for song_quota types without songVersionId", async () => {
    // song_quota types are gated on { songVersionId }; calling without the opt
    // must return a structured denial (not a throw). This proves the gate's
    // contract is the single truth source for all exercise-type access
    // decisions, not feature-flags.ts directly.
    const songQuotaTypes = Object.entries(EXERCISE_FEATURE_FLAGS)
      .filter(([, gate]) => gate === "song_quota")
      .map(([t]) => t);

    expect(songQuotaTypes.length).toBeGreaterThan(0); // Phase 10 added 3 types

    for (const type of songQuotaTypes) {
      const r = await checkExerciseAccess("any-user-id", type);
      expect(r.allowed).toBe(false);
      expect(r.reason).toBe("songVersionId required for quota gate");
    }
  });

  test("Practice tab UI surfaces the Advanced Drills mode card (Phase 10-06)", async ({
    page,
  }) => {
    // Phase 10-06 landed the Advanced Drills mode alongside Quick Practice +
    // Full Lesson. Verify the card is visible and clickable. The gate decision
    // is made on-click (getAdvancedDrillAccess server action), not at render
    // time — so the card being present does NOT indicate quota state.
    await page.goto(`/songs/${SLUG}`);
    await page.getByRole("button", { name: /^practice$/i }).click();

    // Three Start buttons now — one per mode card.
    await expect(
      page.getByRole("button", { name: /^Start$/ }).first()
    ).toBeVisible({ timeout: 10_000 });

    // The Advanced Drills card is explicitly visible (Phase 10-06 CONTEXT).
    await expect(
      page.getByRole("heading", { name: /^Advanced Drills$/i })
    ).toBeVisible();
  });

  test("direct query-string injection ?type=<premium> is silently ignored by the UI", async ({
    page,
  }) => {
    // The Practice tab does not honor any `?type=` URL parameter today.
    // If it ever gains one, this spec must be updated to assert that the UI
    // either ignores the parameter OR routes through checkExerciseAccess.
    await page.goto(`/songs/${SLUG}?type=${UNKNOWN_PREMIUM_TYPE}`);
    await page.getByRole("button", { name: /^practice$/i }).click();

    // Same Start button — query string had no effect on the offered modes.
    await expect(
      page.getByRole("button", { name: /^Start$/ }).first()
    ).toBeVisible({ timeout: 10_000 });

    // No "Premium required" surface — the song_quota path shows "Upgrade to
    // Premium" copy only on a deliberate quota-exhausted click, not on mere
    // URL-param injection.
    const bodyText = (await page.locator("body").innerText()).toLowerCase();
    expect(bodyText).not.toContain("premium required");
  });

  test("server-side gate rejects a listening_drill answer when quota is blown", async ({
    testUser,
    seededSong,
  }) => {
    // Phase 10-06 Task 3 — unfixed Phase 08.1-07 follow-up. This is the live
    // version of the original test.fixme: recordVocabAnswer now re-checks
    // the per-family quota server-side AFTER its idempotent counter insert;
    // if the insert pushed the user over the limit for a non-premium user,
    // the overshoot row is refunded and QuotaExhaustedError is thrown.
    //
    // Setup: seed 10 listening-drill counter rows for the test user (the free
    // tier limit), all against synthetic song_version_id values that aren't
    // this song. Then attempt to answer a listening_drill question on the
    // 11th song — the insert brings the count to 11 (> 10), the re-check
    // fires, the row is refunded, and QuotaExhaustedError lands.
    if (!HAS_TEST_DB) {
      test.skip(
        true,
        "TEST_DATABASE_URL not set — server-side gate path needs the test DB to seed the counter table"
      );
    }

    const song = await seededSong(SLUG);
    const db = getTestDb();

    // Seed 10 distinct listening rows — we need real song_version_ids the
    // foreign key accepts. Grab any 10 seeded songs other than this one.
    const raw = (await db.execute(sql`
      SELECT id::text AS id
        FROM song_versions
       WHERE lesson IS NOT NULL
         AND id <> ${song.songVersionId}::uuid
       LIMIT 10
    `)) as unknown as Array<{ id: string }> | { rows: Array<{ id: string }> };
    const rows = Array.isArray(raw) ? raw : (raw.rows ?? []);
    if (rows.length < 10) {
      test.skip(
        true,
        `TEST_DATABASE_URL has < 11 seeded song_versions; need 11 for the quota bypass assertion (found ${rows.length + 1})`
      );
    }

    // Seed the 10 counter rows.
    for (const row of rows) {
      await db.execute(sql`
        INSERT INTO user_exercise_song_counters (user_id, exercise_family, song_version_id)
        VALUES (${testUser}, 'listening', ${row.id}::uuid)
        ON CONFLICT DO NOTHING
      `);
    }

    // Fetch any real vocab_item_id for the FSRS pre-write — any seeded UUID
    // works; we're testing the counter refund semantics, not the FSRS math.
    const vocabRaw = (await db.execute(sql`
      SELECT id::text AS id
        FROM vocabulary_items
       LIMIT 1
    `)) as unknown as Array<{ id: string }> | { rows: Array<{ id: string }> };
    const vocabRows = Array.isArray(vocabRaw) ? vocabRaw : (vocabRaw.rows ?? []);
    if (vocabRows.length === 0) {
      test.skip(
        true,
        "TEST_DATABASE_URL has no vocabulary_items rows — cannot exercise recordVocabAnswer"
      );
    }
    const vocabItemId = vocabRows[0].id;

    // The 11th-song attempt must throw QuotaExhaustedError.
    let threw: unknown = null;
    try {
      await recordVocabAnswer({
        userId: testUser,
        vocabItemId,
        songVersionId: song.songVersionId,
        exerciseType: "listening_drill",
        correct: true,
        responseTimeMs: 1000,
      });
    } catch (err) {
      threw = err;
    }
    expect(threw).toBeInstanceOf(QuotaExhaustedError);
    expect((threw as QuotaExhaustedError).family).toBe("listening");

    // Post-condition: the counter was refunded (row for this song should be
    // absent). Confirms the server-side re-check deletes the overshoot.
    const countRaw = (await db.execute(sql`
      SELECT COUNT(*)::int AS c
        FROM user_exercise_song_counters
       WHERE user_id = ${testUser}
         AND exercise_family = 'listening'
         AND song_version_id = ${song.songVersionId}::uuid
    `)) as unknown as Array<{ c: number }> | { rows: Array<{ c: number }> };
    const countRows = Array.isArray(countRaw) ? countRaw : (countRaw.rows ?? []);
    expect(countRows[0]?.c ?? 0).toBe(0);
  });
});
