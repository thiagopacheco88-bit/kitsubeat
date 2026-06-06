/**
 * tests/e2e/exercise-audio.spec.ts
 *
 * Verifies Web Speech API TTS integration in vocab practice.
 *
 * Headless Chromium returns an empty voice list, so every test injects a fake
 * speechSynthesis via addInitScript before the page loads. This makes
 * hasJapaneseVoice() return true and records all speak() calls in
 * window._ttsSpyCalls for assertion.
 *
 * Coverage:
 *  vocab_meaning
 *    - speaker button hidden before answering (cheat prevention)
 *    - speaker button visible after answering
 *    - auto-play fires on mount (word presentation)
 *    - button click fires TTS after answering
 *
 *  reading_match
 *    - speaker button hidden before answering (cheat prevention)
 *    - speaker button visible after answering
 *    - auto-play does NOT fire on mount (would reveal the answer)
 *    - button click fires TTS after answering
 *
 *  meaning_vocab / fill_lyric (unchanged behaviour — regressions)
 *    - "Hear answer" hidden before answering, visible + TTS fires after
 */

import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { resetTestProgress, TEST_USER_ID } from "../support/test-db";

const SLUG = "again-yui";

/**
 * Injected before page load — mocks speechSynthesis with one Japanese voice.
 */
const SPEECH_MOCK = `
  window._ttsSpyCalls = [];
  try {
    const _synth = window.speechSynthesis;
    const _fakeVoice = { lang: 'ja-JP', name: 'Mock JP Voice', default: false,
                         localService: true, voiceURI: 'mock-ja' };
    _synth.getVoices = function() { return [_fakeVoice]; };
    _synth.speak     = function(u) { window._ttsSpyCalls.push(u.text); };
    _synth.cancel    = function() {};

    // SpeechSynthesisUtterance.voice setter rejects plain objects in Chrome.
    // Patch it to silently ignore type errors so speakJapanese() can run to
    // completion and our _synth.speak spy can capture the call.
    const _voiceDesc = Object.getOwnPropertyDescriptor(SpeechSynthesisUtterance.prototype, 'voice');
    if (_voiceDesc && _voiceDesc.set) {
      Object.defineProperty(SpeechSynthesisUtterance.prototype, 'voice', {
        set(v) { try { _voiceDesc.set.call(this, v); } catch(e) {} },
        get: _voiceDesc.get,
        configurable: true,
        enumerable: _voiceDesc.enumerable,
      });
    }
  } catch(e) {
    console.warn('[tts-mock] init failed:', e);
  }
`;

interface QuestionInfo {
  type: string;
  surface: string;
  reading: string;
  correct: string;
}

async function readQuestions(page: Page): Promise<QuestionInfo[]> {
  return page.evaluate(() => {
    const store = (window as unknown as { __kbExerciseStore?: { getState: () => { questions: Array<{ type: string; vocabInfo?: { surface: string; reading: string }; correctAnswer: string }> } } }).__kbExerciseStore;
    if (!store) throw new Error("__kbExerciseStore not found");
    return store.getState().questions.map((q) => ({
      type: q.type,
      surface: q.vocabInfo?.surface ?? "",
      reading: q.vocabInfo?.reading ?? "",
      correct: q.correctAnswer,
    }));
  });
}

async function getTtsCalls(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { _ttsSpyCalls?: string[] })._ttsSpyCalls ?? []);
}

async function clearTtsCalls(page: Page): Promise<void> {
  await page.evaluate(() => { (window as unknown as { _ttsSpyCalls: string[] })._ttsSpyCalls = []; });
}

/** Dismiss any LearnCard currently showing by calling markLearnCardShown via the store. */
async function dismissLearnCards(page: Page, maxAttempts = 20): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    if (await page.locator("[data-question-id]").isVisible()) break;
    const learnCard = page.locator("[data-testid='learn-card']");
    if (!(await learnCard.isVisible())) {
      await page.waitForTimeout(400);
      continue;
    }
    const dismissed = await page.evaluate(() => {
      const store = (window as unknown as { __kbExerciseStore?: { getState: () => { questions: Array<{ vocabItemId: string }>; currentIndex: number; learnedVocabIds: Record<string, boolean>; markLearnCardShown: (id: string) => void } } }).__kbExerciseStore;
      if (!store) return false;
      const s = store.getState();
      const current = s.questions[s.currentIndex];
      if (!current?.vocabItemId || s.learnedVocabIds?.[current.vocabItemId]) return false;
      s.markLearnCardShown(current.vocabItemId);
      return true;
    });
    if (!dismissed) await learnCard.click({ force: true });
    await page.waitForTimeout(300);
  }
}

async function startSession(page: Page): Promise<void> {
  await page.goto(`/songs/${SLUG}`);
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /^practice$/i }).click();
  await page.getByRole("button", { name: /^Start$/ }).first().click();
  await page.waitForFunction(() => {
    const store = (window as unknown as { __kbExerciseStore?: { getState: () => { questions: unknown[] } } }).__kbExerciseStore;
    return !!store && store.getState().questions.length > 0;
  }, { timeout: 20_000 });
  await dismissLearnCards(page);
  await expect(page.locator("[data-question-id]")).toBeVisible({ timeout: 10_000 });
}

/** Answer the current question correctly and click Continue. */
async function answerAndContinue(page: Page, correct: string): Promise<void> {
  const card = page.locator("[data-question-id]");
  await card.waitFor({ state: "visible", timeout: 5_000 });
  const btn = card.locator("button").filter({ hasText: correct }).first();
  await btn.click();
  await expect(page.locator("[data-feedback]")).toBeVisible({ timeout: 5_000 });
  await page.locator("[data-feedback]").getByRole("button", { name: /^Continue$/ }).click();
  await page.waitForTimeout(400);
}

/** Answer the current question without clicking Continue (for post-answer state inspection). */
async function answerOnly(page: Page, correct: string): Promise<void> {
  const card = page.locator("[data-question-id]");
  await card.waitFor({ state: "visible", timeout: 5_000 });
  await card.locator("button").filter({ hasText: correct }).first().click();
  await expect(page.locator("[data-feedback]")).toBeVisible({ timeout: 5_000 });
}

/**
 * Advance through questions until the card at targetIndex is active.
 * Handles LearnCards that appear between MCQ questions for new vocabulary.
 */
async function advanceTo(page: Page, questions: QuestionInfo[], targetIndex: number): Promise<void> {
  for (let i = 0; i < targetIndex; i++) {
    await dismissLearnCards(page, 10);
    await answerAndContinue(page, questions[i].correct);
  }
  await dismissLearnCards(page, 10);
}

// ---------------------------------------------------------------------------

test.describe("Exercise audio — TTS integration", () => {
  test.setTimeout(90_000);

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000);
    // Reset FSRS progress so sessions always start with new-vocab questions.
    if (process.env.TEST_DATABASE_URL) {
      await resetTestProgress(TEST_USER_ID).catch(() => {});
    }
    const ctx = await browser.newContext();
    const warmPage = await ctx.newPage();
    try {
      await warmPage.goto(`http://localhost:7000/songs/${SLUG}`, {
        waitUntil: "load",
        timeout: 90_000,
      });
      await warmPage.waitForTimeout(4_000);
    } finally {
      await ctx.close();
    }
  });

  // ---------------------------------------------------------------------------
  // vocab_meaning
  // ---------------------------------------------------------------------------

  test("vocab_meaning: speaker button NOT visible before answering", async ({ page }) => {
    await page.addInitScript(SPEECH_MOCK);
    await startSession(page);

    const questions = await readQuestions(page);
    const idx = questions.findIndex((q) => q.type === "vocab_meaning");
    if (idx < 0) test.skip(true, "no vocab_meaning question in this session");

    await advanceTo(page, questions, idx);

    await expect(page.getByRole("button", { name: /play pronunciation/i })).not.toBeVisible();
  });

  test("vocab_meaning: speaker button visible after answering", async ({ page }) => {
    await page.addInitScript(SPEECH_MOCK);
    await startSession(page);

    const questions = await readQuestions(page);
    const idx = questions.findIndex((q) => q.type === "vocab_meaning");
    if (idx < 0) test.skip(true, "no vocab_meaning question in this session");

    await advanceTo(page, questions, idx);
    await answerOnly(page, questions[idx].correct);

    await expect(page.getByRole("button", { name: /play pronunciation/i })).toBeVisible({ timeout: 3_000 });
  });

  test("vocab_meaning: auto-play fires on mount", async ({ page }) => {
    await page.addInitScript(SPEECH_MOCK);
    await startSession(page);

    const questions = await readQuestions(page);
    const idx = questions.findIndex((q) => q.type === "vocab_meaning");
    if (idx < 0) test.skip(true, "no vocab_meaning question in this session");

    await advanceTo(page, questions, idx);

    // Wait until the last TTS call matches the target question's reading.
    // The useEffect fires after the component renders, so this handles the race
    // between advanceTo returning and the effect running.
    const expectedReading = questions[idx].reading;
    await page.waitForFunction(
      (reading) => {
        const calls = (window as unknown as { _ttsSpyCalls?: string[] })._ttsSpyCalls ?? [];
        return calls[calls.length - 1] === reading;
      },
      expectedReading,
      { timeout: 5_000 }
    );
  });

  test("vocab_meaning: button click fires TTS after answering", async ({ page }) => {
    await page.addInitScript(SPEECH_MOCK);
    await startSession(page);

    const questions = await readQuestions(page);
    const idx = questions.findIndex((q) => q.type === "vocab_meaning");
    if (idx < 0) test.skip(true, "no vocab_meaning question in this session");

    await advanceTo(page, questions, idx);
    await answerOnly(page, questions[idx].correct);

    await expect(page.getByRole("button", { name: /play pronunciation/i })).toBeVisible({ timeout: 3_000 });
    await clearTtsCalls(page);
    await page.getByRole("button", { name: /play pronunciation/i }).click();

    const calls = await getTtsCalls(page);
    expect(calls).toContain(questions[idx].reading);
  });

  // ---------------------------------------------------------------------------
  // reading_match
  // ---------------------------------------------------------------------------

  test("reading_match: speaker button NOT visible before answering", async ({ page }) => {
    await page.addInitScript(SPEECH_MOCK);
    await startSession(page);

    const questions = await readQuestions(page);
    const idx = questions.findIndex((q) => q.type === "reading_match");
    if (idx < 0) test.skip(true, "no reading_match question in this session");

    await advanceTo(page, questions, idx);

    await expect(page.getByRole("button", { name: /play pronunciation/i })).not.toBeVisible();
  });

  test("reading_match: speaker button visible after answering", async ({ page }) => {
    await page.addInitScript(SPEECH_MOCK);
    await startSession(page);

    const questions = await readQuestions(page);
    const idx = questions.findIndex((q) => q.type === "reading_match");
    if (idx < 0) test.skip(true, "no reading_match question in this session");

    await advanceTo(page, questions, idx);
    await answerOnly(page, questions[idx].correct);

    await expect(page.getByRole("button", { name: /play pronunciation/i })).toBeVisible({ timeout: 3_000 });
  });

  test("reading_match: auto-play does NOT fire on mount", async ({ page }) => {
    await page.addInitScript(SPEECH_MOCK);
    await startSession(page);

    const questions = await readQuestions(page);
    const idx = questions.findIndex((q) => q.type === "reading_match");
    if (idx < 0) test.skip(true, "no reading_match question in this session");

    await advanceTo(page, questions, idx);
    // Reset spy after advancing (previous questions may have triggered TTS)
    await clearTtsCalls(page);
    // Give the useEffect time to fire if it were going to
    await page.waitForTimeout(600);

    const calls = await getTtsCalls(page);
    expect(calls).toHaveLength(0);
  });

  test("reading_match: button click fires TTS after answering", async ({ page }) => {
    await page.addInitScript(SPEECH_MOCK);
    await startSession(page);

    const questions = await readQuestions(page);
    const idx = questions.findIndex((q) => q.type === "reading_match");
    if (idx < 0) test.skip(true, "no reading_match question in this session");

    await advanceTo(page, questions, idx);
    await answerOnly(page, questions[idx].correct);

    await expect(page.getByRole("button", { name: /play pronunciation/i })).toBeVisible({ timeout: 3_000 });
    await clearTtsCalls(page);
    await page.getByRole("button", { name: /play pronunciation/i }).click();

    const calls = await getTtsCalls(page);
    expect(calls.length).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // meaning_vocab / fill_lyric — regression (unchanged behaviour)
  // ---------------------------------------------------------------------------

  test("meaning_vocab: Hear answer hidden before answering, visible + TTS fires after", async ({ page }) => {
    await page.addInitScript(SPEECH_MOCK);
    await startSession(page);

    const questions = await readQuestions(page);
    const idx = questions.findIndex((q) => q.type === "meaning_vocab" || q.type === "fill_lyric");
    if (idx < 0) test.skip(true, "no meaning_vocab/fill_lyric question in this session");

    await advanceTo(page, questions, idx);

    await expect(page.getByRole("button", { name: /hear answer/i })).not.toBeVisible();

    await clearTtsCalls(page);
    await answerOnly(page, questions[idx].correct);

    await expect(page.getByRole("button", { name: /hear answer/i })).toBeVisible({ timeout: 3_000 });

    await page.waitForFunction(
      () => ((window as unknown as { _ttsSpyCalls?: string[] })._ttsSpyCalls?.length ?? 0) > 0,
      { timeout: 3_000 }
    );

    await clearTtsCalls(page);
    await page.getByRole("button", { name: /hear answer/i }).click();
    const calls = await getTtsCalls(page);
    expect(calls.length).toBeGreaterThan(0);
  });
});
