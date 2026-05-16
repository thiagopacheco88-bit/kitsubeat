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
    test(`sign-in nav link reaches /sign-in with kb_locale=${locale} cookie`, async ({ page, context }) => {
      await context.addCookies([{
        name: 'kb_locale',
        value: locale,
        domain: 'localhost',
        path: '/',
      }]);
      // Navigate directly to the locale-prefixed home to avoid the / → /pt-BR redirect chain
      // that can cause ERR_TOO_MANY_REDIRECTS in parallel workers under Clerk dev mode.
      await page.goto(`/${prefix}`);
      await page.getByRole('link', { name: /sign in/i }).first().click();
      // Regression guard: must NOT redirect to /pt-BR/sign-in or /es/sign-in
      await expect(page).toHaveURL('/sign-in', { timeout: 10_000 });
      await expect(page.locator('body')).not.toContainText('This page could not be found');
    });

    test(`sign-up nav link reaches /sign-up with kb_locale=${locale} cookie`, async ({ page, context }) => {
      await context.addCookies([{
        name: 'kb_locale',
        value: locale,
        domain: 'localhost',
        path: '/',
      }]);
      // Navigate to sign-in page first — the sign-up link lives there in Clerk's UI
      await page.goto('/sign-in');
      // Look for sign-up link (Clerk renders it as "Don't have an account? Sign up")
      const signUpLink = page.getByRole('link', { name: /sign up/i }).first();
      await signUpLink.click();
      await expect(page).toHaveURL('/sign-up', { timeout: 10_000 });
      await expect(page.locator('body')).not.toContainText('This page could not be found');
    });
  }
});
