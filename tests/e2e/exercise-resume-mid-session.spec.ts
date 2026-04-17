/**
 * tests/e2e/exercise-resume-mid-session.spec.ts — Zustand persist resumption.
 *
 * Plan 08.1-06 Task 2.
 *
 * Proves three invariants of the cross-session storage layer:
 *
 *   1. Closing the browser mid-session (simulated via page.reload) restores
 *      the same question index — the user does NOT restart at question 1.
 *      Backed by Zustand persist middleware writing to localStorage under the
 *      key `kitsubeat-exercise-session` (see src/stores/exerciseSession.ts).
 *
 *   2. A session for Song A does NOT bleed into Song B's Practice tab.
 *      Backed by `isSessionForSong()` in src/stores/exerciseSession.ts which
 *      checks both songVersionId match AND non-exhausted question index.
 *
 *   3. Starting a fresh session after completing one resets the counter
 *      back to question 1.
 *
 * Question identity is tracked via `data-question-id` (a UUID added in
 * Task 1 — production-safe, reveals nothing about the answer).
 *
 * No retries (zero-flake policy enforced at playwright.config.ts).
 */

import { test, expect } from "../support/fixtures";
import type { Page } from "@playwright/test";

const SLUG_A = "again-yui";
const SLUG_B = "red-swan-yoshiki-feat-hyde";
const STORAGE_KEY = "kitsubeat-exercise-session";

interface QuestionPeek {
  id: string;
  type: string;
  correct: string;
  index: number;
  total: number;
}

async function startShortSession(page: Page, slug: string) {
  await page.goto(`/songs/${slug}`);
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
          questions: Array<{ id: string; type: string; correctAnswer: string; distractors: string[] }>;
          currentIndex: number;
        };
      };
    }).__kbExerciseStore;
    if (!store) throw new Error("__kbExerciseStore unavailable");
    const s = store.getState();
    const q = s.questions[s.currentIndex];
    return {
      id: q.id,
      type: q.type,
      correct: q.correctAnswer,
      index: s.currentIndex,
      total: s.questions.length,
    };
  });
}

async function answerCurrent(page: Page, useCorrect: boolean = true) {
  const snap = await peekCurrent(page);
  const card = page.locator("[data-question-id]");
  await card.waitFor({ state: "visible", timeout: 5_000 });

  const target = useCorrect
    ? snap.correct
    : await page.evaluate<string>(() => {
        const store = (window as unknown as {
          __kbExerciseStore: {
            getState: () => {
              questions: Array<{ correctAnswer: string; distractors: string[] }>;
              currentIndex: number;
            };
          };
        }).__kbExerciseStore;
        const s = store.getState();
        return s.questions[s.currentIndex].distractors[0];
      });

  const buttons = card.locator("button").filter({ hasText: target });
  const exact = buttons.filter({
    hasText: new RegExp(`^\\s*${escapeRegex(target)}\\s*$`),
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
  return snap.id;
}

test.describe("Exercise resume mid-session", () => {
  test("page reload restores the same question index (not question 1)", async ({
    page,
    testUser,
  }) => {
    void testUser;

    await startShortSession(page, SLUG_A);

    // Answer 3 questions — record their IDs so we can prove the resumed view is
    // beyond them (NOT one of the first three).
    const answeredIds: string[] = [];
    for (let i = 0; i < 3; i++) {
      const id = await answerCurrent(page, true);
      answeredIds.push(id);
    }

    // Verify localStorage contains the persisted session BEFORE reload.
    const beforeReload = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      STORAGE_KEY
    );
    expect(beforeReload).not.toBeNull();
    expect(beforeReload).toContain("songVersionId");

    // Reload the page (simulates closing & reopening the browser).
    await page.reload();

    // Wait for hydration — the test hook reattaches AND the Zustand persist
    // middleware fires onRehydrateStorage which sets _hasHydrated=true.
    await page.waitForFunction(
      () =>
        typeof (window as unknown as { __kbExerciseStore?: unknown })
          .__kbExerciseStore !== "undefined",
      { timeout: 10_000 }
    );

    // After hydration, ExerciseTab's `hasActiveSession` (isSessionForSong)
    // returns true and we land directly in the session view (no resume prompt).
    await expect(page.locator("[data-question-id]")).toBeVisible({ timeout: 10_000 });

    // Verify localStorage still holds the session after reload.
    const afterReload = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      STORAGE_KEY
    );
    expect(afterReload).not.toBeNull();
    expect(afterReload).toContain("songVersionId");

    // The current question must NOT be one of the first three we answered.
    const resumed = await peekCurrent(page);
    expect(answeredIds).not.toContain(resumed.id);
    expect(resumed.index).toBeGreaterThanOrEqual(3);
  });

  test("session for Song A does not appear on Song B exercise tab", async ({
    page,
    testUser,
  }) => {
    void testUser;

    // Start on Song A, answer 2 questions (don't finish).
    await startShortSession(page, SLUG_A);
    await answerCurrent(page, true);
    await answerCurrent(page, true);

    // Snapshot the localStorage songVersionId for sanity.
    const sessionA = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      STORAGE_KEY
    );
    expect(sessionA).not.toBeNull();

    // Navigate to Song B and open Practice.
    await page.goto(`/songs/${SLUG_B}`);
    await page.getByRole("button", { name: /^practice$/i }).click();

    // On Song B, isSessionForSong returns false (different songVersionId), so
    // the user lands on the config screen (Quick Practice / Full Lesson cards),
    // NOT in mid-session. Assert the "Start" button is visible.
    await expect(
      page.getByRole("button", { name: /^Start$/ }).first()
    ).toBeVisible({ timeout: 10_000 });

    // No question card should be present on Song B yet.
    expect(await page.locator("[data-question-id]").count()).toBe(0);
  });

  test("starting a new session clears previous session state", async ({
    page,
    testUser,
  }) => {
    void testUser;

    // Run a partial session, answer 2 questions, then click "Return" (the
    // Practice tab's escape hatch — calls clearSession).
    await startShortSession(page, SLUG_A);
    await answerCurrent(page, true);
    await answerCurrent(page, true);

    // Click Return to go back to the config screen (this calls clearSession).
    await page.getByRole("button", { name: /^Return$/ }).click();

    // Config screen should be visible again.
    await expect(
      page.getByRole("button", { name: /^Start$/ }).first()
    ).toBeVisible();

    // Start a fresh session.
    await page.getByRole("button", { name: /^Start$/ }).first().click();
    await expect(page.locator("[data-question-id]")).toBeVisible({ timeout: 10_000 });

    // Index must be 0 (question 1).
    const fresh = await peekCurrent(page);
    expect(fresh.index).toBe(0);
  });
});

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
