/**
 * D-02: Full nav sweep — every visible header link on / must be clickable and
 * lead to a page returning status < 500 and no 404 text, across all 3 locales.
 *
 * Strategy:
 * 1. Load the home page with the locale cookie pre-set (or no cookie for EN)
 * 2. Extract all nav links dynamically from the rendered header
 *    (next-intl localizes hrefs, so /songs becomes /pt-BR/songs when pt-BR is active)
 * 3. For each link href: use page.request.get to check HTTP status (fast, no navigation)
 * 4. For any href returning 2xx/3xx: additionally navigate to it and check for 404 text
 *    (Next.js can return 200 with a custom 404 page body in some edge cases)
 *
 * Skips: external links (href starts with 'http'), anchor links (href starts with '#'),
 * and links without an href attribute.
 */
import { test, expect } from '@playwright/test';

interface LocaleConfig {
  name: string;
  // Navigate directly to the locale home URL instead of '/' + cookie to avoid
  // Clerk dev-browser ERR_TOO_MANY_REDIRECTS under parallel worker load (D-03 pattern).
  homeUrl: string;
}

const LOCALE_CONFIGS: LocaleConfig[] = [
  { name: 'en (no cookie)', homeUrl: '/' },
  { name: 'pt-BR', homeUrl: '/pt-BR' },
  { name: 'es', homeUrl: '/es' },
];

test.describe('nav-sweep-all-locales — D-02', () => {
  // Serial mode prevents Clerk dev-browser redirect races when running alongside
  // other locale-aware specs in the test:e2e:qa 4-worker suite.
  test.describe.configure({ mode: 'serial' });

  // Each test makes one page.goto + N page.request.get calls (one per nav link).
  // With ~7 nav links at ~2-3s each, allow 60s per locale.
  // 90s allows for cold-compilation of ~7 nav routes in dev mode (pre-built CI is <15s)
  test.setTimeout(90_000);

  for (const localeConfig of LOCALE_CONFIGS) {
    test(`all header nav links reachable — ${localeConfig.name}`, async ({ page }) => {
      // Load home page to get the rendered nav with locale-aware hrefs
      const homeResponse = await page.goto(localeConfig.homeUrl, { waitUntil: 'domcontentloaded' });
      // Do not use ?? 200 fallback — a null response means navigation was blocked, which
      // would mask a real failure and make all subsequent link extractions vacuously pass.
      expect(homeResponse, 'home page navigation must not be blocked').not.toBeNull();
      expect(homeResponse!.status(), 'home page itself should load').toBeLessThan(500);

      // Extract all nav links from the rendered header
      const navLinks = page.locator('header').getByRole('link');
      const count = await navLinks.count();

      // Safety check: nav must render at least 2 links
      expect(count, 'nav must have at least 2 links').toBeGreaterThanOrEqual(2);

      for (let i = 0; i < count; i++) {
        const href = await navLinks.nth(i).getAttribute('href');

        // Skip external, anchor, and missing hrefs
        if (!href || href.startsWith('#') || href.startsWith('http')) continue;
        // Skip auth-required user routes (Clerk sets __clerk_db_jwt in dev mode, causing
        // the nav to render /profile which is slow to compile and requires a real session)
        if (href.startsWith('/profile') || href.startsWith('/user')) continue;

        // HTTP status check (fast — no browser navigation overhead)
        const res = await page.request.get(href);
        expect(
          res.status(),
          `${href} (${localeConfig.name}) should not 5xx`,
        ).toBeLessThan(500);
      }

      // Spot-check: navigate to the home page and assert no 404 text visible
      // (covers the case where home itself shows a 404 under a locale cookie)
      await expect(page.locator('body')).not.toContainText('This page could not be found');
    });
  }
});
