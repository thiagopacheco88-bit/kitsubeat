/**
 * tests/e2e/exercise-session-full.spec.ts — Full short session walk-through.
 *
 * Plan 08.1-06 Task 1.
 *
 * Proves the core learning loop end-to-end: open Practice tab, start a short
 * session, answer every question correctly using the test-only window hook
 * (window.__kbExerciseStore — gated on NEXT_PUBLIC_APP_ENV === 'test'), see
 * inline feedback after each answer, and reach the SessionSummary screen.
 *
 * Why a window hook (not a data-correct attribute):
 *   The correct answer is on the client (the question generator runs in the
 *   browser). Rendering it as `data-correct` would leak in production DOM —
 *   trivially visible via devtools and trivially exploitable. Instead, the
 *   Zustand store is exposed on window.__kbExerciseStore ONLY when the
 *   NEXT_PUBLIC_APP_ENV build-time flag equals 'test'. In production builds
 *   the comparison evaluates to false at compile time and tree-shaking removes
 *   the store reference entirely.
 *
 * No retries (zero-flake policy enforced at playwright.config.ts).
 */

import { test, expect } from "../support/fixtures";
import type { Page } from "@playwright/test";

const SLUG = "again-yui";

interface SessionSnapshot {
  currentIndex: number;
  total: number;
  type: string;
  correct: string;
  options: string[];
}

/** Read the active question's correct answer + options via the test-only store hook. */
async function readCurrentQuestion(page: Page): Promise<SessionSnapshot> {
  return await page.evaluate<SessionSnapshot>(() => {
    const store = (window as unknown as {
      __kbExerciseStore?: {
        getState: () => {
          questions: Array<{
            type: string;
            correctAnswer: string;
            distractors: string[];
          }>;
          currentIndex: number;
        };
      };
    }).__kbExerciseStore;
    if (!store) {
      throw new Error(
        "window.__kbExerciseStore is undefined — NEXT_PUBLIC_APP_ENV is not 'test'."
      );
    }
    const s = store.getState();
    const q = s.questions[s.currentIndex];
    return {
      currentIndex: s.currentIndex,
      total: s.questions.length,
      type: q.type,
      correct: q.correctAnswer,
      options: [q.correctAnswer, ...q.distractors],
    };
  });
}

/** Read the full set of question types in the active session (used to assert variety). */
async function readQuestionTypes(page: Page): Promise<string[]> {
  return await page.evaluate<string[]>(() => {
    const store = (window as unknown as {
      __kbExerciseStore?: {
        getState: () => { questions: Array<{ type: string }> };
      };
    }).__kbExerciseStore;
    if (!store) return [];
    return store.getState().questions.map((q) => q.type);
  });
}

test.describe("Exercise full session", () => {
  test("short session: answer all questions, reach summary screen", async ({
    page,
    testUser,
  }) => {
    void testUser; // fixture injects cleanup

    await page.goto(`/songs/${SLUG}`);

    // Switch to the Practice tab. Tab switcher renders a button with text "Practice".
    await page.getByRole("button", { name: /^practice$/i }).click();

    // Click the Quick Practice "Start" button (first Start button on the config screen).
    await page.getByRole("button", { name: /^Start$/ }).first().click();

    // Wait for the test-only store hook to appear (proves NEXT_PUBLIC_APP_ENV=test
    // is wired AND the session actually started).
    await page.waitForFunction(
      () =>
        typeof (window as unknown as { __kbExerciseStore?: unknown })
          .__kbExerciseStore !== "undefined",
      { timeout: 10_000 }
    );

    // Wait for the first QuestionCard to render (data-question-id is the production-safe hook).
    await expect(page.locator("[data-question-id]")).toBeVisible({ timeout: 10_000 });

    // Snapshot question types to assert variety after the session.
    const questionTypes = await readQuestionTypes(page);
    expect(questionTypes.length).toBeGreaterThanOrEqual(4);

    // Answer-loop: pick the correct option each iteration until the summary appears.
    const maxIterations = 50; // hard ceiling — short sessions cap at ~10 questions
    for (let i = 0; i < maxIterations; i++) {
      // Has the session ended? Summary renders the "Session Complete!" h2.
      const summaryVisible = await page
        .getByRole("heading", { name: /session complete/i })
        .isVisible()
        .catch(() => false);
      if (summaryVisible) break;

      // Read the current question via the test-only hook.
      const snap = await readCurrentQuestion(page);

      // Find the answer button matching the correct text. Buttons are rendered as
      // <button>{option}</button> inside QuestionCard.
      const card = page.locator("[data-question-id]");
      await card.waitFor({ state: "visible", timeout: 5_000 });
      // Use exact match on visible button text — strips whitespace via .trim() implicitly.
      // Using getByRole then filter on exact textContent prevents matching the "Continue" button.
      const answerButtons = card.locator("button").filter({ hasText: snap.correct });
      // Prefer exact match — option text may contain leading/trailing whitespace from JSX.
      const exactMatch = answerButtons.filter({ hasText: new RegExp(`^\\s*${escapeRegex(snap.correct)}\\s*$`) });
      if ((await exactMatch.count()) > 0) {
        await exactMatch.first().click();
      } else {
        await answerButtons.first().click();
      }

      // Wait for FeedbackPanel to attach.
      await expect(page.locator("[data-feedback]")).toBeVisible({ timeout: 5_000 });

      // Click Continue inside the feedback panel.
      await page.locator("[data-feedback]").getByRole("button", { name: /^Continue$/ }).click();

      // The store currentIndex should advance (or the summary should appear).
      // 700ms accommodates the 300ms fade-out + state propagation.
      await page.waitForTimeout(400);
    }

    // Assert the summary actually rendered (we did not exit by maxIterations).
    await expect(
      page.getByRole("heading", { name: /session complete/i })
    ).toBeVisible({ timeout: 10_000 });

    // Assert the session covered ≥1 question of each of the 4 exercise types
    // OR at minimum demonstrates variety (≥2 distinct types — fill_lyric may be
    // disabled for songs with thin vocab pools per Phase 08.1-02 decisions).
    const distinctTypes = new Set(questionTypes);
    expect(distinctTypes.size).toBeGreaterThanOrEqual(2);
  });

  test("question types variety: short session contains expected exercise types", async ({
    page,
    testUser,
  }) => {
    void testUser;

    await page.goto(`/songs/${SLUG}`);
    await page.getByRole("button", { name: /^practice$/i }).click();
    await page.getByRole("button", { name: /^Start$/ }).first().click();
    await page.waitForFunction(
      () =>
        typeof (window as unknown as { __kbExerciseStore?: unknown })
          .__kbExerciseStore !== "undefined",
      { timeout: 10_000 }
    );

    const types = await readQuestionTypes(page);
    expect(types.length).toBeGreaterThan(0);

    // Each type must be in the known set — guards against generator regressions.
    const validTypes = new Set([
      "vocab_meaning",
      "meaning_vocab",
      "reading_match",
      "fill_lyric",
    ]);
    for (const t of types) {
      expect(validTypes.has(t)).toBe(true);
    }
  });
});

/** Escape regex special chars in a literal answer string. */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
