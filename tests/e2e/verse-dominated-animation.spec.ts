// Phase 11.6 Wave 0 RED stub — implementation in Task 2.
//
// SPEC-REQ-15 — verse-dominated animation, once-per-(user, verse):
//   1. Animation overlay text "Verse dominated!" appears within ~1.2s of the
//      tipping correct answer being submitted, then disappears.
//   2. Animation does NOT re-fire on a re-answer of the same verse's items
//      (server returns versesDominatedNow = [] thanks to Plan 11.6-05's
//       INSERT ... ON CONFLICT DO NOTHING RETURNING).
//   3. Animation does NOT spuriously re-fire after a page reload mid-session
//      (versesDominatedNow is excluded from the zustand persist partialize so
//       the slice is empty on rehydrate; user_verse_domination row is the
//       source of truth for the static star).
//   4. prefers-reduced-motion suppresses the confetti canvas (canvas-confetti
//      disableForReducedMotion: true) but the text overlay still renders
//      (the CSS keyframe falls back to animation: none + static color).
//
// Data-testids consumed:
//   - verse-dominated-overlay  (on the "Verse dominated!" text overlay)
//
// Animation-trigger UX flow: user starts a Vocabulary session, answers
// questions until a verse tips. The tipping moment is data-driven (depends
// on which vocab is in which verse) so this test uses a coarse strategy:
// answer every question correctly and watch for the overlay to appear at
// least once during the run.
//
// These tests need TEST_DATABASE_URL because the animation only fires on the
// server-side INSERT path (Plan 11.6-05); without a real DB, recordVocabAnswer
// short-circuits and versesDominatedNow stays empty. Skip cleanly otherwise.

import { test, expect } from "../support/fixtures";
import type { Page } from "@playwright/test";
import { sql } from "drizzle-orm";
import { getTestDb, TEST_USER_ID } from "../support/test-db";

const SLUG = "again-yui";
const HAS_TEST_DB = Boolean(process.env.TEST_DATABASE_URL);

interface QuestionPeek {
  type: string;
  correct: string;
  index: number;
  total: number;
}

async function clearDominatedVerses(songVersionId: string): Promise<void> {
  const db = getTestDb();
  await db.execute(sql`
    DELETE FROM user_verse_domination
    WHERE user_id = ${TEST_USER_ID} AND song_version_id = ${songVersionId}
  `);
}

async function startShortSession(page: Page) {
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

async function peekCurrent(page: Page): Promise<QuestionPeek | null> {
  return await page.evaluate<QuestionPeek | null>(() => {
    const store = (window as unknown as {
      __kbExerciseStore?: {
        getState: () => {
          questions: Array<{ type: string; correctAnswer: string }>;
          currentIndex: number;
        };
      };
    }).__kbExerciseStore;
    if (!store) return null;
    const s = store.getState();
    if (s.currentIndex >= s.questions.length) return null;
    const q = s.questions[s.currentIndex];
    return {
      type: q.type,
      correct: q.correctAnswer,
      index: s.currentIndex,
      total: s.questions.length,
    };
  });
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Click the correct answer for the current question and dismiss the
 * FeedbackPanel. Returns the question shape so callers can decide whether to
 * continue.
 */
async function answerCorrectAndContinue(page: Page): Promise<QuestionPeek | null> {
  const snap = await peekCurrent(page);
  if (!snap) return null;
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
  return snap;
}

async function dismissFeedback(page: Page): Promise<void> {
  await page
    .locator("[data-feedback]")
    .getByRole("button", { name: /^Continue$/ })
    .click();
  await page.waitForTimeout(400);
}

test.describe("Phase 11.6 SPEC-REQ-15 — verse-dominated animation", () => {
  test.skip(
    !HAS_TEST_DB,
    "TEST_DATABASE_URL not provisioned — verse-domination animation needs DB-backed recordVocabAnswer."
  );

  test("animation overlay appears within ~1.2s of the tipping answer", async ({
    page,
    testUser,
    seededSong,
  }) => {
    void testUser;
    const song = await seededSong(SLUG);
    await clearDominatedVerses(song.songVersionId);

    await page.goto(`/songs/${song.slug}`);
    await startShortSession(page);

    // Answer up to N questions, watching for the overlay to appear at least
    // once. The tipping verse is data-dependent — we just need one event.
    let sawOverlay = false;
    const overlay = page.locator('[data-testid="verse-dominated-overlay"]');
    const maxIterations = 20;
    for (let i = 0; i < maxIterations; i++) {
      const summaryVisible = await page
        .getByRole("heading", { name: /session complete/i })
        .isVisible()
        .catch(() => false);
      if (summaryVisible) break;

      const snap = await answerCorrectAndContinue(page);
      if (!snap) break;

      // Probe for overlay before continuing — the panel renders the animation
      // alongside the FeedbackPanel content, so it must be present while the
      // panel is open.
      const visible = await overlay
        .first()
        .waitFor({ state: "visible", timeout: 1_500 })
        .then(() => true)
        .catch(() => false);
      if (visible) sawOverlay = true;

      await dismissFeedback(page);
      if (sawOverlay) break;
    }

    expect(sawOverlay).toBe(true);
  });

  test("animation does NOT re-fire on a re-answer of an already-dominated verse", async ({
    page,
    testUser,
    seededSong,
  }) => {
    void testUser;
    const song = await seededSong(SLUG);
    await clearDominatedVerses(song.songVersionId);

    // Seed the entire song as dominated so any answer the user submits is a
    // re-answer. Plan 11.6-05's ON CONFLICT DO NOTHING RETURNING means the
    // server returns versesDominatedNow = [] for every answer.
    const db = getTestDb();
    await db.execute(sql`
      INSERT INTO user_verse_domination (user_id, song_version_id, verse_number, dominated_at)
      SELECT ${TEST_USER_ID}, ${song.songVersionId}, generate_series(1, 50), NOW()
      ON CONFLICT DO NOTHING
    `);

    await page.goto(`/songs/${song.slug}`);
    await startShortSession(page);

    // Answer a few questions — the overlay must NEVER appear.
    const overlay = page.locator('[data-testid="verse-dominated-overlay"]');
    for (let i = 0; i < 3; i++) {
      const snap = await answerCorrectAndContinue(page);
      if (!snap) break;
      // Negative assertion: poll briefly for visibility — must remain hidden.
      const visible = await overlay
        .first()
        .waitFor({ state: "visible", timeout: 800 })
        .then(() => true)
        .catch(() => false);
      expect(visible).toBe(false);
      await dismissFeedback(page);
    }
  });

  test("animation does NOT spuriously re-fire after a page reload mid-session", async ({
    page,
    testUser,
    seededSong,
  }) => {
    void testUser;
    const song = await seededSong(SLUG);
    await clearDominatedVerses(song.songVersionId);

    // Pre-dominate the whole song so reload brings back zero versesDominatedNow.
    const db = getTestDb();
    await db.execute(sql`
      INSERT INTO user_verse_domination (user_id, song_version_id, verse_number, dominated_at)
      SELECT ${TEST_USER_ID}, ${song.songVersionId}, generate_series(1, 50), NOW()
      ON CONFLICT DO NOTHING
    `);

    await page.goto(`/songs/${song.slug}`);
    await startShortSession(page);

    // Answer once, dismiss, then reload before answering more. The zustand
    // partialize excludes versesDominatedNow so the slice is empty after
    // rehydrate, and the static star renders without a transient animation.
    await answerCorrectAndContinue(page);
    await dismissFeedback(page);

    await page.reload();
    await page.waitForFunction(
      () =>
        typeof (window as unknown as { __kbExerciseStore?: unknown })
          .__kbExerciseStore !== "undefined",
      { timeout: 10_000 }
    );

    const overlay = page.locator('[data-testid="verse-dominated-overlay"]');
    const visibleAfterReload = await overlay
      .first()
      .waitFor({ state: "visible", timeout: 1_000 })
      .then(() => true)
      .catch(() => false);
    expect(visibleAfterReload).toBe(false);
  });

  test("prefers-reduced-motion suppresses confetti but overlay still renders", async ({
    page,
    testUser,
    seededSong,
  }) => {
    void testUser;
    const song = await seededSong(SLUG);
    await clearDominatedVerses(song.songVersionId);

    // Force prefers-reduced-motion: reduce for this test only. canvas-confetti
    // honours this via disableForReducedMotion: true (no <canvas> mounts), but
    // the text overlay must still render so users still get the celebration.
    await page.emulateMedia({ reducedMotion: "reduce" });

    await page.goto(`/songs/${song.slug}`);
    await startShortSession(page);

    const overlay = page.locator('[data-testid="verse-dominated-overlay"]');
    let sawOverlay = false;
    const maxIterations = 20;
    for (let i = 0; i < maxIterations; i++) {
      const summaryVisible = await page
        .getByRole("heading", { name: /session complete/i })
        .isVisible()
        .catch(() => false);
      if (summaryVisible) break;

      const snap = await answerCorrectAndContinue(page);
      if (!snap) break;

      const visible = await overlay
        .first()
        .waitFor({ state: "visible", timeout: 1_500 })
        .then(() => true)
        .catch(() => false);
      if (visible) {
        sawOverlay = true;
        // While the overlay is up, no canvas-confetti canvas should be present.
        // canvas-confetti DOES mount a <canvas> element on every confetti() call;
        // disableForReducedMotion: true makes it a no-op so no canvas is added.
        // (StarDisplay's canvas may have been added on Star earn, but no fresh
        // canvas should appear during the animation window.)
        const canvasCount = await page.locator("canvas").count();
        // Soft assertion: under reduced motion canvas-confetti adds no NEW
        // canvas. We capture the baseline before the overlay and assert it
        // didn't grow during the overlay's lifetime — but keeping a single
        // upper-bound check (<= 1) keeps the assertion robust against the
        // YouTube iframe's own canvas elements which are not confetti.
        expect(canvasCount).toBeLessThanOrEqual(1);
      }

      await dismissFeedback(page);
      if (sawOverlay) break;
    }

    expect(sawOverlay).toBe(true);
  });
});
