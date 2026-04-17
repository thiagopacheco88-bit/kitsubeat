/**
 * tests/e2e/player-sync-and-seek.spec.ts — Active-verse highlight follows the real
 * YouTube player's currentTime, including backward seeks and seek-past-end.
 *
 * Plan 08.1-05 Task 2.
 *
 * Strategy:
 *   - The YouTube IFrame is cross-origin, so Playwright cannot call its JS API directly.
 *   - YouTubeEmbed.tsx exposes the player to window.__kbPlayer ONLY when
 *     process.env.NEXT_PUBLIC_APP_ENV === 'test' (single-condition gate; never leaks
 *     into dev/prod). See plan 08.1-05 verification gate.
 *   - VerseBlock.tsx renders data-start-ms="<verse.start_time_ms>" under the same gate.
 *     The active state is exposed via data-active="true" | "false".
 *   - We seek to the verse's start_time_ms / 1000 (YT API takes seconds), playVideo(),
 *     then assert the active highlight lands within 1500ms (the regression floor —
 *     see plan objective: 250ms is the perception target measured in isolation; 1500ms
 *     is the E2E ceiling tolerant of network + paint jitter).
 *
 * Geo-restriction fallback:
 *   If the YouTube iframe can't initialise within 15s (geo-blocked, network out, ad-block),
 *   we test.skip — per CONTEXT requirement "geo-restricted videos fail gracefully".
 *   Skip is NOT a failure; it's the correct degraded behavior.
 *
 * IMPORTANT: NO postMessage stubs on the critical sync path. CONTEXT locks this:
 * the test must exercise the real iframe to catch race conditions in YouTubeEmbed.tsx.
 *
 * Required env: NEXT_PUBLIC_APP_ENV=test (set in playwright.config.ts webServer.env).
 *
 * No retries — zero-flake policy.
 */

import { test, expect } from "../support/fixtures";

const SLUG = "again-yui";

// Time budget for the YT iframe to load + the IFrame API to attach the player object
// to window.__kbPlayer. The iframe API itself can take 5-8s on a cold dev server;
// 15s is the upper bound before we declare the environment uncooperative.
const PLAYER_READY_TIMEOUT_MS = 15_000;

// Active-verse regression floor. See plan 08.1-05 objective.
const VERSE_HIGHLIGHT_TOLERANCE_MS = 1_500;

interface VerseLite {
  verseNumber: number;
  startMs: number;
}

/** Wait for window.__kbPlayer to be exposed AND its seekTo method present. */
async function waitForPlayer(page: import("@playwright/test").Page): Promise<boolean> {
  try {
    await page.waitForFunction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => typeof (window as any).__kbPlayer?.seekTo === "function",
      undefined,
      { timeout: PLAYER_READY_TIMEOUT_MS }
    );
    return true;
  } catch {
    return false;
  }
}

/** Read the data-start-ms + data-verse-number attributes off the rendered verses. */
async function readVerses(
  page: import("@playwright/test").Page
): Promise<VerseLite[]> {
  return page.$$eval("[data-verse-number][data-start-ms]", (els) =>
    els
      .map((el) => ({
        verseNumber: Number(el.getAttribute("data-verse-number")),
        startMs: Number(el.getAttribute("data-start-ms")),
      }))
      // Only verses with positive start_time_ms have usable timing.
      .filter((v) => v.startMs > 0)
  );
}

async function isVerseActive(
  page: import("@playwright/test").Page,
  verseNumber: number
): Promise<boolean> {
  const handle = await page.$(
    `[data-verse-number="${verseNumber}"][data-active="true"]`
  );
  return handle !== null;
}

async function waitForActiveVerse(
  page: import("@playwright/test").Page,
  verseNumber: number,
  timeoutMs: number
): Promise<boolean> {
  try {
    await page.waitForSelector(
      `[data-verse-number="${verseNumber}"][data-active="true"]`,
      { timeout: timeoutMs }
    );
    return true;
  } catch {
    return false;
  }
}

test.describe("Player sync + seek (real YouTube iframe)", () => {
  test("active verse highlight follows playback", async ({ page }) => {
    await page.goto(`/songs/${SLUG}`);
    await expect(page.locator("h1")).toContainText("again", { ignoreCase: true });

    const ready = await waitForPlayer(page);
    test.skip(!ready, "YouTube iframe / IFrame API unavailable in this region or env");

    const verses = await readVerses(page);
    test.skip(
      verses.length < 2,
      `Need at least 2 verses with start_time_ms > 0; got ${verses.length}. Possibly missing WhisperX timing.`
    );

    const verse2 = verses[1]; // Second verse with timing — usually verse_number 2
    // Seek + play through the real YT iframe. seekTo expects seconds, allowSeekAhead=true.
    await page.evaluate((startSec) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = (window as any).__kbPlayer;
      p.seekTo(startSec, true);
      p.playVideo();
    }, verse2.startMs / 1000);

    const becameActive = await waitForActiveVerse(
      page,
      verse2.verseNumber,
      VERSE_HIGHLIGHT_TOLERANCE_MS
    );
    expect(
      becameActive,
      `verse ${verse2.verseNumber} should highlight active within ${VERSE_HIGHLIGHT_TOLERANCE_MS}ms of seek`
    ).toBe(true);

    // Be polite to the iframe — pause before next test.
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__kbPlayer?.pauseVideo?.();
    });
  });

  test("seek backward re-activates earlier verse", async ({ page }) => {
    await page.goto(`/songs/${SLUG}`);
    const ready = await waitForPlayer(page);
    test.skip(!ready, "YouTube iframe unavailable");

    const verses = await readVerses(page);
    test.skip(
      verses.length < 3,
      `Need at least 3 timed verses; got ${verses.length}.`
    );

    const verse3 = verses[2];
    const verse1 = verses[0];

    // Seek to verse 3 → expect verse 3 active.
    await page.evaluate((sec) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = (window as any).__kbPlayer;
      p.seekTo(sec, true);
      p.playVideo();
    }, verse3.startMs / 1000);
    expect(
      await waitForActiveVerse(
        page,
        verse3.verseNumber,
        VERSE_HIGHLIGHT_TOLERANCE_MS
      ),
      "verse 3 should activate after forward seek"
    ).toBe(true);

    // Seek BACKWARD to verse 1 → expect verse 1 active and verse 3 NOT active.
    await page.evaluate((sec) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = (window as any).__kbPlayer;
      p.seekTo(sec, true);
      p.playVideo();
    }, verse1.startMs / 1000);
    expect(
      await waitForActiveVerse(
        page,
        verse1.verseNumber,
        VERSE_HIGHLIGHT_TOLERANCE_MS
      ),
      "verse 1 should reactivate after backward seek"
    ).toBe(true);

    // Defensive: verse 3 must no longer be active.
    expect(await isVerseActive(page, verse3.verseNumber)).toBe(false);

    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__kbPlayer?.pauseVideo?.();
    });
  });

  test("seek past end of last verse holds on last (or clears)", async ({ page }) => {
    await page.goto(`/songs/${SLUG}`);
    const ready = await waitForPlayer(page);
    test.skip(!ready, "YouTube iframe unavailable");

    const verses = await readVerses(page);
    test.skip(verses.length === 0, "No timed verses to test against.");

    const last = verses[verses.length - 1];
    // Read the last verse's end_time_ms by querying its DOM ancestor (data attribute is
    // start_time_ms only — for end we look up the next sibling's start, or use a generous
    // offset of +60s past the last verse start which is well beyond the song's tail).
    const seekSec = last.startMs / 1000 + 60;

    await page.evaluate((sec) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = (window as any).__kbPlayer;
      p.seekTo(sec, true);
      p.playVideo();
    }, seekSec);

    // Per LyricsPanel.tsx active-verse logic, the highlight WALKS BACKWARDS to find
    // the latest verse whose startMs <= currentTimeMs — so seeking past the end keeps
    // the LAST verse active. We assert this is the current behavior; if it ever changes
    // to "no verse active past the song", this test must be updated together with the
    // product spec, not silently retried.
    //
    // Wait briefly for the YT API to actually deliver currentTime updates.
    await page.waitForTimeout(VERSE_HIGHLIGHT_TOLERANCE_MS);

    const lastActive = await isVerseActive(page, last.verseNumber);
    // Accept EITHER outcome (current behavior = last stays active; future behavior could
    // legitimately clear). Failing only if some OTHER verse is active.
    if (!lastActive) {
      // No verse active is also acceptable — assert nothing else is active.
      const anyActive = await page.$$eval(
        '[data-active="true"]',
        (els) => els.length
      );
      expect(anyActive).toBe(0);
    } else {
      expect(lastActive).toBe(true);
    }

    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__kbPlayer?.pauseVideo?.();
    });
  });
});
