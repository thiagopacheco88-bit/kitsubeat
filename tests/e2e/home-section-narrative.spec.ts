/**
 * SPEC AC #13 — 5-section narrative:
 *   Rendered / contains exactly 5 sections in DOM order, identified by
 *   data-testid: hero-featured, continue-learning, foundations, browse-by-anime,
 *   featured-songs. Page contains zero references to 'Beginner-Friendly',
 *   'Recently Added', or 'Top Artists'.
 *
 * Per revision: authenticated spec uses authenticatedTest (Plan 14.2-01b bypass)
 * so that continue-learning renders (if seeded). Section order is asserted on
 * the 4 always-present sections; continue-learning, when present, must be
 * between hero-featured and foundations.
 */
import { authenticatedTest as test, expect } from "../support/auth-fixtures";

test.describe("/ section narrative (AC #13)", () => {
  test("5 sections in correct DOM order; legacy carousel labels absent (auth)", async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await context.addCookies([
      { name: "kb_theme", value: "dark", url: "http://localhost:7000", sameSite: "Lax" },
    ]);

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Assert all expected testids present in correct ORDER via querySelectorAll iteration
    const order = await page.evaluate(() => {
      const ids = [
        "hero-featured",
        "continue-learning",
        "foundations",
        "browse-by-anime",
        "featured-songs",
      ];
      const allElements = Array.from(document.querySelectorAll("*"));
      const found: { id: string; index: number }[] = [];
      for (const id of ids) {
        const el = document.querySelector(`[data-testid="${id}"]`);
        if (el) {
          found.push({ id, index: allElements.indexOf(el) });
        }
      }
      return found;
    });

    // The 4 always-present sections must be in DOM
    const idsFound = order.map((o) => o.id);
    expect(idsFound).toContain("hero-featured");
    expect(idsFound).toContain("foundations");
    expect(idsFound).toContain("browse-by-anime");
    expect(idsFound).toContain("featured-songs");

    // DOM-order assertion: indices must be ascending in the spec order
    const indices = order.map((o) => o.index);
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThan(indices[i - 1]!);
    }

    // Legacy carousel labels MUST NOT appear (SPEC §Req 6)
    const html = await page.content();
    expect(html).not.toMatch(/Beginner-Friendly/);
    expect(html).not.toMatch(/Recently Added/);
    expect(html).not.toMatch(/Top Artists/);
  });
});
