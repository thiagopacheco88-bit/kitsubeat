import { chromium } from "@playwright/test";
import { readFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const slug = process.argv[2] || "kaikai-kitan-eve";
const baseUrl = process.argv[3] || "http://localhost:7000";

(async () => {
  const lesson = JSON.parse(readFileSync(resolve(`data/lessons-cache/${slug}.json`), "utf-8"));
  console.log(`[uat] ${slug}: ${lesson.verses.length} verses, ${lesson.vocabulary.length} vocab, ${lesson.grammar_points.length} grammar`);
  mkdirSync("tmp/uat", { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("  [pageerror]", e.message));

  await page.goto(`${baseUrl}/songs/${slug}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1500);

  // ──────────────── LANGUAGE TOGGLE TEST ────────────────
  // Sample translation text in each language for verse 1
  async function captureV1Translation(lang: string): Promise<string> {
    // Click the language button
    const btn = await page.getByRole("button", { name: lang, exact: false }).first();
    await btn.click();
    await page.waitForTimeout(300);
    // Verse 1's translation block — look in the verse panel
    const text = await page.$eval('[data-verse-number="1"]', (el) => (el as HTMLElement).innerText);
    return text;
  }

  const enText = await captureV1Translation("English");
  await page.screenshot({ path: "tmp/uat/" + slug + "-en.png", fullPage: false, clip: { x: 0, y: 200, width: 1400, height: 700 } });

  const ptText = await captureV1Translation("Portugues");
  await page.screenshot({ path: "tmp/uat/" + slug + "-pt.png", fullPage: false, clip: { x: 0, y: 200, width: 1400, height: 700 } });

  const esText = await captureV1Translation("Espanol");
  await page.screenshot({ path: "tmp/uat/" + slug + "-es.png", fullPage: false, clip: { x: 0, y: 200, width: 1400, height: 700 } });

  // The Japanese surface forms / vocab will be the same across all 3, but the
  // translation lines should differ. Check character-set difference: EN should be
  // ASCII-heavy, ES should contain ñ/¡/¿ or accents, PT should also have accents.
  const enAscii = (enText.match(/[a-zA-Z ]/g) || []).length;
  const ptAccent = (ptText.match(/[áàâãéêíóôõúçñ]/gi) || []).length;
  const esAccent = (esText.match(/[áéíóúñ¡¿]/gi) || []).length;
  console.log("[uat] language toggle:");
  console.log("  EN sample (first 120):", enText.replace(/\s+/g, " ").slice(0, 120));
  console.log("  PT sample (first 120):", ptText.replace(/\s+/g, " ").slice(0, 120));
  console.log("  ES sample (first 120):", esText.replace(/\s+/g, " ").slice(0, 120));
  console.log(`  text differs EN→PT: ${enText !== ptText}, PT→ES: ${ptText !== esText}, EN→ES: ${enText !== esText}`);

  // ──────────────── VERSE COUNT TEST ────────────────
  const verseCount = await page.$$eval('[data-verse-number]', (els) => els.length);
  console.log(`[uat] DOM verse count: ${verseCount} (lesson JSON: ${lesson.verses.length}) — match: ${verseCount === lesson.verses.length}`);

  // ──────────────── PLAYER PROBE ────────────────
  // After scroll/interaction, check if YouTube iframe appears
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  const iframes = await page.$$eval("iframe", (els) => els.map((e) => (e as HTMLIFrameElement).src));
  console.log(`[uat] iframes after load:`, iframes.length, iframes.slice(0, 3));

  await browser.close();
  console.log(`[uat] screenshots in tmp/uat/`);
})();
