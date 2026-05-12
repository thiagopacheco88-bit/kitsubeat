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
// Guren no Yumiya Japanese lesson article
// ---------------------------------------------------------------------------

const GUREN_SLUG = "guren-no-yumiya-japanese-lesson";
const GUREN_URL = `/journal/${GUREN_SLUG}`;

test.describe("Journal article — guren-no-yumiya-japanese-lesson", () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(GUREN_URL, { waitUntil: "domcontentloaded", timeout: 80_000 });
    await page.close();
  });

  test("loads without 500 error, shows heading, and hero image is visible", async ({ page }) => {
    const response = await page.goto(GUREN_URL);
    expect(response?.status()).not.toBe(500);
    expect(response?.status()).toBe(200);

    await expect(
      page.getByRole("heading", { level: 1 })
    ).toContainText("Guren", { timeout: 10_000 });

    const hero = page.locator(".relative img").first();
    await expect(hero).toBeVisible();
    const heroLoaded = await hero.evaluate(
      (el: HTMLImageElement) => el.complete && el.naturalWidth > 0
    );
    expect(heroLoaded, "Hero cover image failed to load").toBe(true);
  });

  test("vocab table renders as HTML table, not raw markdown pipes", async ({ page }) => {
    await page.goto(GUREN_URL);

    const table = page.locator("article table").first();
    await expect(table).toBeVisible({ timeout: 10_000 });

    const firstCell = table.locator("td").first();
    await expect(firstCell).toBeVisible();
    await expect(firstCell).not.toContainText("|");

    const bodyText = await page.locator("article").innerText();
    expect(bodyText).not.toMatch(/\|[-]+\|/);
  });

  test("article body images are visible and load successfully", async ({ page }) => {
    await page.goto(GUREN_URL);
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
    await page.goto(GUREN_URL);

    const articleText = await page.locator("article").innerText({ timeout: 10_000 });
    expect(articleText).toContain("What does Guren no Yumiya mean in Japanese?");
    expect(articleText).toContain("What does Wir sind der Jager mean");
    expect(articleText).toContain("Who sings Guren no Yumiya?");
  });

  test("content sections render - Linked Horizon, Eren, grammar patterns, vocab", async ({ page }) => {
    await page.goto(GUREN_URL);
    await page.locator("article").waitFor({ timeout: 10_000 });

    const articleText = await page.locator("article").innerText();
    expect(articleText).toContain("Linked Horizon");
    expect(articleText).toContain("Revo");
    expect(articleText).toContain("Eren");
    expect(articleText).toContain("koushi");
    expect(articleText).toContain("Wir sind der Jager");
    expect(articleText).toContain("furigana");
    expect(articleText).toContain("Attack on Titan");
  });

  test("JSON-LD structured data is present in page head", async ({ page }) => {
    await page.goto(GUREN_URL);

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
// English words in katakana article
// ---------------------------------------------------------------------------

const KATAKANA_SLUG = "english-words-in-katakana";
const KATAKANA_URL = `/journal/${KATAKANA_SLUG}`;

test.describe("Journal article — english-words-in-katakana", () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(KATAKANA_URL, { waitUntil: "domcontentloaded", timeout: 80_000 });
    await page.close();
  });

  test("loads without 500 error, shows heading, and hero image is visible", async ({ page }) => {
    const response = await page.goto(KATAKANA_URL);
    expect(response?.status()).not.toBe(500);
    expect(response?.status()).toBe(200);

    await expect(
      page.getByRole("heading", { level: 1 })
    ).toContainText("Japanese Words", { timeout: 10_000 });

    const hero = page.locator(".relative img").first();
    await expect(hero).toBeVisible();
    const heroLoaded = await hero.evaluate(
      (el: HTMLImageElement) => el.complete && el.naturalWidth > 0
    );
    expect(heroLoaded, "Hero cover image failed to load").toBe(true);
  });

  test("loanword table renders as HTML table, not raw markdown pipes", async ({ page }) => {
    await page.goto(KATAKANA_URL);

    const table = page.locator("article table").first();
    await expect(table).toBeVisible({ timeout: 10_000 });

    const firstCell = table.locator("td").first();
    await expect(firstCell).toBeVisible();
    await expect(firstCell).not.toContainText("|");

    const bodyText = await page.locator("article").innerText();
    expect(bodyText).not.toMatch(/\|[-]+\|/);
  });

  test("article body images are visible and load successfully", async ({ page }) => {
    await page.goto(KATAKANA_URL);
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
    await page.goto(KATAKANA_URL);

    const articleText = await page.locator("article").innerText({ timeout: 10_000 });
    expect(articleText).toContain("What is katakana used for in Japanese?");
    expect(articleText).toContain("Is katakana hard to learn?");
    expect(articleText).toContain("What is gairaigo in Japanese?");
  });

  test("katakana content renders - loanwords, gairaigo, key words", async ({ page }) => {
    await page.goto(KATAKANA_URL);
    await page.locator("article").waitFor({ timeout: 10_000 });

    const articleText = await page.locator("article").innerText();
    expect(articleText).toContain("katakana");
    expect(articleText).toContain("gairaigo");
    expect(articleText).toContain("miruku");
    expect(articleText).toContain("koohii");
    expect(articleText).toContain("geemu");
    expect(articleText).toContain("hiragana");
    expect(articleText).toContain("terebi");
  });

  test("JSON-LD structured data is present in page head", async ({ page }) => {
    await page.goto(KATAKANA_URL);

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
// Meiji Restoration samurai Rurouni Kenshin article
// ---------------------------------------------------------------------------

const MEIJI_SLUG = "meiji-restoration-samurai-rurouni-kenshin";
const MEIJI_URL = `/journal/${MEIJI_SLUG}`;

test.describe("Journal article — meiji-restoration-samurai-rurouni-kenshin", () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(MEIJI_URL, { waitUntil: "domcontentloaded", timeout: 80_000 });
    await page.close();
  });

  test("loads without 500 error, shows heading, and hero image is visible", async ({ page }) => {
    const response = await page.goto(MEIJI_URL);
    expect(response?.status()).not.toBe(500);
    expect(response?.status()).toBe(200);

    await expect(
      page.getByRole("heading", { level: 1 })
    ).toContainText("Rurouni Kenshin", { timeout: 10_000 });

    const hero = page.locator(".relative img").first();
    await expect(hero).toBeVisible();
    const heroLoaded = await hero.evaluate(
      (el: HTMLImageElement) => el.complete && el.naturalWidth > 0
    );
    expect(heroLoaded, "Hero cover image failed to load").toBe(true);
  });

  test("vocab table renders as HTML table, not raw markdown pipes", async ({ page }) => {
    await page.goto(MEIJI_URL);

    const table = page.locator("article table").first();
    await expect(table).toBeVisible({ timeout: 10_000 });

    const firstCell = table.locator("td").first();
    await expect(firstCell).toBeVisible();
    await expect(firstCell).not.toContainText("|");

    const bodyText = await page.locator("article").innerText();
    expect(bodyText).not.toMatch(/\|[-]+\|/);
  });

  test("article body images are visible and load successfully", async ({ page }) => {
    await page.goto(MEIJI_URL);
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
    await page.goto(MEIJI_URL);

    const articleText = await page.locator("article").innerText({ timeout: 10_000 });
    expect(articleText).toContain("When is Rurouni Kenshin set historically?");
    expect(articleText).toContain("What happened to samurai after the Meiji Restoration?");
    expect(articleText).toContain("Was Saito Hajime from Rurouni Kenshin a real person?");
  });

  test("content sections render - Kenshin, Saigo, Shishio, Satsuma, Shinsengumi", async ({ page }) => {
    await page.goto(MEIJI_URL);
    await page.locator("article").waitFor({ timeout: 10_000 });

    const articleText = await page.locator("article").innerText();
    expect(articleText).toContain("Kenshin");
    expect(articleText).toContain("Saigo Takamori");
    expect(articleText).toContain("Shishio");
    expect(articleText).toContain("Satsuma Rebellion");
    expect(articleText).toContain("Shinsengumi");
    expect(articleText).toContain("Saito Hajime");
    expect(articleText).toContain("hitokiri");
    expect(articleText).toContain("rurouni");
  });

  test("JSON-LD structured data is present in page head", async ({ page }) => {
    await page.goto(MEIJI_URL);

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

// ---------------------------------------------------------------------------
// Bushido samurai philosophy article
// ---------------------------------------------------------------------------

const BUSHIDO_SLUG = "bushido-samurai-philosophy-code";
const BUSHIDO_URL = `/journal/${BUSHIDO_SLUG}`;

test.describe("Journal article — bushido-samurai-philosophy-code", () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(BUSHIDO_URL, { waitUntil: "domcontentloaded", timeout: 80_000 });
    await page.close();
  });

  test("loads without 500 error, shows heading, and hero image is visible", async ({ page }) => {
    const response = await page.goto(BUSHIDO_URL);
    expect(response?.status()).not.toBe(500);
    expect(response?.status()).toBe(200);

    await expect(
      page.getByRole("heading", { level: 1 })
    ).toContainText("Bushido", { timeout: 10_000 });

    const hero = page.locator(".relative img").first();
    await expect(hero).toBeVisible();
    const heroLoaded = await hero.evaluate(
      (el: HTMLImageElement) => el.complete && el.naturalWidth > 0
    );
    expect(heroLoaded, "Hero cover image failed to load").toBe(true);
  });

  test("vocab table renders as HTML table, not raw markdown pipes", async ({ page }) => {
    await page.goto(BUSHIDO_URL);

    const table = page.locator("article table").first();
    await expect(table).toBeVisible({ timeout: 10_000 });

    const firstCell = table.locator("td").first();
    await expect(firstCell).toBeVisible();
    await expect(firstCell).not.toContainText("|");

    const bodyText = await page.locator("article").innerText();
    expect(bodyText).not.toMatch(/\|[-]+\|/);
  });

  test("article body images are visible and load successfully", async ({ page }) => {
    await page.goto(BUSHIDO_URL);
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
    await page.goto(BUSHIDO_URL);

    const articleText = await page.locator("article").innerText({ timeout: 10_000 });
    expect(articleText).toContain("What is Bushido?");
    expect(articleText).toContain("What are the seven virtues of Bushido?");
    expect(articleText).toContain("What does the Hagakure say about Bushido?");
    expect(articleText).toContain("Is Tanjiro from Demon Slayer following Bushido?");
    expect(articleText).toContain("Does Zoro from One Piece follow Bushido?");
  });

  test("content sections render - virtues, Hagakure, Musashi, anime connections", async ({ page }) => {
    await page.goto(BUSHIDO_URL);
    await page.locator("article").waitFor({ timeout: 10_000 });

    const articleText = await page.locator("article").innerText();
    expect(articleText).toContain("Hagakure");
    expect(articleText).toContain("Yamamoto Tsunetomo");
    expect(articleText).toContain("Miyamoto Musashi");
    expect(articleText).toContain("Demon Slayer");
    expect(articleText).toContain("Tanjiro");
    expect(articleText).toContain("Zoro");
    expect(articleText).toContain("Byakuya");
    expect(articleText).toContain("Ghost of Tsushima");
    expect(articleText).toContain("Bushido");
  });

  test("JSON-LD structured data is present in page head", async ({ page }) => {
    await page.goto(BUSHIDO_URL);

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
// Japanese days of the week anime mnemonics article
// ---------------------------------------------------------------------------

const WEEKDAYS_SLUG = "japanese-days-of-week-anime-mnemonics";
const WEEKDAYS_URL = `/journal/${WEEKDAYS_SLUG}`;

test.describe("Journal article — japanese-days-of-week-anime-mnemonics", () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(WEEKDAYS_URL, { waitUntil: "domcontentloaded", timeout: 80_000 });
    await page.close();
  });

  test("loads without 500 error, shows heading, and hero image is visible", async ({ page }) => {
    const response = await page.goto(WEEKDAYS_URL);
    expect(response?.status()).not.toBe(500);
    expect(response?.status()).toBe(200);

    await expect(
      page.getByRole("heading", { level: 1 })
    ).toContainText("Japanese Day", { timeout: 10_000 });

    const hero = page.locator(".relative img").first();
    await expect(hero).toBeVisible();
    const heroLoaded = await hero.evaluate(
      (el: HTMLImageElement) => el.complete && el.naturalWidth > 0
    );
    expect(heroLoaded, "Hero cover image failed to load").toBe(true);
  });

  test("vocab tables render as HTML tables, not raw markdown pipes", async ({ page }) => {
    await page.goto(WEEKDAYS_URL);

    const table = page.locator("article table").first();
    await expect(table).toBeVisible({ timeout: 10_000 });

    const firstCell = table.locator("td").first();
    await expect(firstCell).toBeVisible();
    await expect(firstCell).not.toContainText("|");

    const bodyText = await page.locator("article").innerText();
    expect(bodyText).not.toMatch(/\|[-]+\|/);
  });

  test("article body images are visible and load successfully", async ({ page }) => {
    await page.goto(WEEKDAYS_URL);
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
    await page.goto(WEEKDAYS_URL);

    const articleText = await page.locator("article").innerText({ timeout: 10_000 });
    expect(articleText).toContain("What are the days of the week in Japanese?");
    expect(articleText).toContain("Is Suicune's name related to the Japanese word for water?");
    expect(articleText).toContain("Does Light Yagami's name mean moon in Japanese?");
    expect(articleText).toContain("Does the Mokuton Wood Release in Naruto use the same kanji as Thursday?");
  });

  test("content sections render - all 7 days and their anime mnemonics", async ({ page }) => {
    await page.goto(WEEKDAYS_URL);
    await page.locator("article").waitFor({ timeout: 10_000 });

    const articleText = await page.locator("article").innerText();
    expect(articleText).toContain("Amaterasu");
    expect(articleText).toContain("Light Yagami");
    expect(articleText).toContain("Tsukuyomi");
    expect(articleText).toContain("Suicune");
    expect(articleText).toContain("Mokuton");
    expect(articleText).toContain("Edward Elric");
    expect(articleText).toContain("Gaara");
    expect(articleText).toContain("Nichiyobi");
    expect(articleText).toContain("Suiyobi");
    expect(articleText).toContain("Mokuyobi");
  });

  test("JSON-LD structured data is present in page head", async ({ page }) => {
    await page.goto(WEEKDAYS_URL);

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
// Oden One Piece real history article
// ---------------------------------------------------------------------------

const ODEN_SLUG = "oden-one-piece-real-history";
const ODEN_URL = `/journal/${ODEN_SLUG}`;

test.describe("Journal article — oden-one-piece-real-history", () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(ODEN_URL, { waitUntil: "domcontentloaded", timeout: 80_000 });
    await page.close();
  });

  test("loads without 500 error, shows heading, and hero image is visible", async ({ page }) => {
    const response = await page.goto(ODEN_URL);
    expect(response?.status()).not.toBe(500);
    expect(response?.status()).toBe(200);

    await expect(
      page.getByRole("heading", { level: 1 })
    ).toContainText("Oden", { timeout: 10_000 });

    const hero = page.locator(".relative img").first();
    await expect(hero).toBeVisible();
    const heroLoaded = await hero.evaluate(
      (el: HTMLImageElement) => el.complete && el.naturalWidth > 0
    );
    expect(heroLoaded, "Hero cover image failed to load").toBe(true);
  });

  test("vocab table renders as HTML table, not raw markdown pipes", async ({ page }) => {
    await page.goto(ODEN_URL);

    const table = page.locator("article table").first();
    await expect(table).toBeVisible({ timeout: 10_000 });

    const firstCell = table.locator("td").first();
    await expect(firstCell).toBeVisible();
    await expect(firstCell).not.toContainText("|");

    const bodyText = await page.locator("article").innerText();
    expect(bodyText).not.toMatch(/\|[-]+\|/);
  });

  test("article body images are visible and load successfully", async ({ page }) => {
    await page.goto(ODEN_URL);
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
    await page.goto(ODEN_URL);

    const articleText = await page.locator("article").innerText({ timeout: 10_000 });
    expect(articleText).toContain("Is Kozuki Oden from One Piece based on a real person?");
    expect(articleText).toContain("Why is Oden's name a food?");
    expect(articleText).toContain("Was Oden's boiling execution based on a real historical punishment?");
  });

  test("history sections render - Nobunaga, Hideyoshi, Honnoji, 47 Ronin, bushido", async ({ page }) => {
    await page.goto(ODEN_URL);
    await page.locator("article").waitFor({ timeout: 10_000 });

    const articleText = await page.locator("article").innerText();
    expect(articleText).toContain("Oda Nobunaga");
    expect(articleText).toContain("Toyotomi Hideyoshi");
    expect(articleText).toContain("Honnoji");
    expect(articleText).toContain("Akechi Mitsuhide");
    expect(articleText).toContain("47 Ronin");
    expect(articleText).toContain("bushido");
    expect(articleText).toContain("uragiri");
    expect(articleText).toContain("jigoku-ni");
    expect(articleText).toContain("One Piece");
  });

  test("JSON-LD structured data is present in page head", async ({ page }) => {
    await page.goto(ODEN_URL);

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
// Ninja vs Samurai article
// ---------------------------------------------------------------------------

const NINJA_SLUG = "ninja-vs-samurai-japanese-history";
const NINJA_URL = `/journal/${NINJA_SLUG}`;

test.describe("Journal article — ninja-vs-samurai-japanese-history", () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(NINJA_URL, { waitUntil: "domcontentloaded", timeout: 80_000 });
    await page.close();
  });

  test("loads without 500 error, shows heading, and hero image is visible", async ({ page }) => {
    const response = await page.goto(NINJA_URL);
    expect(response?.status()).not.toBe(500);
    expect(response?.status()).toBe(200);

    await expect(
      page.getByRole("heading", { level: 1 })
    ).toContainText("Ninja", { timeout: 10_000 });

    const hero = page.locator(".relative img").first();
    await expect(hero).toBeVisible();
    const heroLoaded = await hero.evaluate(
      (el: HTMLImageElement) => el.complete && el.naturalWidth > 0
    );
    expect(heroLoaded, "Hero cover image failed to load").toBe(true);
  });

  test("vocab table renders as HTML table, not raw markdown pipes", async ({ page }) => {
    await page.goto(NINJA_URL);

    const table = page.locator("article table").first();
    await expect(table).toBeVisible({ timeout: 10_000 });

    const firstCell = table.locator("td").first();
    await expect(firstCell).toBeVisible();
    await expect(firstCell).not.toContainText("|");

    const bodyText = await page.locator("article").innerText();
    expect(bodyText).not.toMatch(/\|[-]+\|/);
  });

  test("article body images are visible and load successfully", async ({ page }) => {
    await page.goto(NINJA_URL);
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
    await page.goto(NINJA_URL);

    const articleText = await page.locator("article").innerText({ timeout: 10_000 });
    expect(articleText).toContain("Were ninja real historical figures?");
    expect(articleText).toContain("What does shinobi mean in Japanese?");
    expect(articleText).toContain("What is the difference between ninja and samurai?");
    expect(articleText).toContain("Is Naruto a realistic portrayal of ninja?");
    expect(articleText).toContain("Is Tanjiro from Demon Slayer following Bushido?");
  });

  test("content sections render - shinobi, Naruto, Demon Slayer, Sekiro, Bleach, vocab", async ({ page }) => {
    await page.goto(NINJA_URL);
    await page.locator("article").waitFor({ timeout: 10_000 });

    const articleText = await page.locator("article").innerText();
    expect(articleText).toContain("shinobi");
    expect(articleText).toContain("bushido");
    expect(articleText).toContain("Naruto");
    expect(articleText).toContain("Hokage");
    expect(articleText).toContain("Demon Slayer");
    expect(articleText).toContain("Tanjiro");
    expect(articleText).toContain("Sekiro");
    expect(articleText).toContain("Bleach");
    expect(articleText).toContain("ninjutsu");
    expect(articleText).toContain("shuriken");
    expect(articleText).toContain("katana");
    expect(articleText).toContain("Iga");
  });

  test("JSON-LD structured data is present in page head", async ({ page }) => {
    await page.goto(NINJA_URL);

    const allLdBlocks = page.locator('script[type="application/ld+json"]');
    const blockCount = await allLdBlocks.count();
    expect(blockCount).toBeGreaterThanOrEqual(2);

    let articleData: Record<string, unknown> | null = null;
    let faqData: Record<string, unknown> | null = null;
    for (let i = 0; i < blockCount; i++) {
      const text = await allLdBlocks.nth(i).innerText();
      const parsed = JSON.parse(text) as Record<string, unknown>;
      if (parsed["@type"] === "BlogPosting") articleData = parsed;
      if (parsed["@type"] === "FAQPage") faqData = parsed;
    }

    expect(articleData).not.toBeNull();
    expect((articleData as Record<string, unknown>).headline).toContain("Ninja");
    expect(faqData).not.toBeNull();
    expect((faqData as { mainEntity: unknown[] }).mainEntity.length).toBeGreaterThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------
// Sun Wukong Monkey King - Goku Luffy article
// ---------------------------------------------------------------------------

const WUKONG_SLUG = "sun-wukong-monkey-king-goku-luffy";
const WUKONG_URL = `/journal/${WUKONG_SLUG}`;

test.describe("Journal article — sun-wukong-monkey-king-goku-luffy", () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(WUKONG_URL, { waitUntil: "domcontentloaded", timeout: 80_000 });
    await page.close();
  });

  test("loads without 500 error, shows heading, and hero image is visible", async ({ page }) => {
    const response = await page.goto(WUKONG_URL);
    expect(response?.status()).not.toBe(500);
    expect(response?.status()).toBe(200);

    await expect(
      page.getByRole("heading", { level: 1 })
    ).toContainText("Goku", { timeout: 10_000 });

    const hero = page.locator(".relative img").first();
    await expect(hero).toBeVisible();
    const heroLoaded = await hero.evaluate(
      (el: HTMLImageElement) => el.complete && el.naturalWidth > 0
    );
    expect(heroLoaded, "Hero cover image failed to load").toBe(true);
  });

  test("vocab table renders as HTML table, not raw markdown pipes", async ({ page }) => {
    await page.goto(WUKONG_URL);

    const table = page.locator("article table").first();
    await expect(table).toBeVisible({ timeout: 10_000 });

    const firstCell = table.locator("td").first();
    await expect(firstCell).toBeVisible();
    await expect(firstCell).not.toContainText("|");

    const bodyText = await page.locator("article").innerText();
    expect(bodyText).not.toMatch(/\|[-]+\|/);
  });

  test("article body images are visible and load successfully", async ({ page }) => {
    await page.goto(WUKONG_URL);
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
    await page.goto(WUKONG_URL);

    const articleText = await page.locator("article").innerText({ timeout: 10_000 });
    expect(articleText).toContain("Is Goku from Dragon Ball based on the Monkey King?");
    expect(articleText).toContain("Is Luffy from One Piece based on Sun Wukong?");
    expect(articleText).toContain("What does 悟空 (Goku) mean in Japanese?");
    expect(articleText).toContain("What does Nyoibo mean in Japanese?");
    expect(articleText).toContain("What is Journey to the West called in Japanese?");
  });

  test("cross-franchise sections render - Dragon Ball, One Piece, Saiyuki, Luffy, Wukong", async ({ page }) => {
    await page.goto(WUKONG_URL);
    await page.locator("article").waitFor({ timeout: 10_000 });

    const articleText = await page.locator("article").innerText();
    expect(articleText).toContain("Sun Wukong");
    expect(articleText).toContain("Dragon Ball");
    expect(articleText).toContain("Son Goku");
    expect(articleText).toContain("Nyoibo");
    expect(articleText).toContain("One Piece");
    expect(articleText).toContain("Luffy");
    expect(articleText).toContain("Saiyuki");
    expect(articleText).toContain("Seiten Taisei");
    expect(articleText).toContain("Five Elements Mountain");
  });

  test("JSON-LD structured data is present in page head", async ({ page }) => {
    await page.goto(WUKONG_URL);

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
// Naruto jutsu names Japanese meaning article
// ---------------------------------------------------------------------------

const JUTSU_SLUG = "naruto-jutsu-names-japanese-meaning";
const JUTSU_URL = `/journal/${JUTSU_SLUG}`;

test.describe("Journal article — naruto-jutsu-names-japanese-meaning", () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(JUTSU_URL, { waitUntil: "domcontentloaded", timeout: 80_000 });
    await page.close();
  });

  test("loads without 500 error, shows heading, and hero image is visible", async ({ page }) => {
    const response = await page.goto(JUTSU_URL);
    expect(response?.status()).not.toBe(500);
    expect(response?.status()).toBe(200);

    await expect(
      page.getByRole("heading", { level: 1 })
    ).toContainText("Jutsu", { timeout: 10_000 });

    const hero = page.locator(".relative img").first();
    await expect(hero).toBeVisible();
    const heroLoaded = await hero.evaluate(
      (el: HTMLImageElement) => el.complete && el.naturalWidth > 0
    );
    expect(heroLoaded, "Hero cover image failed to load").toBe(true);
  });

  test("vocab table renders as HTML table, not raw markdown pipes", async ({ page }) => {
    await page.goto(JUTSU_URL);

    const table = page.locator("article table").first();
    await expect(table).toBeVisible({ timeout: 10_000 });

    const firstCell = table.locator("td").first();
    await expect(firstCell).toBeVisible();
    await expect(firstCell).not.toContainText("|");

    const bodyText = await page.locator("article").innerText();
    expect(bodyText).not.toMatch(/\|[-]+\|/);
  });

  test("article body images are visible and load successfully", async ({ page }) => {
    await page.goto(JUTSU_URL);
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
    await page.goto(JUTSU_URL);

    const articleText = await page.locator("article").innerText({ timeout: 10_000 });
    expect(articleText).toContain("What does Rasengan mean in Japanese?");
    expect(articleText).toContain("Why is Chidori called One Thousand Birds?");
    expect(articleText).toContain("What does Sharingan mean in Japanese?");
    expect(articleText).toContain("Is the Edo in Edo Tensei the same as Tokyo");
    expect(articleText).toContain("What does Rinnegan mean in Japanese?");
  });

  test("jutsu sections render - Rasengan, Chidori, Sharingan, Rinnegan, Edo Tensei, Kage Bunshin", async ({ page }) => {
    await page.goto(JUTSU_URL);
    await page.locator("article").waitFor({ timeout: 10_000 });

    const articleText = await page.locator("article").innerText();
    expect(articleText).toContain("Rasengan");
    expect(articleText).toContain("Chidori");
    expect(articleText).toContain("Raikiri");
    expect(articleText).toContain("Sharingan");
    expect(articleText).toContain("Byakugan");
    expect(articleText).toContain("Rinnegan");
    expect(articleText).toContain("Edo Tensei");
    expect(articleText).toContain("Kage Bunshin");
    expect(articleText).toContain("Ninjutsu");
    expect(articleText).toContain("Kakashi");
    expect(articleText).toContain("Minato");
    expect(articleText).toContain("samsara");
  });

  test("JSON-LD structured data is present in page head", async ({ page }) => {
    await page.goto(JUTSU_URL);

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
// Anime counting Japanese numbers article
// ---------------------------------------------------------------------------

const COUNTING_SLUG = "anime-counting-japanese-numbers";
const COUNTING_URL = `/journal/${COUNTING_SLUG}`;

test.describe("Journal article — anime-counting-japanese-numbers", () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(COUNTING_URL, { waitUntil: "domcontentloaded", timeout: 80_000 });
    await page.close();
  });

  test("loads without 500 error, shows heading, and hero image is visible", async ({ page }) => {
    const response = await page.goto(COUNTING_URL);
    expect(response?.status()).not.toBe(500);
    expect(response?.status()).toBe(200);

    await expect(
      page.getByRole("heading", { level: 1 })
    ).toContainText("Count", { timeout: 10_000 });

    const hero = page.locator(".relative img").first();
    await expect(hero).toBeVisible();
    const heroLoaded = await hero.evaluate(
      (el: HTMLImageElement) => el.complete && el.naturalWidth > 0
    );
    expect(heroLoaded, "Hero cover image failed to load").toBe(true);
  });

  test("vocab tables render as HTML tables, not raw markdown pipes", async ({ page }) => {
    await page.goto(COUNTING_URL);

    const table = page.locator("article table").first();
    await expect(table).toBeVisible({ timeout: 10_000 });

    const firstCell = table.locator("td").first();
    await expect(firstCell).toBeVisible();
    await expect(firstCell).not.toContainText("|");

    const bodyText = await page.locator("article").innerText();
    expect(bodyText).not.toMatch(/\|[-]+\|/);
  });

  test("article body images are visible and load successfully", async ({ page }) => {
    await page.goto(COUNTING_URL);
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
    await page.goto(COUNTING_URL);

    const articleText = await page.locator("article").innerText({ timeout: 10_000 });
    expect(articleText).toContain("What does sandaime mean in Naruto?");
    expect(articleText).toContain("What does sannin mean in Japanese?");
    expect(articleText).toContain("What does Yonko mean in One Piece?");
    expect(articleText).toContain("What does nanadaime mean in Naruto?");
  });

  test("counting sections render - Hokage, Sannin, Yonko, Shichibukai, Nanatsu, Junikizuki", async ({ page }) => {
    await page.goto(COUNTING_URL);
    await page.locator("article").waitFor({ timeout: 10_000 });

    const articleText = await page.locator("article").innerText();
    expect(articleText).toContain("sandaime");
    expect(articleText).toContain("nanadaime");
    expect(articleText).toContain("sannin");
    expect(articleText).toContain("Yonko");
    expect(articleText).toContain("Shichibukai");
    expect(articleText).toContain("Gorosei");
    expect(articleText).toContain("nanatsu");
    expect(articleText).toContain("Junikizuki");
    expect(articleText).toContain("Shichi-Go-San");
    expect(articleText).toContain("One Piece");
    expect(articleText).toContain("Naruto");
    expect(articleText).toContain("Demon Slayer");
  });

  test("JSON-LD structured data is present in page head", async ({ page }) => {
    await page.goto(COUNTING_URL);

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
// Anime character names Japanese meanings article
// ---------------------------------------------------------------------------

const NAMES_SLUG = "anime-character-names-japanese-meanings";
const NAMES_URL = `/journal/${NAMES_SLUG}`;

test.describe("Journal article — anime-character-names-japanese-meanings", () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(NAMES_URL, { waitUntil: "domcontentloaded", timeout: 80_000 });
    await page.close();
  });

  test("loads without 500 error, shows heading, and hero image is visible", async ({ page }) => {
    const response = await page.goto(NAMES_URL);
    expect(response?.status()).not.toBe(500);
    expect(response?.status()).toBe(200);

    await expect(
      page.getByRole("heading", { level: 1 })
    ).toContainText("Anime", { timeout: 10_000 });

    const hero = page.locator(".relative img").first();
    await expect(hero).toBeVisible();
    const heroLoaded = await hero.evaluate(
      (el: HTMLImageElement) => el.complete && el.naturalWidth > 0
    );
    expect(heroLoaded, "Hero cover image failed to load").toBe(true);
  });

  test("vocab table renders as HTML table, not raw markdown pipes", async ({ page }) => {
    await page.goto(NAMES_URL);

    const table = page.locator("article table").first();
    await expect(table).toBeVisible({ timeout: 10_000 });

    const firstCell = table.locator("td").first();
    await expect(firstCell).toBeVisible();
    await expect(firstCell).not.toContainText("|");

    const bodyText = await page.locator("article").innerText();
    expect(bodyText).not.toMatch(/\|[-]+\|/);
  });

  test("article body images are visible and load successfully", async ({ page }) => {
    await page.goto(NAMES_URL);
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
    await page.goto(NAMES_URL);

    const articleText = await page.locator("article").innerText({ timeout: 10_000 });
    expect(articleText).toContain("What does Inuyasha mean in Japanese?");
    expect(articleText).toContain("Why are Saiyans named after vegetables in Dragon Ball?");
    expect(articleText).toContain("What does Kakashi mean in Japanese?");
    expect(articleText).toContain("What does Ichigo's name mean in Bleach?");
    expect(articleText).toContain("What does Nezuko's name mean in Japanese?");
  });

  test("character name sections render - Inuyasha, Saiyans, Kakashi, Ichigo, Nezuko, Orochimaru", async ({ page }) => {
    await page.goto(NAMES_URL);
    await page.locator("article").waitFor({ timeout: 10_000 });

    const articleText = await page.locator("article").innerText();
    expect(articleText).toContain("Inuyasha");
    expect(articleText).toContain("Vegeta");
    expect(articleText).toContain("Kakarot");
    expect(articleText).toContain("Kakashi");
    expect(articleText).toContain("Itachi");
    expect(articleText).toContain("Shikamaru");
    expect(articleText).toContain("hanafuda");
    expect(articleText).toContain("Orochimaru");
    expect(articleText).toContain("Jiraiya");
    expect(articleText).toContain("Nezuko");
    expect(articleText).toContain("Tanjiro");
    expect(articleText).toContain("Ichigo");
    expect(articleText).toContain("Byakuya");
    expect(articleText).toContain("Kenpachi");
  });

  test("JSON-LD structured data is present in page head", async ({ page }) => {
    await page.goto(NAMES_URL);

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
