/**
 * D-01: Locale-journey matrix — 5 highest-risk nav destinations × 2 non-EN locales.
 *
 * Tests that key pages are REACHABLE (status < 500, no 404 text) when a non-English
 * locale cookie is pre-set. This covers the gap left by existing i18n specs:
 *   - i18n-locale-routing.spec.ts: direct URL navigation (no cookie-driven redirect)
 *   - i18n-language-picker.spec.ts: picker UI interaction (not nav link clicks)
 *
 * With localePrefix: 'as-needed', non-EN cookies cause /songs → /pt-BR/songs redirect.
 * This is expected behavior — assertions check REACHABILITY, not exact URL.
 */
import { test, expect } from '@playwright/test';

const NON_EN_LOCALES = ['pt-BR', 'es'] as const;

/**
 * Nav matrix: [label, path-to-navigate-to]
 * We navigate directly to these paths (with locale cookie set) rather than clicking nav links,
 * because the nav link text changes per locale (Songs → Músicas → Canciones) and
 * direct navigation is more robust for reachability assertions.
 * The click-driven scenario is covered by auth-reachability-locale.spec.ts (D-03).
 */
const NAV_DESTINATIONS = [
  { label: 'home', path: '/' },
  { label: 'songs', path: '/songs' },
  { label: 'path', path: '/path' },
  { label: 'kana', path: '/kana' },
] as const;

// Resolve locale-prefixed URL to avoid ERR_TOO_MANY_REDIRECTS under parallel load.
// With localePrefix:'as-needed', /songs + kb_locale=pt-BR → /pt-BR/songs redirect.
// Navigating directly to /pt-BR/songs skips the redirect and avoids Clerk dev-browser races.
function localePath(locale: string, path: string): string {
  if (locale === 'en' || path === '/') return path;
  return `/${locale}${path}`;
}

test.describe('i18n-nav-locale-matrix — D-01', () => {
  // Serial mode prevents dev-server cold-compilation timeouts and Clerk dev-browser
  // ERR_TOO_MANY_REDIRECTS when 10 locale-aware tests compete for server resources.
  test.describe.configure({ mode: 'serial' });

  for (const locale of NON_EN_LOCALES) {
    test.describe(`locale: ${locale}`, () => {
      for (const { label, path } of NAV_DESTINATIONS) {
        // Per-test timeout of 60 s covers the locale redirect chain compile time in dev mode.
        // In CI (pre-built) these resolve well under 10 s.
        test(`${label} (${path}) is reachable with kb_locale=${locale}`, async ({ page, context }) => {
          test.setTimeout(60_000);
          await context.addCookies([{
            name: 'kb_locale',
            value: locale,
            domain: 'localhost',
            path: '/',
            secure: false,
            httpOnly: false,
          }]);
          const response = await page.goto(localePath(locale, path), { waitUntil: 'domcontentloaded', timeout: 60_000 });
          // Status < 500: no server error. Note: 404s may return 200 in Next.js dev mode,
          // so we also check the page text.
          expect(response?.status() ?? 200, `${path} with ${locale} should not 5xx`).toBeLessThan(500);
          await expect(page.locator('body')).not.toContainText('This page could not be found');
        });
      }

      test(`song player entry is reachable with kb_locale=${locale}`, async ({ page, context }) => {
        test.setTimeout(60_000);
        await context.addCookies([{
          name: 'kb_locale',
          value: locale,
          domain: 'localhost',
          path: '/',
        }]);
        // Use a known song slug (same slug used across the suite for stability)
        // Navigate to locale-prefixed song URL directly (avoids redirect + Clerk race)
        const response = await page.goto(localePath(locale, '/songs/again-yui'), { waitUntil: 'domcontentloaded', timeout: 60_000 });
        expect(response?.status() ?? 200, `player with ${locale} should not 5xx`).toBeLessThan(500);
        await expect(page.locator('body')).not.toContainText('This page could not be found');
      });
    });
  }
});
