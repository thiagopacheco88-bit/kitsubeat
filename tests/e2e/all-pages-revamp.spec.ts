import { expect, test } from "../support/fixtures";

test.use({ viewport: { width: 390, height: 844 } });

const staticRoutes = [
  "/",
  "/songs",
  "/anime-list",
  "/songs/again-yui",
  "/path",
  "/kana",
  "/kana/session",
  "/kana/session/summary",
  "/vocabulary",
  "/review",
  "/profile",
  "/sign-in",
  "/sign-up",
  "/admin/lyrics",
  "/admin/timing",
  "/__dev/states",
] as const;

// Routes that have [locale] variants. Excludes admin, dev, auth (no locale prefix),
// and dynamic [slug] routes that require a known slug at test time.
const localizedRoutes = [
  "/",
  "/kana",
  "/kana/session",
  "/kana/session/summary",
  "/songs",
  "/vocabulary",
  "/path",
  "/review",
  "/profile",
  "/anime-list",
  "/journal",
] as const;

const nonDefaultLocales = ["pt-BR", "es"] as const;

test.describe("revamp all pages smoke", () => {
  for (const route of staticRoutes) {
    test(`${route} renders without page-level mobile overflow`, async ({
      page,
    }) => {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("load").catch(() => {});
      await page.waitForTimeout(500);

      expect(response?.status() ?? 200).toBeLessThan(500);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      expect(overflow).toBeLessThanOrEqual(route === "/songs/again-yui" ? 0 : 24);
    });
  }

});

test.describe("locale prefixed routes smoke", () => {
  for (const locale of nonDefaultLocales) {
    for (const route of localizedRoutes) {
      const fullRoute = `/${locale}${route === "/" ? "" : route}`;
      test(`${fullRoute} responds without error`, async ({ page }) => {
        const response = await page.goto(fullRoute, {
          waitUntil: "domcontentloaded",
        });
        await page.waitForLoadState("load").catch(() => {});
        // Must not be a 4xx or 5xx — redirects (3xx) are fine (auth-gated pages
        // redirect to sign-in, which Playwright follows and resolves to 200).
        expect(response?.status() ?? 200).toBeLessThan(400);
      });
    }
  }
});

test.describe("revamp all pages smoke — admin", () => {
  test("/admin/timing/[songId] renders when a timing row is available", async ({
    page,
  }) => {
    await page.goto("/admin/timing", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    const firstTimingLink = page.locator('a[href^="/admin/timing/"]').first();
    const href =
      (await firstTimingLink.count()) > 0
        ? await firstTimingLink.getAttribute("href", { timeout: 1000 })
        : null;
    test.skip(!href, "No admin timing rows available in the local data set.");

    const response = await page.goto(href!, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    expect(response?.status() ?? 200).toBeLessThan(500);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(24);
  });
});
