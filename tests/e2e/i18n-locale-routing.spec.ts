import { test, expect } from '@playwright/test';

// I18N-01: PT-BR route renders PT-BR strings
// I18N-02: ES route renders ES strings
// I18N-07: html lang attribute set correctly per locale
// These tests require the app running with next-intl wired (Wave 2+).

test.describe('i18n locale routing', () => {
  test('PT-BR route renders PT-BR nav strings', async ({ page }) => {
    await page.goto('/pt-BR/songs');
    // Check html lang attribute
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('pt-BR');
    // Check that a PT-BR string appears (nav link "Músicas")
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Músicas' })).toBeVisible();
  });

  test('ES route renders ES nav strings', async ({ page }) => {
    await page.goto('/es/songs');
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('es');
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Canciones' })).toBeVisible();
  });

  test('EN root / renders EN nav strings (canonical, no prefix)', async ({ page }) => {
    await page.goto('/songs');
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('en');
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Songs' })).toBeVisible();
  });

  test('invalid locale segment returns 404', async ({ page }) => {
    const response = await page.goto('/fr/songs');
    expect(response?.status()).toBe(404);
  });
});
