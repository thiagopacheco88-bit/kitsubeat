import { test, expect } from '@playwright/test';

// I18N-03: Globe picker switches locale + cookie set
// These tests require the full app running with LanguagePicker wired (Wave 3+).
// Wave 0 stubs.

test.describe('i18n language picker', () => {
  test.skip('globe button is visible in the nav', async ({ page }) => {
    await page.goto('/');
    const globeBtn = page.getByRole('button', { name: 'Change language' });
    await expect(globeBtn).toBeVisible();
  });

  test.skip('clicking globe button opens language dropdown', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Change language' }).click();
    await expect(page.getByRole('option', { name: 'Português' })).toBeVisible();
  });

  test.skip('selecting Português navigates to /pt-BR/ and sets kb_locale cookie', async ({ page, context }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Change language' }).click();
    await page.getByRole('option', { name: 'Português' }).click();
    await page.waitForURL(/\/pt-BR\//);
    const cookies = await context.cookies();
    const localeCookie = cookies.find(c => c.name === 'kb_locale');
    expect(localeCookie?.value).toBe('pt-BR');
  });

  test.skip('Escape key closes the language dropdown', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Change language' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('option', { name: 'Português' })).not.toBeVisible();
  });
});
