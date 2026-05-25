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
    expect(page.url()).toContain('/pt-BR/');
    // Verify kb_locale cookie is set
    const cookies = await context.cookies();
    const localeCookie = cookies.find(c => c.name === 'kb_locale');
    expect(localeCookie).toBeDefined();
    expect(localeCookie?.value).toBe('pt-BR');
  });
});
