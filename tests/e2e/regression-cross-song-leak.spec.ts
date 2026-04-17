/**
 * tests/e2e/regression-cross-song-leak.spec.ts
 *
 * Plan 08.1-07 Task 1 — Regression guard for cross-song session leakage.
 *
 * CONTEXT-locked invariant (08.1-CONTEXT > Regression guards):
 *
 *   "Cross-song session leakage — isSessionForSong guard verified
 *    (Song A session never appears on Song B exercise tab)"
 *
 * Two angles, both deeper than plan 08.1-06's basic resume guard:
 *
 *   1. NATURAL DRIFT: Start a session on Song A (answer 3 questions, do not
 *      finish), navigate to Song B, open Practice — Song B must show the
 *      config screen, NOT the in-progress session. THEN navigate back to
 *      Song A — the original session must STILL resume (proves Song B did
 *      not clobber the persisted session, just refused to honor it).
 *
 *   2. ACTIVE TAMPERING: Open Song B, inject a fake exerciseSession into
 *      localStorage with `songVersionId` pointing at Song A. Reload Song B's
 *      Practice tab. The `isSessionForSong()` guard in
 *      `src/stores/exerciseSession.ts` must reject the mismatched id and
 *      land the user on the config screen. This proves the guard is a real
 *      check, not just a happy-path coincidence.
 *
 * Implementation reference:
 *   - src/stores/exerciseSession.ts::isSessionForSong (lines 195-204)
 *   - src/app/songs/[slug]/components/ExerciseTab.tsx (lines 47, 75-77)
 *
 * Test-hook dependency:
 *   `window.__kbExerciseStore` is gated on NEXT_PUBLIC_APP_ENV === 'test'
 *   (single-condition gate from plan 08.1-06). Used here only to read the
 *   persisted song id for sanity assertions; the regression assertions are
 *   driven by visible UI state (config screen vs question card).
 *
 * Zero retries (enforced at playwright.config.ts).
 */

import { test, expect } from "../support/fixtures";
import type { Page } from "@playwright/test";

const SLUG_A = "again-yui";
const SLUG_B = "red-swan-yoshiki-feat-hyde";
const STORAGE_KEY = "kitsubeat-exercise-session";

interface QuestionPeek {
  id: string;
  index: number;
  total: number;
  correct: string;
  distractors: string[];
}

async function startShortSession(page: Page, slug: string): Promise<void> {
  await page.goto(`/songs/${slug}`);
  await page.getByRole("button", { name: /^practice$/i }).click();
  await page.getByRole("button", { name: /^Start$/ }).first().click();
  await page.waitForFunction(
    () =>
      typeof (window as unknown as { __kbExerciseStore?: unknown })
        .__kbExerciseStore !== "undefined",
    { timeout: 10_000 }
  );
  await expect(page.locator("[data-question-id]")).toBeVisible({
    timeout: 10_000,
  });
}

async function peekCurrent(page: Page): Promise<QuestionPeek> {
  return await page.evaluate<QuestionPeek>(() => {
    const store = (
      window as unknown as {
        __kbExerciseStore?: {
          getState: () => {
            questions: Array<{
              id: string;
              correctAnswer: string;
              distractors: string[];
            }>;
            currentIndex: number;
          };
        };
      }
    ).__kbExerciseStore;
    if (!store) throw new Error("__kbExerciseStore unavailable");
    const s = store.getState();
    const q = s.questions[s.currentIndex];
    return {
      id: q.id,
      index: s.currentIndex,
      total: s.questions.length,
      correct: q.correctAnswer,
      distractors: q.distractors,
    };
  });
}

async function answerCurrent(page: Page): Promise<string> {
  const snap = await peekCurrent(page);
  const card = page.locator("[data-question-id]");
  await card.waitFor({ state: "visible", timeout: 5_000 });

  const target = snap.correct;
  const buttons = card.locator("button").filter({ hasText: target });
  const exact = buttons.filter({
    hasText: new RegExp(`^\\s*${escapeRegex(target)}\\s*$`),
  });
  if ((await exact.count()) > 0) {
    await exact.first().click();
  } else {
    await buttons.first().click();
  }

  await expect(page.locator("[data-feedback]")).toBeVisible({
    timeout: 5_000,
  });
  await page
    .locator("[data-feedback]")
    .getByRole("button", { name: /^Continue$/ })
    .click();
  await page.waitForTimeout(400);
  return snap.id;
}

test.describe("Regression: cross-song session leakage", () => {
  test("Song A session state in localStorage does not trigger resume on Song B", async ({
    page,
    testUser,
    seededSong,
  }) => {
    void testUser;

    // Resolve song IDs up front — we will assert against the persisted store id.
    const songA = await seededSong(SLUG_A);
    const songB = await seededSong(SLUG_B);
    expect(songA.songVersionId).not.toBe(songB.songVersionId);

    // 1. Start a session on Song A and answer 3 questions (don't finish).
    await startShortSession(page, SLUG_A);
    for (let i = 0; i < 3; i++) {
      await answerCurrent(page);
    }

    // 2. Sanity: localStorage carries Song A's songVersionId.
    const beforeNav = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      STORAGE_KEY
    );
    expect(beforeNav).not.toBeNull();
    expect(beforeNav).toContain(songA.songVersionId);

    // 3. Navigate to Song B, open the Practice tab.
    await page.goto(`/songs/${SLUG_B}`);
    await page.getByRole("button", { name: /^practice$/i }).click();

    // 4. Song B must show the config screen (Quick Practice / Full Lesson cards),
    //    NOT the in-progress session — isSessionForSong rejected the mismatch.
    await expect(
      page.getByRole("button", { name: /^Start$/ }).first()
    ).toBeVisible({ timeout: 10_000 });
    expect(await page.locator("[data-question-id]").count()).toBe(0);
    expect(await page.locator("[data-feedback]").count()).toBe(0);

    // 5. The persisted Song A session was NOT clobbered. Navigate back —
    //    Song A's session resumes exactly where it was left.
    await page.goto(`/songs/${SLUG_A}`);
    await page.getByRole("button", { name: /^practice$/i }).click();
    await page.waitForFunction(
      () =>
        typeof (window as unknown as { __kbExerciseStore?: unknown })
          .__kbExerciseStore !== "undefined",
      { timeout: 10_000 }
    );
    await expect(page.locator("[data-question-id]")).toBeVisible({
      timeout: 10_000,
    });

    const resumed = await peekCurrent(page);
    expect(resumed.index).toBeGreaterThanOrEqual(3);

    // The persisted store still holds Song A's id — Song B never overwrote it.
    const afterReturn = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      STORAGE_KEY
    );
    expect(afterReturn).toContain(songA.songVersionId);
    expect(afterReturn).not.toContain(songB.songVersionId);
  });

  test("manually setting localStorage with wrong songVersionId does not hijack another song", async ({
    page,
    testUser,
    seededSong,
  }) => {
    void testUser;

    const songA = await seededSong(SLUG_A);
    const songB = await seededSong(SLUG_B);
    expect(songA.songVersionId).not.toBe(songB.songVersionId);

    // 1. Land on Song B first so localStorage is owned by this origin.
    await page.goto(`/songs/${SLUG_B}`);

    // 2. Inject a fully-formed Zustand-persist payload that LOOKS like an
    //    in-progress session for Song A. Shape mirrors what zustand/middleware
    //    persist writes (see src/stores/exerciseSession.ts persist config).
    const fake = {
      state: {
        songVersionId: songA.songVersionId, // <-- mismatch attack
        questions: [
          {
            id: "00000000-0000-0000-0000-000000000001",
            type: "vocab_meaning",
            vocabItemId: "00000000-0000-0000-0000-0000000000aa",
            prompt: "fake-prompt",
            correctAnswer: "fake-answer",
            distractors: ["d1", "d2", "d3"],
            explanation: "fake explanation",
            vocabInfo: {
              surface: "fake",
              reading: "fake",
              romaji: "fake",
              vocab_item_id: "00000000-0000-0000-0000-0000000000aa",
            },
          },
          {
            id: "00000000-0000-0000-0000-000000000002",
            type: "vocab_meaning",
            vocabItemId: "00000000-0000-0000-0000-0000000000bb",
            prompt: "fake-prompt-2",
            correctAnswer: "fake-answer-2",
            distractors: ["d1", "d2", "d3"],
            explanation: "fake explanation 2",
            vocabInfo: {
              surface: "fake2",
              reading: "fake2",
              romaji: "fake2",
              vocab_item_id: "00000000-0000-0000-0000-0000000000bb",
            },
          },
        ],
        currentIndex: 1, // pretend the user is mid-session (past index 0)
        answers: {},
        startedAt: Date.now(),
        mode: "short",
        tiers: {},
        revealedQuestionIds: {},
      },
      version: 0,
    };

    await page.evaluate(
      ([key, value]) => {
        window.localStorage.setItem(key, value);
      },
      [STORAGE_KEY, JSON.stringify(fake)]
    );

    // 3. Reload Song B and open Practice. The persist middleware will rehydrate
    //    the injected payload, but isSessionForSong() must reject it because
    //    songVersionId points at Song A, not Song B.
    await page.reload();
    await page.getByRole("button", { name: /^practice$/i }).click();

    // 4. Config screen visible — NOT a session view.
    await expect(
      page.getByRole("button", { name: /^Start$/ }).first()
    ).toBeVisible({ timeout: 10_000 });
    expect(await page.locator("[data-question-id]").count()).toBe(0);
    expect(await page.locator("[data-feedback]").count()).toBe(0);

    // 5. Sanity: the injected payload IS still in localStorage (we did not
    //    clobber it as a side effect). The defense is in the read path
    //    (isSessionForSong), not in eager rewriting.
    const afterReload = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      STORAGE_KEY
    );
    expect(afterReload).not.toBeNull();
    expect(afterReload).toContain(songA.songVersionId);
  });
});

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
