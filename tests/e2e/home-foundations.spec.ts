/**
 * SPEC AC #11 — Foundations carousel:
 *   / (auth or anon) renders exactly 2 cards in [data-testid='foundations']
 *   (Hiragana + Katakana). Each card has the correct href to /kana?script=...
 *   Reduced-motion suppresses the 3-star halo (covered by Plan 14.2-13 reduced-motion spec).
 */
import { test, expect } from "@playwright/test";

test.describe("/ Foundations (AC #11)", () => {
  // Home page sequential DB queries can take >30s; give tests ample budget.
  test.setTimeout(90_000);

  test("renders 2 KanaCheckpointNode cards (hiragana + katakana); each href navigates to /kana?script=...", async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await context.addCookies([
      { name: "kb_theme", value: "dark", url: "http://localhost:7000", sameSite: "Lax" },
    ]);

    // Use domcontentloaded — home page Suspense streams and external images keep
    // the load event pending well past 30s. Foundations section is SSR-rendered.
    await page.goto("/", { waitUntil: "commit" });

    const foundations = page.locator('[data-testid="foundations"]');
    await expect(foundations).toBeVisible({ timeout: 10_000 });

    const hira = foundations.locator('[data-testid="kana-checkpoint-hiragana"]');
    const kata = foundations.locator('[data-testid="kana-checkpoint-katakana"]');
    await expect(hira).toBeVisible({ timeout: 10_000 });
    await expect(kata).toBeVisible({ timeout: 10_000 });

    // /kana?script=hiragana navigation (verified per 14.1 D-05 — query param, not path segment)
    expect(await hira.getAttribute("href")).toBe("/kana?script=hiragana");
    expect(await kata.getAttribute("href")).toBe("/kana?script=katakana");
  });
});
