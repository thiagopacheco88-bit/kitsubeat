import { test, expect } from '@playwright/test';

// I18N-01: PT-BR route renders PT-BR strings
// I18N-02: ES route renders ES strings
// I18N-07: hreflang headers present on locale pages
// These tests require the app running with next-intl wired (Wave 2+).
// Wave 0 stubs — implement after Wave 2 is complete.

test.describe('i18n locale routing', () => {
  test.skip('PT-BR route renders PT-BR nav strings', async ({ page }) => {
    await page.goto('/pt-BR/songs');
    await expect(page.getByRole('link', { name: 'Músicas' })).toBeVisible();
  });

  test.skip('ES route renders ES nav strings', async ({ page }) => {
    await page.goto('/es/songs');
    await expect(page.getByRole('link', { name: 'Canciones' })).toBeVisible();
  });

  test.skip('EN root / renders EN nav strings (canonical, no prefix)', async ({ page }) => {
    await page.goto('/songs');
    await expect(page.getByRole('link', { name: 'Songs' })).toBeVisible();
  });

  test.skip('hreflang link headers present on PT-BR pages', async ({ page }) => {
    const response = await page.goto('/pt-BR/songs');
    const linkHeader = response?.headers()['link'] ?? '';
    expect(linkHeader).toContain('hreflang');
  });

  test.skip('html lang attribute set to pt-BR on PT-BR pages', async ({ page }) => {
    await page.goto('/pt-BR/songs');
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('pt-BR');
  });

  test.skip('html lang attribute set to es on ES pages', async ({ page }) => {
    await page.goto('/es/songs');
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('es');
  });
});
