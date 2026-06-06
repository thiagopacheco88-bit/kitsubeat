import { test, expect } from '@playwright/test';

// I18N-03: Globe picker switches locale + cookie set
// These tests require the full app running with LanguagePicker wired (Wave 3+).

test.describe('i18n language picker', () => {
  test('globe button is visible in the nav', async ({ page }) => {
    await page.goto('/songs');
    const globeBtn = page.getByRole('button', { name: 'Change language' });
    await expect(globeBtn).toBeVisible();
  });

  test('clicking globe button opens language dropdown', async ({ page }) => {
    await page.goto('/songs');
    await expect(page.getByRole('button', { name: 'Change language' })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Change language' }).click();
    await expect(page.getByRole('option', { name: 'Português' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Español' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'English' })).toBeVisible();
  });

  test('Escape key closes the language dropdown', async ({ page }) => {
    await page.goto('/songs');
    await expect(page.getByRole('button', { name: 'Change language' })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Change language' }).click();
    await expect(page.getByRole('option', { name: 'Português' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('option', { name: 'Português' })).not.toBeVisible();
  });

  test('selecting Português navigates to /pt-BR/ and sets kb_locale cookie', async ({ page, context }) => {
    await page.goto('/songs');
    await expect(page.getByRole('button', { name: 'Change language' })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Change language' }).click();
    await page.getByRole('option', { name: 'Português' }).click();
    await page.waitForURL(/\/pt-BR\//);
    // Wait for Clerk redirect chain + all cookie-setting responses to fully settle.
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/pt-BR/');
    // Verify kb_locale cookie. Read document.cookie directly (authoritative for what
    // JavaScript sees) and also cross-check via context.cookies() (CDP layer).
    const docCookieValue = await page.evaluate(() => {
      const m = document.cookie.match(/(?:^|;\s*)kb_locale=([^;]+)/);
      return m ? m[1] : null;
    });
    // The page renders in PT-BR (visible in nav), so the locale IS working.
    // Accept either source of truth — URL prefix drives rendering, cookie is secondary.
    const ctxCookies = await context.cookies();
    const localeCookie = ctxCookies.find(c => c.name === 'kb_locale');
    expect(localeCookie).toBeDefined();
    // Cookie should be pt-BR (set by switchLocale before navigation).
    // docCookie is what JavaScript sees; ctxCookie is what Playwright's CDP sees.
    const effectiveValue = docCookieValue ?? localeCookie?.value;
    expect(effectiveValue).toBe('pt-BR');
  });
});
