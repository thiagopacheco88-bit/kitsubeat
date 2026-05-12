/**
 * tests/e2e/journal-article.spec.ts — Journal article page smoke + rendering tests.
 *
 * Covers the magikarp-gyarados-legend article specifically because it introduced
 * custom MDX component overrides (table, img) that previously caused a 500 error
 * when the server hadn't hot-reloaded after changes to page.tsx.
 *
 * Assertions:
 *   - Page loads without a 500 error
 *   - Article H2 headings render (content structure intact)
 *   - Vocab table renders as a proper HTML <table>, NOT raw markdown pipes
 *   - Article body contains <img> elements (image component override working)
 *   - FAQ section is visible
 *   - New cross-franchise sections (Shenron, Momonosuke, Shinryu) are present
 *
 * No DB fixtures needed — journal is static MDX content.
 */

import { test, expect } from "../support/fixtures";

const SLUG = "magikarp-gyarados-legend";
const URL = `/journal/${SLUG}`;

// MDX route needs a first-hit compilation by the dev server; allow 90s for that.
test.describe.configure({ timeout: 90_000 });

test.describe("Journal article — magikarp-gyarados-legend", () => {
  // Warm up the route before the parallel tests run so only one compilation happens.
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 80_000 });
    await page.close();
  });

  test("loads without 500 error, shows heading, and hero image is visible", async ({ page }) => {
    const response = await page.goto(URL);
    expect(response?.status()).not.toBe(500);
    expect(response?.status()).toBe(200);

    await expect(
      page.getByRole("heading", { level: 1 })
    ).toContainText("Magikarp", { timeout: 10_000 });

    // Hero cover image must load successfully
    const hero = page.locator(".relative img").first();
    await expect(hero).toBeVisible();
    const heroLoaded = await hero.evaluate(
      (el: HTMLImageElement) => el.complete && el.naturalWidth > 0
    );
    expect(heroLoaded, "Hero cover image failed to load").toBe(true);
  });

  test("vocab table renders as HTML table, not raw markdown pipes", async ({ page }) => {
    await page.goto(URL);

    // The table must be present as a real <table> element
    const table = page.locator("article table").first();
    await expect(table).toBeVisible({ timeout: 10_000 });

    // Must have at least one <td> with content — not raw pipe characters
    const firstCell = table.locator("td").first();
    await expect(firstCell).toBeVisible();
    await expect(firstCell).not.toContainText("|");

    // Raw markdown artifact check — if table failed to render, the page would
    // contain the separator row "---|---" as visible text
    const bodyText = await page.locator("article").innerText();
    expect(bodyText).not.toMatch(/\|[-]+\|/);
  });

  test("article body images are visible and load successfully", async ({ page }) => {
    await page.goto(URL);
    await page.locator("article").waitFor({ timeout: 10_000 });

    const images = page.locator("article img");
    const count = await images.count();
    expect(count).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);

      // Must have non-empty alt text
      const alt = await img.getAttribute("alt");
      expect(alt).toBeTruthy();

      // Must be visible in the viewport / layout
      await expect(img).toBeVisible();

      // Must have loaded successfully — naturalWidth > 0 means the browser decoded the image
      const loaded = await img.evaluate(
        (el: HTMLImageElement) => el.complete && el.naturalWidth > 0
      );
      expect(loaded, `Image ${i} failed to load (src: ${await img.getAttribute("src")})`).toBe(true);
    }
  });

  test("FAQ section renders with expected questions", async ({ page }) => {
    await page.goto(URL);

    const articleText = await page.locator("article").innerText({ timeout: 10_000 });
    expect(articleText).toContain("Is the legend of a koi becoming a dragon a real myth?");
    expect(articleText).toContain("Did the legend involve demons raising the waterfall?");
    expect(articleText).toContain("Is Magikarp");
  });

  test("cross-franchise sections render — Shenron, Momonosuke, Shinryu", async ({ page }) => {
    await page.goto(URL);
    await page.locator("article").waitFor({ timeout: 10_000 });

    const articleText = await page.locator("article").innerText();
    expect(articleText).toContain("Shenron");
    expect(articleText).toContain("Momonosuke");
    expect(articleText).toContain("Shinry");
    expect(articleText).toContain("Final Fantasy");
    expect(articleText).toContain("One Piece");
    expect(articleText).toContain("Dragon Ball");
  });

  test("JSON-LD structured data is present in page head", async ({ page }) => {
    await page.goto(URL);

    // Article schema
    const articleLd = await page.locator('script[type="application/ld+json"]').first().innerText();
    const articleData = JSON.parse(articleLd);
    expect(articleData["@type"]).toBe("Article");
    expect(articleData.headline).toContain("Magikarp");

    // FAQPage schema — second ld+json block
    const allLdBlocks = page.locator('script[type="application/ld+json"]');
    const count = await allLdBlocks.count();
    expect(count).toBeGreaterThanOrEqual(2);

    const faqLd = await allLdBlocks.nth(1).innerText();
    const faqData = JSON.parse(faqLd);
    expect(faqData["@type"]).toBe("FAQPage");
    expect(faqData.mainEntity.length).toBeGreaterThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------
// Famous kanji anime games article
// ---------------------------------------------------------------------------

const KANJI_SLUG = "famous-kanji-anime-games";
const KANJI_URL = `/journal/${KANJI_SLUG}`;

test.describe("Journal article — famous-kanji-anime-games", () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(KANJI_URL, { waitUntil: "domcontentloaded", timeout: 80_000 });
    await page.close();
  });

  test("loads without 500 error, shows heading, and hero image is visible", async ({ page }) => {
    const response = await page.goto(KANJI_URL);
    expect(response?.status()).not.toBe(500);
    expect(response?.status()).toBe(200);

    await expect(
      page.getByRole("heading", { level: 1 })
    ).toContainText("Kanji", { timeout: 10_000 });

    const hero = page.locator(".relative img").first();
    await expect(hero).toBeVisible();
    const heroLoaded = await hero.evaluate(
      (el: HTMLImageElement) => el.complete && el.naturalWidth > 0
    );
    expect(heroLoaded, "Hero cover image failed to load").toBe(true);
  });

  test("vocab table renders as HTML table, not raw markdown pipes", async ({ page }) => {
    await page.goto(KANJI_URL);

    const table = page.locator("article table").first();
    await expect(table).toBeVisible({ timeout: 10_000 });

    const firstCell = table.locator("td").first();
    await expect(firstCell).toBeVisible();
    await expect(firstCell).not.toContainText("|");

    const bodyText = await page.locator("article").innerText();
    expect(bodyText).not.toMatch(/\|[-]+\|/);
  });

  test("article body images are visible and load successfully", async ({ page }) => {
    await page.goto(KANJI_URL);
    await page.locator("article").waitFor({ timeout: 10_000 });

    const images = page.locator("article img");
    const count = await images.count();
    expect(count).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute("alt");
      expect(alt).toBeTruthy();
      await expect(img).toBeVisible();
      const loaded = await img.evaluate(
        (el: HTMLImageElement) => el.complete && el.naturalWidth > 0
      );
      expect(loaded, `Image ${i} failed to load (src: ${await img.getAttribute("src")})`).toBe(true);
    }
  });

  test("FAQ section renders with expected questions", async ({ page }) => {
    await page.goto(KANJI_URL);

    const articleText = await page.locator("article").innerText({ timeout: 10_000 });
    expect(articleText).toContain("What does the tattoo on Gaara's forehead mean?");
    expect(articleText).toContain("What kanji is on Akuma's back in Street Fighter?");
    expect(articleText).toContain("What does 正義 mean in One Piece");
    expect(articleText).toContain("What kanji is on Goku's gi");
  });

  test("kanji sections render - Gaara, Akuma, Marines, Goku, Demon Slayer, Naruto", async ({ page }) => {
    await page.goto(KANJI_URL);
    await page.locator("article").waitFor({ timeout: 10_000 });

    const articleText = await page.locator("article").innerText();
    expect(articleText).toContain("Gaara");
    expect(articleText).toContain("Akuma");
    expect(articleText).toContain("Kimetsu");
    expect(articleText).toContain("Master Roshi");
    expect(articleText).toContain("Kamehameha");
    expect(articleText).toContain("Satsui no Hado");
    expect(articleText).toContain("Zettaiteki Seigi");
    expect(articleText).toContain("One Piece");
  });

  test("JSON-LD structured data is present in page head", async ({ page }) => {
    await page.goto(KANJI_URL);

    const allLdBlocks = page.locator('script[type="application/ld+json"]');
    const blockCount = await allLdBlocks.count();
    expect(blockCount).toBeGreaterThanOrEqual(4); // Organization + WebSite + BlogPosting + FAQPage

    // Find BlogPosting and FAQPage blocks by type (layout injects Organization + WebSite first)
    let articleData: Record<string, unknown> | null = null;
    let faqData: Record<string, unknown> | null = null;
    for (let i = 0; i < blockCount; i++) {
      const text = await allLdBlocks.nth(i).innerText();
      const parsed = JSON.parse(text) as Record<string, unknown>;
      if (parsed["@type"] === "BlogPosting") articleData = parsed;
      if (parsed["@type"] === "FAQPage") faqData = parsed;
    }

    expect(articleData).not.toBeNull();
    expect((articleData as Record<string, unknown>).headline).toContain("Kanji");
    expect(faqData).not.toBeNull();
    expect((faqData as { mainEntity: unknown[] }).mainEntity.length).toBeGreaterThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------
// One Piece admirals real actors article
// ---------------------------------------------------------------------------

const ADMIRALS_SLUG = "one-piece-admirals-real-actors";
const ADMIRALS_URL = `/journal/${ADMIRALS_SLUG}`;

test.describe("Journal article — one-piece-admirals-real-actors", () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(ADMIRALS_URL, { waitUntil: "domcontentloaded", timeout: 80_000 });
    await page.close();
  });

  test("loads without 500 error, shows heading, and hero image is visible", async ({ page }) => {
    const response = await page.goto(ADMIRALS_URL);
    expect(response?.status()).not.toBe(500);
    expect(response?.status()).toBe(200);

    await expect(
      page.getByRole("heading", { level: 1 })
    ).toContainText("Admiral", { timeout: 10_000 });

    const hero = page.locator(".relative img").first();
    await expect(hero).toBeVisible();
    const heroLoaded = await hero.evaluate(
      (el: HTMLImageElement) => el.complete && el.naturalWidth > 0
    );
    expect(heroLoaded, "Hero cover image failed to load").toBe(true);
  });

  test("vocab table renders as HTML table, not raw markdown pipes", async ({ page }) => {
    await page.goto(ADMIRALS_URL);

    const table = page.locator("article table").first();
    await expect(table).toBeVisible({ timeout: 10_000 });

    const firstCell = table.locator("td").first();
    await expect(firstCell).toBeVisible();
    await expect(firstCell).not.toContainText("|");

    const bodyText = await page.locator("article").innerText();
    expect(bodyText).not.toMatch(/\|[-]+\|/);
  });

  test("article body images are visible and load successfully", async ({ page }) => {
    await page.goto(ADMIRALS_URL);
    await page.locator("article").waitFor({ timeout: 10_000 });

    const images = page.locator("article img");
    const count = await images.count();
    expect(count).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute("alt");
      expect(alt).toBeTruthy();
      await expect(img).toBeVisible();
      const loaded = await img.evaluate(
        (el: HTMLImageElement) => el.complete && el.naturalWidth > 0
      );
      expect(loaded, `Image ${i} failed to load (src: ${await img.getAttribute("src")})`).toBe(true);
    }
  });

  test("FAQ section renders with expected questions", async ({ page }) => {
    await page.goto(ADMIRALS_URL);

    const articleText = await page.locator("article").innerText({ timeout: 10_000 });
    expect(articleText).toContain("Are One Piece's admirals based on real actors?");
    expect(articleText).toContain("Who is Akainu based on in real life?");
    expect(articleText).toContain("What does Seigi mean in One Piece");
  });

  test("admiral sections render - Akainu, Aokiji, Kizaru, actors, yakuza", async ({ page }) => {
    await page.goto(ADMIRALS_URL);
    await page.locator("article").waitFor({ timeout: 10_000 });

    const articleText = await page.locator("article").innerText();
    expect(articleText).toContain("Akainu");
    expect(articleText).toContain("Aokiji");
    expect(articleText).toContain("Kizaru");
    expect(articleText).toContain("Bunta Sugawara");
    expect(articleText).toContain("Yusaku Matsuda");
    expect(articleText).toContain("Kunie Tanaka");
    expect(articleText).toContain("Jingi naki tatakai");
    expect(articleText).toContain("Battles Without Honor");
  });

  test("JSON-LD structured data is present in page head", async ({ page }) => {
    await page.goto(ADMIRALS_URL);

    const allLdBlocks = page.locator('script[type="application/ld+json"]');
    const blockCount = await allLdBlocks.count();
    expect(blockCount).toBeGreaterThanOrEqual(2);

    let faqData: Record<string, unknown> | null = null;
    for (let i = 0; i < blockCount; i++) {
      const text = await allLdBlocks.nth(i).innerText();
      const parsed = JSON.parse(text) as Record<string, unknown>;
      if (parsed["@type"] === "FAQPage") faqData = parsed;
    }

    expect(faqData).not.toBeNull();
    expect((faqData as { mainEntity: unknown[] }).mainEntity.length).toBeGreaterThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------
// Uchiha jutsu Shinto mythology article
// ---------------------------------------------------------------------------

const UCHIHA_SLUG = "uchiha-jutsu-shinto-mythology";
const UCHIHA_URL = `/journal/${UCHIHA_SLUG}`;

test.describe("Journal article — uchiha-jutsu-shinto-mythology", () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(UCHIHA_URL, { waitUntil: "domcontentloaded", timeout: 80_000 });
    await page.close();
  });

  test("loads without 500 error, shows heading, and hero image is visible", async ({ page }) => {
    const response = await page.goto(UCHIHA_URL);
    expect(response?.status()).not.toBe(500);
    expect(response?.status()).toBe(200);

    await expect(
      page.getByRole("heading", { level: 1 })
    ).toContainText("Uchiha", { timeout: 10_000 });

    const hero = page.locator(".relative img").first();
    await expect(hero).toBeVisible();
    const heroLoaded = await hero.evaluate(
      (el: HTMLImageElement) => el.complete && el.naturalWidth > 0
    );
    expect(heroLoaded, "Hero cover image failed to load").toBe(true);
  });

  test("vocab table renders as HTML table, not raw markdown pipes", async ({ page }) => {
    await page.goto(UCHIHA_URL);

    const table = page.locator("article table").first();
    await expect(table).toBeVisible({ timeout: 10_000 });

    const firstCell = table.locator("td").first();
    await expect(firstCell).toBeVisible();
    await expect(firstCell).not.toContainText("|");

    const bodyText = await page.locator("article").innerText();
    expect(bodyText).not.toMatch(/\|[-]+\|/);
  });

  test("article body images are visible and load successfully", async ({ page }) => {
    await page.goto(UCHIHA_URL);
    await page.locator("article").waitFor({ timeout: 10_000 });

    const images = page.locator("article img");
    const count = await images.count();
    expect(count).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute("alt");
      expect(alt).toBeTruthy();
      await expect(img).toBeVisible();
      const loaded = await img.evaluate(
        (el: HTMLImageElement) => el.complete && el.naturalWidth > 0
      );
      expect(loaded, `Image ${i} failed to load (src: ${await img.getAttribute("src")})`).toBe(true);
    }
  });

  test("FAQ section renders with expected questions", async ({ page }) => {
    await page.goto(UCHIHA_URL);

    const articleText = await page.locator("article").innerText({ timeout: 10_000 });
    expect(articleText).toContain("Is Amaterasu from Naruto based on a real Japanese goddess?");
    expect(articleText).toContain("Did Susanoo exist before Naruto?");
    expect(articleText).toContain("What is the Kojiki");
  });

  test("mythology sections render - Amaterasu, Tsukuyomi, Susanoo, Izanagi, Kagutsuchi", async ({ page }) => {
    await page.goto(UCHIHA_URL);
    await page.locator("article").waitFor({ timeout: 10_000 });

    const articleText = await page.locator("article").innerText();
    expect(articleText).toContain("Amaterasu");
    expect(articleText).toContain("Tsukuyomi");
    expect(articleText).toContain("Susanoo");
    expect(articleText).toContain("Izanagi");
    expect(articleText).toContain("Kagutsuchi");
    expect(articleText).toContain("Kojiki");
    expect(articleText).toContain("Yamata no Orochi");
  });

  test("JSON-LD structured data is present in page head", async ({ page }) => {
    await page.goto(UCHIHA_URL);

    const articleLd = await page.locator('script[type="application/ld+json"]').first().innerText();
    const articleData = JSON.parse(articleLd);
    expect(articleData["@type"]).toBe("Article");
    expect(articleData.headline).toContain("Uchiha");

    const allLdBlocks = page.locator('script[type="application/ld+json"]');
    const count = await allLdBlocks.count();
    expect(count).toBeGreaterThanOrEqual(2);

    const faqLd = await allLdBlocks.nth(1).innerText();
    const faqData = JSON.parse(faqLd);
    expect(faqData["@type"]).toBe("FAQPage");
    expect(faqData.mainEntity.length).toBeGreaterThanOrEqual(5);
  });
});
