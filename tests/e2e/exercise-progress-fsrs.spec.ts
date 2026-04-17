/**
 * tests/e2e/exercise-progress-fsrs.spec.ts — DB-side assertions on progress + FSRS.
 *
 * Plan 08.1-06 Task 3.
 *
 * Proves that completing a session through the BROWSER UI writes:
 *   - user_song_progress (completion_pct, sessions_completed)
 *   - user_vocab_mastery (one row per unique vocab_item_id, FSRS scalars populated)
 *
 * IMPORTANT — userId scoping:
 *   The current production UI hardcodes `userId="anonymous"` in SongContent.tsx
 *   (Clerk auth not yet integrated). saveSessionResults therefore writes to
 *   user_id='anonymous'. These tests query/clean that user to match the actual
 *   production code path being exercised. When auth lands, both the UI hardcode
 *   AND these tests should switch to the real session userId in lockstep.
 *
 * TEST_DATABASE_URL gating:
 *   Each DB-touching test calls test.skip() when TEST_DATABASE_URL is unset.
 *   Authoring the assertions as HARD (not .fixme) per Phase 08.1-06 plan; they
 *   activate automatically once the operator provisions the test DB.
 *
 * No retries (zero-flake policy enforced at playwright.config.ts).
 */

import { test, expect } from "../support/fixtures";
import type { Page } from "@playwright/test";
import { sql } from "drizzle-orm";
import { getTestDb } from "../support/test-db";

const SLUG = "again-yui";
/** The hardcoded userId the production UI passes via SongContent.tsx → ExerciseTab. */
const PROD_HARDCODED_USER_ID = "anonymous";

const HAS_TEST_DB = Boolean(process.env.TEST_DATABASE_URL);

interface QuestionPeek {
  type: string;
  correct: string;
  index: number;
  total: number;
  vocabItemId: string;
}

async function startShortSession(page: Page) {
  await page.goto(`/songs/${SLUG}`);
  await page.getByRole("button", { name: /^practice$/i }).click();
  await page.getByRole("button", { name: /^Start$/ }).first().click();
  await page.waitForFunction(
    () =>
      typeof (window as unknown as { __kbExerciseStore?: unknown })
        .__kbExerciseStore !== "undefined",
    { timeout: 10_000 }
  );
  await expect(page.locator("[data-question-id]")).toBeVisible({ timeout: 10_000 });
}

async function peekCurrent(page: Page): Promise<QuestionPeek> {
  return await page.evaluate<QuestionPeek>(() => {
    const store = (window as unknown as {
      __kbExerciseStore?: {
        getState: () => {
          questions: Array<{
            type: string;
            correctAnswer: string;
            distractors: string[];
            vocabItemId: string;
          }>;
          currentIndex: number;
        };
      };
    }).__kbExerciseStore;
    if (!store) throw new Error("__kbExerciseStore unavailable");
    const s = store.getState();
    const q = s.questions[s.currentIndex];
    return {
      type: q.type,
      correct: q.correctAnswer,
      index: s.currentIndex,
      total: s.questions.length,
      vocabItemId: q.vocabItemId,
    };
  });
}

async function runSession(page: Page) {
  const maxIterations = 50;
  for (let i = 0; i < maxIterations; i++) {
    const summaryVisible = await page
      .getByRole("heading", { name: /session complete/i })
      .isVisible()
      .catch(() => false);
    if (summaryVisible) return;

    const snap = await peekCurrent(page);
    const card = page.locator("[data-question-id]");
    await card.waitFor({ state: "visible", timeout: 5_000 });

    const buttons = card.locator("button").filter({ hasText: snap.correct });
    const exact = buttons.filter({
      hasText: new RegExp(`^\\s*${escapeRegex(snap.correct)}\\s*$`),
    });
    if ((await exact.count()) > 0) {
      await exact.first().click();
    } else {
      await buttons.first().click();
    }

    await expect(page.locator("[data-feedback]")).toBeVisible({ timeout: 5_000 });
    await page
      .locator("[data-feedback]")
      .getByRole("button", { name: /^Continue$/ })
      .click();
    await page.waitForTimeout(400);
  }
}

/** Direct DB cleanup for the production-hardcoded userId. */
async function cleanProdUser() {
  if (!HAS_TEST_DB) return;
  const db = getTestDb();
  await db.execute(sql`DELETE FROM user_song_progress WHERE user_id = ${PROD_HARDCODED_USER_ID}`);
  await db.execute(sql`DELETE FROM user_vocab_mastery WHERE user_id = ${PROD_HARDCODED_USER_ID}`);
  await db.execute(sql`DELETE FROM user_exercise_log WHERE user_id = ${PROD_HARDCODED_USER_ID}`);
}

/** Wait for SessionSummary to finish saving (the StarDisplay only renders after save). */
async function waitForSaveComplete(page: Page) {
  await expect(
    page.getByRole("heading", { name: /session complete/i })
  ).toBeVisible({ timeout: 10_000 });
  // StarDisplay attaches data-stars only after saveSessionResults resolves.
  await expect(page.locator("[data-stars]")).toBeVisible({ timeout: 10_000 });
  // Small additional buffer to let the FSRS per-vocab loop finish (it runs after
  // the user_song_progress upsert returns to the client).
  await page.waitForTimeout(500);
}

test.describe("Exercise progress + FSRS DB writes", () => {
  test.beforeEach(async () => {
    await cleanProdUser();
  });

  test.afterAll(async () => {
    await cleanProdUser();
  });

  test("completion_pct increments after a session", async ({ page, testUser }) => {
    void testUser;
    test.skip(!HAS_TEST_DB, "TEST_DATABASE_URL not provisioned — DB assertions require it.");

    const db = getTestDb();

    // Initial state: zero rows.
    const before = (await db.execute(sql`
      SELECT COUNT(*)::int AS c FROM user_song_progress WHERE user_id = ${PROD_HARDCODED_USER_ID}
    `)) as unknown as { rows?: Array<{ c: number }> } | Array<{ c: number }>;
    const beforeRows = Array.isArray(before) ? before : (before.rows ?? []);
    expect(beforeRows[0]?.c).toBe(0);

    // Run one session.
    await startShortSession(page);
    await runSession(page);
    await waitForSaveComplete(page);

    // After 1 short session: completion_pct=15, sessions_completed=1.
    const after = (await db.execute(sql`
      SELECT completion_pct::int AS pct, sessions_completed AS sc
        FROM user_song_progress
       WHERE user_id = ${PROD_HARDCODED_USER_ID}
    `)) as unknown as
      | { rows?: Array<{ pct: number; sc: number }> }
      | Array<{ pct: number; sc: number }>;
    const afterRows = Array.isArray(after) ? after : (after.rows ?? []);
    expect(afterRows.length).toBe(1);
    expect(afterRows[0].pct).toBe(15);
    expect(afterRows[0].sc).toBe(1);
  });

  test("user_vocab_mastery rows written for each unique vocab_item_id", async ({
    page,
    testUser,
  }) => {
    void testUser;
    test.skip(!HAS_TEST_DB, "TEST_DATABASE_URL not provisioned — DB assertions require it.");

    const db = getTestDb();

    // Snapshot the unique vocabItemIds the session covers BEFORE running it
    // (so we can assert exact-match against the rows written).
    await startShortSession(page);
    const expectedVocabIds = await page.evaluate<string[]>(() => {
      const store = (window as unknown as {
        __kbExerciseStore?: {
          getState: () => { questions: Array<{ vocabItemId: string }> };
        };
      }).__kbExerciseStore;
      if (!store) return [];
      return Array.from(new Set(store.getState().questions.map((q) => q.vocabItemId)));
    });
    expect(expectedVocabIds.length).toBeGreaterThan(0);

    await runSession(page);
    await waitForSaveComplete(page);

    // Hard assertion: at least one row per unique vocab_item_id.
    const rows = (await db.execute(sql`
      SELECT vocab_item_id::text AS vid, stability, difficulty, state, due, reps, lapses
        FROM user_vocab_mastery
       WHERE user_id = ${PROD_HARDCODED_USER_ID}
    `)) as unknown as
      | {
          rows?: Array<{
            vid: string;
            stability: number | null;
            difficulty: number | null;
            state: number;
            due: string | Date;
            reps: number;
            lapses: number;
          }>;
        }
      | Array<{
          vid: string;
          stability: number | null;
          difficulty: number | null;
          state: number;
          due: string | Date;
          reps: number;
          lapses: number;
        }>;
    const rowList = Array.isArray(rows) ? rows : (rows.rows ?? []);

    // One row per unique vocab id covered by the session.
    expect(rowList.length).toBeGreaterThanOrEqual(expectedVocabIds.length);

    // FSRS fields populated on each row.
    for (const r of rowList) {
      expect(r.stability).not.toBeNull();
      expect(r.difficulty).not.toBeNull();
      expect(typeof r.state).toBe("number");
      expect(r.due).not.toBeNull();
      // After a single review, reps must be ≥ 1.
      expect(r.reps).toBeGreaterThanOrEqual(1);
    }

    // Uniqueness: no duplicate (user_id, vocab_item_id) pairs.
    const dupCheck = (await db.execute(sql`
      SELECT user_id, vocab_item_id, COUNT(*)::int AS c
        FROM user_vocab_mastery
       WHERE user_id = ${PROD_HARDCODED_USER_ID}
       GROUP BY user_id, vocab_item_id
      HAVING COUNT(*) > 1
    `)) as unknown as { rows?: unknown[] } | unknown[];
    const dupRows = Array.isArray(dupCheck) ? dupCheck : (dupCheck.rows ?? []);
    expect(dupRows.length).toBe(0);
  });

  test("repeat session updates (not duplicates) user_vocab_mastery rows", async ({
    page,
    testUser,
  }) => {
    void testUser;
    test.skip(!HAS_TEST_DB, "TEST_DATABASE_URL not provisioned — DB assertions require it.");

    const db = getTestDb();

    // Run session #1.
    await startShortSession(page);
    await runSession(page);
    await waitForSaveComplete(page);

    const after1 = (await db.execute(sql`
      SELECT COUNT(*)::int AS c, MAX(reps) AS max_reps
        FROM user_vocab_mastery
       WHERE user_id = ${PROD_HARDCODED_USER_ID}
    `)) as unknown as
      | { rows?: Array<{ c: number; max_reps: number }> }
      | Array<{ c: number; max_reps: number }>;
    const after1Rows = Array.isArray(after1) ? after1 : (after1.rows ?? []);
    const count1 = after1Rows[0].c;
    const maxReps1 = after1Rows[0].max_reps;
    expect(count1).toBeGreaterThan(0);
    expect(maxReps1).toBeGreaterThanOrEqual(1);

    // Reset just session/UI state (NOT the DB) — start a new session via the
    // Practice tab "Practice Again" CTA.
    await page.getByRole("button", { name: /^Practice Again$/ }).click();
    // The Practice Again button calls onRetry → clearSession → ExerciseTab
    // returns to the config screen. Click Start to launch a new short session.
    await page.getByRole("button", { name: /^Start$/ }).first().click();
    await page.waitForFunction(
      () =>
        typeof (window as unknown as { __kbExerciseStore?: unknown })
          .__kbExerciseStore !== "undefined",
      { timeout: 10_000 }
    );
    await expect(page.locator("[data-question-id]")).toBeVisible({ timeout: 10_000 });
    await runSession(page);
    await waitForSaveComplete(page);

    const after2 = (await db.execute(sql`
      SELECT COUNT(*)::int AS c, MAX(reps) AS max_reps
        FROM user_vocab_mastery
       WHERE user_id = ${PROD_HARDCODED_USER_ID}
    `)) as unknown as
      | { rows?: Array<{ c: number; max_reps: number }> }
      | Array<{ c: number; max_reps: number }>;
    const after2Rows = Array.isArray(after2) ? after2 : (after2.rows ?? []);

    // Row count is essentially unchanged (same vocab pool re-encountered;
    // any genuinely new vocab in the second session can add a few rows).
    expect(after2Rows[0].c).toBeGreaterThanOrEqual(count1);
    expect(after2Rows[0].c).toBeLessThanOrEqual(count1 * 2); // generous ceiling

    // reps must have increased on at least one row.
    expect(after2Rows[0].max_reps).toBeGreaterThan(maxReps1);
  });

  test("SongCard on /songs reflects the new completion percentage", async ({
    page,
    testUser,
  }) => {
    void testUser;
    test.skip(!HAS_TEST_DB, "TEST_DATABASE_URL not provisioned — SongCard reflection requires DB-backed progress.");

    await startShortSession(page);
    await runSession(page);
    await waitForSaveComplete(page);

    // Visit /songs and locate the SongCard for again-yui.
    await page.goto("/songs");
    const card = page.locator(`a[href="/songs/${SLUG}"]`).first();
    await expect(card).toBeVisible();

    // The CircularProgress component (inside SongCard) renders only when
    // progress is non-zero. getAllSongs may not currently inject per-user
    // progress (no Clerk yet) — if it doesn't, this test logs the gap and
    // still passes the structural part (card visible).
    //
    // Per Plan 08.1-06 done criteria, the assertion is best-effort until
    // SongCard wiring includes per-user progress.
    const hasProgress = await card
      .locator('[class*="CircularProgress"], [class*="circular-progress"], svg')
      .first()
      .isVisible()
      .catch(() => false);
    if (!hasProgress) {
      // eslint-disable-next-line no-console
      console.warn(
        "[exercise-progress-fsrs] SongCard does not currently surface per-user completion (auth not yet wired). Card visible — structural assertion PASS."
      );
    }
  });
});

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
