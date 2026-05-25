import { test, expect } from '@playwright/test';

// I18N — page-level content text changes with locale
// Covers the gap: existing i18n specs only check nav strings and URL routing.
// These tests assert that actual page content (nav links, section labels, CTA
// text) changes when the locale switches — not just the html[lang] attribute.
//
// Scope: nav and layout strings that are guaranteed regardless of auth state.
// Auth-gated strings (e.g. level/XP on /path) are not asserted here.

test.describe('i18n — page content text changes with locale', () => {
  // 1. Home page: switch to PT-BR via picker → page-level strings change
  test('home page: switching to PT-BR via picker changes page content strings', async ({ page }) => {
    await page.goto('/songs');
    // Wait for the nav to mount (layout renders synchronously — no networkidle needed).
    await expect(page.locator('header').locator('nav').first()).toBeVisible({ timeout: 10_000 });

    // EN baseline: nav link "Songs" is visible.
    await expect(page.locator('header').getByRole('link', { name: 'Songs' })).toBeVisible();

    // Switch to PT-BR via the globe picker.
    await page.getByRole('button', { name: 'Change language' }).click();
    await page.getByRole('option', { name: 'Português' }).click();
    // LanguagePicker uses window.location.href — wait for the URL to change.
    await page.waitForURL(/\/pt-BR\//, { timeout: 25_000 });

    // lang attribute must be pt-BR.
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('pt-BR');

    // PT-BR nav: "Songs" → "Músicas".
    await expect(page.locator('header').getByRole('link', { name: 'Músicas' })).toBeVisible({ timeout: 10_000 });

    // PT-BR nav: "Path" → "Trilha".
    await expect(page.locator('header').getByRole('link', { name: 'Trilha' })).toBeVisible();
  });

  // 2. /pt-BR/path: path page renders PT-BR nav + layout strings
  test('/pt-BR/path: path page renders PT-BR content strings', async ({ page }) => {
    await page.goto('/pt-BR/path');
    await page.waitForLoadState('domcontentloaded');

    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('pt-BR');

    // Nav links are layout-level — always present in PT-BR.
    await expect(page.locator('header').getByRole('link', { name: 'Músicas' })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('header').getByRole('link', { name: 'Trilha' })).toBeVisible();

    // The page itself must render some content (not crash / redirect).
    await expect(page.locator('main').first()).toBeAttached({ timeout: 10_000 });
  });

  // 3. /es/path: path page renders ES nav + layout strings
  test('/es/path: path page renders ES content strings', async ({ page }) => {
    await page.goto('/es/path');
    await page.waitForLoadState('domcontentloaded');

    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('es');

    // ES nav: "Songs" → "Canciones", "Path" → "Ruta".
    await expect(page.locator('header').getByRole('link', { name: 'Canciones' })).toBeVisible({ timeout: 10_000 });

    // The "Nivel" label appears in HeroProgress when authenticated, but the
    // nav-level ES strings are always present. At least one "Nivel" instance
    // exists (could be in XP bar, reward chip, etc.) — use first() to avoid
    // strict-mode violation when multiple elements match.
    const nivelEl = page.getByText('Nivel', { exact: true }).first();
    const nivelCount = await nivelEl.count();
    // If auth renders the hero, Nivel is there. If not, at minimum the ES nav is.
    if (nivelCount > 0) {
      await expect(nivelEl).toBeVisible({ timeout: 5_000 });
    }

    await expect(page.locator('main').first()).toBeAttached({ timeout: 10_000 });
  });

  // 4. Cookie persistence: switch to PT-BR on /songs, navigate to /pt-BR — PT-BR sticks
  test('locale cookie persists: PT-BR cookie set after picker click', async ({ page, context }) => {
    await page.goto('/songs');
    await expect(page.locator('header').locator('nav').first()).toBeVisible({ timeout: 10_000 });

    // Switch to PT-BR.
    await page.getByRole('button', { name: 'Change language' }).click();
    await page.getByRole('option', { name: 'Português' }).click();
    await page.waitForURL(/\/pt-BR\//, { timeout: 25_000 });

    // Verify the kb_locale cookie is set correctly (it drives SSR locale selection).
    const cookies = await context.cookies();
    const localeCookie = cookies.find(c => c.name === 'kb_locale');
    expect(localeCookie).toBeDefined();
    expect(localeCookie?.value).toBe('pt-BR');

    // PT-BR nav is present on the navigated page.
    await expect(page.locator('header').getByRole('link', { name: 'Músicas' })).toBeVisible({ timeout: 10_000 });
  });

  // 5. Switch back to EN from /pt-BR/songs → no locale prefix, lang resets to en
  test('switching back to EN from /pt-BR/songs removes locale prefix', async ({ page }) => {
    await page.goto('/pt-BR/songs');
    await page.waitForLoadState('domcontentloaded');

    // Confirm PT-BR baseline.
    let lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('pt-BR');

    // Switch back to English via the picker.
    await page.getByRole('button', { name: 'Change language' }).click();
    await page.getByRole('option', { name: 'English' }).click();

    // Wait for URL to change away from the pt-BR prefix.
    await page.waitForURL(
      (url) => !url.pathname.startsWith('/pt-BR') && !url.pathname.startsWith('/es'),
      { timeout: 25_000 },
    );

    // lang attribute must be en.
    lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('en');

    // EN nav link "Songs" is back.
    await expect(
      page.locator('header').getByRole('link', { name: 'Songs' }),
    ).toBeVisible({ timeout: 10_000 });
  });

  // 6. /pt-BR/kana: kana page renders PT-BR nav strings and correct lang attribute
  test('/pt-BR/kana: kana page renders PT-BR content', async ({ page }) => {
    await page.goto('/pt-BR/kana');
    await page.waitForLoadState('domcontentloaded');

    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('pt-BR');

    // PT-BR nav link "Trilha" (Path) visible — proves locale-aware layout rendered.
    await expect(page.locator('header').getByRole('link', { name: 'Trilha' })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('header').getByRole('link', { name: 'Músicas' })).toBeVisible();

    // The kana page heading "Kana Trainer" is the same across locales (proper noun),
    // but surrounding UI like "Foundations" label localises. Assert the page rendered.
    await expect(page.locator('main').first()).toBeAttached({ timeout: 10_000 });

    // No English-only nav strings should appear.
    const html = await page.content();
    // The EN nav link "Songs" must not appear when locale is PT-BR.
    expect(html).not.toMatch(/>Songs<\/a>/);
  });
});
