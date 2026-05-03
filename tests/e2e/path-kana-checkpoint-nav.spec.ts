/**
 * Phase 14.1 AC #9 — KanaCheckpointNode navigation.
 *
 * Verifies:
 *   1. At least 2 kana checkpoints render on /path (hiragana + katakana).
 *   2. Each checkpoint links to /kana?script={hiragana|katakana}.
 *   3. Clicking the hiragana checkpoint navigates to /kana?script=hiragana.
 *
 * Per SPEC-REQ-6: kana checkpoints are first-class path nodes. The hiragana
 * checkpoint has data-testid="kana-checkpoint-hiragana" and the katakana
 * checkpoint has data-testid="kana-checkpoint-katakana".
 *
 * Both checkpoints always render regardless of mastery state (CONTEXT D-03).
 * After hydration, the displayed state (mastered / in-progress / locked) is
 * driven by localStorage kana progress.
 */
import { test, expect } from "../support/fixtures";

test.describe("/path kana checkpoints — >=2, link to /kana", () => {
  test("renders >=2 kana checkpoints, each links to /kana?script=...", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/path");
    await page.waitForLoadState("networkidle");

    // Both checkpoints must be present
    const hiragana = page.locator('[data-testid="kana-checkpoint-hiragana"]');
    const katakana = page.locator('[data-testid="kana-checkpoint-katakana"]');

    await expect(hiragana).toBeVisible({ timeout: 5000 });
    await expect(katakana).toBeVisible({ timeout: 5000 });

    const total = await page
      .locator(
        '[data-testid="kana-checkpoint-hiragana"], [data-testid="kana-checkpoint-katakana"]',
      )
      .count();
    expect(total).toBeGreaterThanOrEqual(2);

    // Verify hrefs
    const hiraganaHref = await hiragana.getAttribute("href");
    expect(hiraganaHref).toBe("/kana?script=hiragana");

    const katakanaHref = await katakana.getAttribute("href");
    expect(katakanaHref).toBe("/kana?script=katakana");
  });

  test("clicking the hiragana checkpoint navigates to /kana?script=hiragana", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/path");
    await page.waitForLoadState("networkidle");

    const hiragana = page.locator('[data-testid="kana-checkpoint-hiragana"]');
    await expect(hiragana).toBeVisible({ timeout: 5000 });

    await hiragana.click();
    await page.waitForURL(/\/kana\?script=hiragana/);
    expect(page.url()).toContain("script=hiragana");
  });

  test("clicking the katakana checkpoint navigates to /kana?script=katakana", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/path");
    await page.waitForLoadState("networkidle");

    const katakana = page.locator('[data-testid="kana-checkpoint-katakana"]');
    await expect(katakana).toBeVisible({ timeout: 5000 });

    await katakana.click();
    await page.waitForURL(/\/kana\?script=katakana/);
    expect(page.url()).toContain("script=katakana");
  });
});
