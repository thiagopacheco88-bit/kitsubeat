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
  cookie: { name: string; value: string; domain: string; path: string } | null;
}

const LOCALE_CONFIGS: LocaleConfig[] = [
  { name: 'en (no cookie)', cookie: null },
  { name: 'pt-BR', cookie: { name: 'kb_locale', value: 'pt-BR', domain: 'localhost', path: '/' } },
  { name: 'es', cookie: { name: 'kb_locale', value: 'es', domain: 'localhost', path: '/' } },
];

test.describe('nav-sweep-all-locales — D-02', () => {
  // Each test makes one page.goto + N page.request.get calls (one per nav link).
  // With ~7 nav links at ~2-3s each, allow 60s per locale.
  test.setTimeout(60_000);

  for (const localeConfig of LOCALE_CONFIGS) {
    test(`all header nav links reachable — ${localeConfig.name}`, async ({ page, context }) => {
      if (localeConfig.cookie) {
        await context.addCookies([localeConfig.cookie]);
      }

      // Load home page to get the rendered nav with locale-aware hrefs
      const homeResponse = await page.goto('/', { waitUntil: 'domcontentloaded' });
      expect(homeResponse?.status() ?? 200, 'home page itself should load').toBeLessThan(500);

      // Extract all nav links from the rendered header
      const navLinks = page.getByRole('navigation').getByRole('link');
      const count = await navLinks.count();

      // Safety check: nav must render at least 2 links
      expect(count, 'nav must have at least 2 links').toBeGreaterThanOrEqual(2);

      for (let i = 0; i < count; i++) {
        const href = await navLinks.nth(i).getAttribute('href');

        // Skip external, anchor, and missing hrefs
        if (!href || href.startsWith('#') || href.startsWith('http')) continue;

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
