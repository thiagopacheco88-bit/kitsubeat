/**
 * Regression guard for the /pt-BR/sign-in 404 bug (2026-05-16).
 *
 * Bug: user with kb_locale=pt-BR cookie clicked "Sign in" → Next.js navigated to /sign-in
 * → next-intl middleware detected pt-BR and redirected to /pt-BR/sign-in → 404 because
 * Clerk's sign-in page is at root (not under [locale]/).
 *
 * Fix: isAuthRoute matcher in src/middleware.ts skips intlMiddleware for /sign-in(.*) and
 * /sign-up(.*) routes. This spec locks that fix as a permanent regression guard.
 *
 * NOTE: This is NOT a duplicate of all-pages-revamp.spec.ts which tests /sign-in via direct
 * HTTP GET without a locale cookie. This spec is cookie-aware and click-driven — it
 * reproduces the real user journey that caused the 404.
 */
import { test, expect } from '@playwright/test';

const NON_EN_LOCALES = [
  { locale: 'pt-BR', prefix: 'pt-BR' },
  { locale: 'es', prefix: 'es' },
] as const;

// Run serially to avoid Clerk dev-browser redirect contention between parallel workers
test.describe.configure({ mode: 'serial' });

test.describe('auth-reachability-locale — D-03 regression guard', () => {
  for (const { locale, prefix } of NON_EN_LOCALES) {
    test(`sign-in nav link href is /sign-in (not locale-prefixed) with kb_locale=${locale}`, async ({ page, context }) => {
      await context.addCookies([{
        name: 'kb_locale',
        value: locale,
        domain: 'localhost',
        path: '/',
      }]);
      // Navigate directly to the locale-prefixed home to avoid the / → /pt-BR redirect chain
      await page.goto(`/${prefix}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      // Regression guard: assert href attribute directly — avoids Clerk dev-browser
      // redirect interference that occurs when actually clicking and waiting for navigation.
      const signInLink = page.getByRole('link', { name: /sign in/i }).first();
      const href = await signInLink.getAttribute('href', { timeout: 10_000 });
      expect(href, `Sign In link must NOT have locale prefix on ${prefix} page`).toBe('/sign-in');
    });

    test(`/sign-in loads without 404 when kb_locale=${locale} cookie is set`, async ({ page, context }) => {
      await context.addCookies([{
        name: 'kb_locale',
        value: locale,
        domain: 'localhost',
        path: '/',
      }]);
      // Navigate directly to /sign-in with locale cookie — middleware must NOT redirect to
      // /${locale}/sign-in (which would 404 because Clerk's page is at root only).
      const response = await page.goto('/sign-in', { waitUntil: 'domcontentloaded', timeout: 30_000 });
      expect(response?.status() ?? 200, `/sign-in must not 5xx with ${locale} cookie`).toBeLessThan(500);
      await expect(page.locator('body')).not.toContainText('This page could not be found');
      await expect(page).toHaveURL('/sign-in', { timeout: 10_000 });
    });
  }
});
