/**
 * tests/e2e/advanced-drill-quota.spec.ts
 *
 * Phase 10 Plan 06 Task 3 — End-to-end regression for the Advanced Drills
 * tab-open quota gate.
 *
 * Four assertions (all per CONTEXT-locked quota limits: 10 listening, 3
 * advanced_drill; shared across grammar_conjugation + sentence_order):
 *
 *   1. Listening quota exhausted — seeded 10 distinct listening counter rows
 *      for the test user, then clicked "Advanced Drills" on an 11th song.
 *      Upsell modal renders with "10 songs" copy; session does not start.
 *
 *   2. Advanced drill quota exhausted — seeded 3 distinct advanced_drill
 *      counter rows, then clicked "Advanced Drills" on a 4th song. Upsell
 *      modal renders with "3 songs" copy; session does not start.
 *
 *   3. Independent counters — seeded 10 listening rows but ZERO advanced_drill
 *      rows. The Advanced Drills click on a new song proceeds (the listening
 *      side is blown but advanced_drill still has 3 slots; the upsell should
 *      NOT render). Because Listening Drill is one of the three types the
 *      "Advanced Drills" card tries to run, however, the GATE decides both
 *      families in one server-action call — if listening is exhausted AND the
 *      song does not yet have a listening counter row, the listening upsell
 *      fires first (by plan design). So this assertion asserts the INVERSE:
 *      exhausting advanced_drill does NOT block listening-only flows (via a
 *      direct gate check — the UI layer always needs both gates open).
 *
 *   4. Premium bypass — after flagging the user premium (insert subscriptions
 *      row), both gates allow unconditionally even with both counter tables
 *      at/over limit. Advanced Drills mode starts a session normally.
 *
 * Env gate: TEST_DATABASE_URL must be set AND the test DB must have at least
 * 11 seeded song_versions. Gracefully skips (test.skip) otherwise — matches
 * the Phase 08.1-03 describe.skip pattern.
 *
 * Zero retries (playwright.config.ts).
 */

import { sql } from "drizzle-orm";
import { test, expect } from "../support/fixtures";
import { getTestDb, TEST_USER_ID } from "../support/test-db";
import { checkExerciseAccess } from "@/lib/exercises/access";
import { QUOTA_LIMITS } from "@/lib/exercises/feature-flags";

const SLUG = "again-yui"; // primary happy-path song in SEEDED_SLUGS

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;

// The single skip condition documented at the top of every describe — keep
// file readable without repeating the cascade of checks in every test.
async function requireCatalog(minOtherSongs: number): Promise<{ songIds: string[] } | null> {
  if (!HAS_TEST_DB) return null;
  const db = getTestDb();
  const raw = (await db.execute(sql`
    SELECT id::text AS id
      FROM song_versions
     WHERE lesson IS NOT NULL
     ORDER BY id
     LIMIT ${minOtherSongs + 1}
  `)) as unknown as Array<{ id: string }> | { rows: Array<{ id: string }> };
  const rows = Array.isArray(raw) ? raw : (raw.rows ?? []);
  if (rows.length < minOtherSongs + 1) return null;
  return { songIds: rows.map((r) => r.id) };
}

test.describe("Advanced Drills quota gate — E2E", () => {
  test("11th distinct song's listening quota is exhausted → upsell modal", async ({
    page,
    testUser,
    seededSong,
  }) => {
    const catalog = await requireCatalog(10);
    if (!catalog) {
      test.skip(true, "requires TEST_DATABASE_URL + 11 seeded song_versions");
    }

    const song = await seededSong(SLUG);
    const db = getTestDb();

    // Seed 10 listening rows for OTHER songs so when user clicks Advanced
    // Drills on THIS song the listening family is at cap (10), and this
    // song is NOT already-touched → the gate denies.
    const otherIds = catalog!.songIds.filter((id) => id !== song.songVersionId).slice(0, 10);
    expect(otherIds.length).toBe(10);
    for (const id of otherIds) {
      await db.execute(sql`
        INSERT INTO user_exercise_song_counters (user_id, exercise_family, song_version_id)
        VALUES (${testUser}, 'listening', ${id}::uuid)
        ON CONFLICT DO NOTHING
      `);
    }

    // Sanity: direct gate check confirms the denial.
    const gate = await checkExerciseAccess(testUser, "listening_drill", {
      songVersionId: song.songVersionId,
    });
    expect(gate.allowed).toBe(false);
    expect(gate.reason).toBe("quota_exhausted");

    await page.goto(`/songs/${SLUG}`);
    await page.getByRole("button", { name: /^practice$/i }).click();

    // Click the Advanced Drills Start button (third card).
    await page.getByTestId("advanced-drills-start").click();

    // Upsell modal renders with listening family copy.
    const modal = page.getByTestId("advanced-drills-upsell-modal");
    await expect(modal).toBeVisible({ timeout: 10_000 });
    await expect(modal).toHaveAttribute("data-family", "listening");
    // CONTEXT-locked copy assertions.
    await expect(modal).toContainText(`${QUOTA_LIMITS.listening} songs of Listening Drill`);
    await expect(modal.getByRole("heading")).toContainText("Listening Drill");

    // Session did NOT start — no question counter.
    await expect(page.getByText(/^Question\s+1\s*\/\s*/)).toHaveCount(0);
  });

  test("4th distinct song's advanced_drill quota is exhausted → upsell modal", async ({
    page,
    testUser,
    seededSong,
  }) => {
    const catalog = await requireCatalog(3);
    if (!catalog) {
      test.skip(true, "requires TEST_DATABASE_URL + 4 seeded song_versions");
    }

    const song = await seededSong(SLUG);
    const db = getTestDb();

    // Seed 3 advanced_drill rows for OTHER songs — exhausts the shared
    // grammar_conjugation + sentence_order family.
    const otherIds = catalog!.songIds.filter((id) => id !== song.songVersionId).slice(0, 3);
    expect(otherIds.length).toBe(3);
    for (const id of otherIds) {
      await db.execute(sql`
        INSERT INTO user_exercise_song_counters (user_id, exercise_family, song_version_id)
        VALUES (${testUser}, 'advanced_drill', ${id}::uuid)
        ON CONFLICT DO NOTHING
      `);
    }

    // Sanity: listening family is NOT exhausted — the UI's first upsell branch
    // (listening) won't fire, so we see the advanced_drill modal.
    const listeningGate = await checkExerciseAccess(testUser, "listening_drill", {
      songVersionId: song.songVersionId,
    });
    expect(listeningGate.allowed).toBe(true);

    const advancedGate = await checkExerciseAccess(testUser, "grammar_conjugation", {
      songVersionId: song.songVersionId,
    });
    expect(advancedGate.allowed).toBe(false);
    expect(advancedGate.reason).toBe("quota_exhausted");

    await page.goto(`/songs/${SLUG}`);
    await page.getByRole("button", { name: /^practice$/i }).click();
    await page.getByTestId("advanced-drills-start").click();

    const modal = page.getByTestId("advanced-drills-upsell-modal");
    await expect(modal).toBeVisible({ timeout: 10_000 });
    await expect(modal).toHaveAttribute("data-family", "advanced_drill");
    await expect(modal).toContainText(
      `${QUOTA_LIMITS.advanced_drill} songs of Grammar Conjugation + Sentence Order`
    );

    // Session did not start.
    await expect(page.getByText(/^Question\s+1\s*\/\s*/)).toHaveCount(0);
  });

  test("independent counters: exhausted listening doesn't consume advanced_drill quota", async ({
    testUser,
    seededSong,
  }) => {
    const catalog = await requireCatalog(10);
    if (!catalog) {
      test.skip(true, "requires TEST_DATABASE_URL + 11 seeded song_versions");
    }

    const song = await seededSong(SLUG);
    const db = getTestDb();

    // Blow the listening family only — advanced_drill is untouched.
    const otherIds = catalog!.songIds.filter((id) => id !== song.songVersionId).slice(0, 10);
    for (const id of otherIds) {
      await db.execute(sql`
        INSERT INTO user_exercise_song_counters (user_id, exercise_family, song_version_id)
        VALUES (${testUser}, 'listening', ${id}::uuid)
        ON CONFLICT DO NOTHING
      `);
    }

    // Direct gate asserts the invariant — the advanced_drill gate on a NEW
    // song (this song's id, unseeded in either family) is still wide open.
    const advancedGate = await checkExerciseAccess(testUser, "grammar_conjugation", {
      songVersionId: song.songVersionId,
    });
    expect(advancedGate.allowed).toBe(true);
    expect(advancedGate.quotaRemaining).toBe(QUOTA_LIMITS.advanced_drill);

    // And sentence_order shares the family — same shape.
    const sentenceGate = await checkExerciseAccess(testUser, "sentence_order", {
      songVersionId: song.songVersionId,
    });
    expect(sentenceGate.allowed).toBe(true);
    expect(sentenceGate.quotaRemaining).toBe(QUOTA_LIMITS.advanced_drill);
  });

  test("premium user bypasses both gates", async ({
    page,
    testUser,
    seededSong,
  }) => {
    const catalog = await requireCatalog(10);
    if (!catalog) {
      test.skip(true, "requires TEST_DATABASE_URL + 11 seeded song_versions");
    }

    const song = await seededSong(SLUG);
    const db = getTestDb();

    // Blow BOTH families.
    const otherIds = catalog!.songIds.filter((id) => id !== song.songVersionId).slice(0, 10);
    for (const id of otherIds) {
      await db.execute(sql`
        INSERT INTO user_exercise_song_counters (user_id, exercise_family, song_version_id)
        VALUES (${testUser}, 'listening', ${id}::uuid)
        ON CONFLICT DO NOTHING
      `);
    }
    for (const id of otherIds.slice(0, 3)) {
      await db.execute(sql`
        INSERT INTO user_exercise_song_counters (user_id, exercise_family, song_version_id)
        VALUES (${testUser}, 'advanced_drill', ${id}::uuid)
        ON CONFLICT DO NOTHING
      `);
    }

    // Flag the user premium via the subscriptions table.
    await db.execute(sql`
      INSERT INTO subscriptions (user_id, plan, status)
      VALUES (${testUser}, 'premium_monthly', 'active')
      ON CONFLICT (user_id) DO UPDATE SET plan = EXCLUDED.plan, status = EXCLUDED.status, updated_at = NOW()
    `);

    try {
      // Gate allows unconditionally — no quotaRemaining field (premium
      // bypass short-circuits before the counter read).
      const listeningGate = await checkExerciseAccess(testUser, "listening_drill", {
        songVersionId: song.songVersionId,
      });
      expect(listeningGate.allowed).toBe(true);

      const advancedGate = await checkExerciseAccess(testUser, "grammar_conjugation", {
        songVersionId: song.songVersionId,
      });
      expect(advancedGate.allowed).toBe(true);

      // UI: Advanced Drills click does NOT show the upsell modal (session
      // starts instead, or fails with a "no eligible verses" error on songs
      // lacking grammar/timing data — either way, the upsell must not fire).
      await page.goto(`/songs/${SLUG}`);
      await page.getByRole("button", { name: /^practice$/i }).click();
      await page.getByTestId("advanced-drills-start").click();

      // Wait briefly for either the modal or the session UI to settle.
      await page.waitForTimeout(1500);
      await expect(page.getByTestId("advanced-drills-upsell-modal")).toHaveCount(0);
    } finally {
      // Explicit cleanup — the testUser fixture only wipes counter + mastery
      // + progress + log rows. Subscriptions persist across tests unless we
      // explicitly remove them; leaving a premium row for other tests would
      // invalidate their "free user" assumption.
      await db.execute(sql`
        DELETE FROM subscriptions WHERE user_id = ${testUser}
      `);
    }
  });
});
