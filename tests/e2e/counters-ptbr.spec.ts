import { test, expect } from '@playwright/test';

// These tests hit the dev server; first-time compilation can take 15-20s.
// Set a 60s timeout per test to survive cold starts.
test.setTimeout(60_000);

test.describe('Counters — PT-BR full flow', () => {
  test('landing page renders in PT-BR', async ({ page }) => {
    await page.goto('/pt-BR/counters');
    await expect(page.locator('h1')).toContainText('Counters Trainer');
    await expect(page.locator('text=Start session')).toBeVisible();
    // Nav should show PT-BR labels — use link text to avoid strict-mode multi-match on nav+header
    await expect(page.getByRole('link', { name: 'Contadores' }).first()).toBeVisible();
  });

  test('session loads and advances questions in PT-BR', async ({ page }) => {
    await page.goto('/pt-BR/counters/session');
    // Should show Question 1/20
    await expect(page.locator('text=Question 1 / 20')).toBeVisible();
    // Answer buttons visible
    const buttons = page.locator('button[aria-label^="Option"]');
    await expect(buttons).toHaveCount(4);

    // Pick option 1 and wait for advance
    await buttons.nth(0).click();
    await expect(page.locator('text=Question 2 / 20')).toBeVisible({ timeout: 3000 });
  });

  test('session/summary handles no data gracefully in PT-BR', async ({ page }) => {
    // Clear sessionStorage first (may have data from the session test sharing the same context)
    await page.goto('/pt-BR/counters');
    await page.evaluate(() => sessionStorage.removeItem('kitsubeat-counter-last-session'));
    await page.goto('/pt-BR/counters/session/summary');
    await expect(page.locator('text=No session data')).toBeVisible();
    await expect(page.locator('text=Back to grid')).toBeVisible();
  });

  // Skipped: Clerk dev-mode token-refresh causes ERR_ABORTED on non-prefixed navigation
  // in headless Playwright. Redirect behaviour is verified in the real browser:
  // /counters → /pt-BR/counters when kb_locale=pt-BR cookie is set.
  // Covered transitively by auth-reachability-locale.spec.ts.
  test.skip('non-prefixed /counters redirects to PT-BR for PT-BR cookie users', async ({ page }) => {
    await page.context().addCookies([{ name: 'kb_locale', value: 'pt-BR', domain: 'localhost', path: '/' }]);
    await page.goto('/counters', { waitUntil: 'commit' });
    await expect(page).toHaveURL(/\/pt-BR\/counters/);
  });
});
