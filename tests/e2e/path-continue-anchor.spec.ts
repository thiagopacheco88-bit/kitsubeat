/**
 * Phase 14.1 AC #10 — ContinueAnchor: sticky CTA + navigation (W-6 enhanced).
 *
 * Verifies:
 *   1. The [data-testid="continue-anchor"] element is visible.
 *   2. Its wrapper has position: fixed and bottom: 0px (sticky behaviour).
 *   3. The anchor itself has min-height >= 56px.
 *   4. Tapping it navigates to /songs/{slug}.
 *   5. W-6: after navigation, the song page actually loads (no application
 *      error + at least one known DOM marker present after networkidle).
 *
 * ContinueAnchor renders only when the user has a current_path_node_slug
 * (non-null). If the dev server is seeded in the StarterPick branch (null
 * slug), this test will fail to find the anchor and the test will fail with
 * a clear message — that is the correct behaviour (StarterPick suppression
 * is verified in the second test block).
 *
 * Per SPEC-REQ-8 and CONTEXT D-18.
 */
import { test, expect } from "../support/fixtures";

test.describe("/path ContinueAnchor — sticky CTA + navigation", () => {
  test("position fixed, bottom 0, min-height >= 56, navigates to /songs/{slug} and song page actually loads (W-6)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/path");
    await page.waitForLoadState("networkidle");

    const cta = page.locator('[data-testid="continue-anchor"]');
    await expect(cta).toBeVisible({ timeout: 10_000 });

    // The CTA is a <Link> inside a fixed wrapper div.
    // Check the wrapper (parent) for position: fixed, bottom: 0.
    const wrapper = cta.locator("xpath=..");
    const wrapperPosition = await wrapper.evaluate((el) =>
      window.getComputedStyle(el).position,
    );
    expect(
      wrapperPosition,
      "ContinueAnchor wrapper should have position: fixed",
    ).toBe("fixed");

    const wrapperBottom = await wrapper.evaluate((el) =>
      window.getComputedStyle(el).bottom,
    );
    expect(
      wrapperBottom,
      "ContinueAnchor wrapper should have bottom: 0px",
    ).toBe("0px");

    // Min-height on the anchor itself
    const minHeight = await cta.evaluate((el) =>
      parseFloat(window.getComputedStyle(el).minHeight),
    );
    expect(
      minHeight,
      "ContinueAnchor min-height should be >= 56px",
    ).toBeGreaterThanOrEqual(56);

    // The CTA must contain visible "Continue" text
    const text = await cta.textContent();
    expect(text).toContain("Continue");

    // href must target /songs/{slug}
    const href = await cta.getAttribute("href");
    expect(href).toMatch(/^\/songs\//);

    // Tap navigates to the song page
    await cta.click();
    await page.waitForURL(/\/songs\/.+/);

    // W-6: confirm the song page actually loaded — no application error
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(page.locator("body")).not.toContainText(
      "This page could not be found",
    );

    // Sanity: the song page exposes a player container or song title
    // Check whichever DOM marker lands first; if neither appears within 5s,
    // the song page failed to render.
    const playerOrTitle = page
      .locator(
        '[data-testid="player-shell"], [data-testid="song-title"], main h1',
      )
      .first();
    await expect(playerOrTitle).toBeVisible({ timeout: 5000 });
  });

  test("ContinueAnchor is suppressed when current_path_node_slug is null (StarterPick branch)", async ({
    page,
  }) => {
    // This test requires the ability to put the user into the StarterPick
    // branch (null current_path_node_slug). Without TEST_DATABASE_URL, we
    // cannot reliably seed this state.
    test.skip(
      !process.env.HAS_TEST_DB,
      "Requires test DB to seed null current_path_node_slug",
    );

    // When seeded: the ContinueAnchor component returns null when
    // currentSongSlug is null (per ContinueAnchor.tsx visibility guard).
    await page.goto("/path");
    await page.waitForLoadState("networkidle");

    await expect(
      page.locator('[data-testid="continue-anchor"]'),
    ).toHaveCount(0);
  });
});
