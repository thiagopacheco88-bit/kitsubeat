/**
 * Post today's entry to Threads and/or TikTok via browser automation.
 * Reads session state from environment (base64-encoded JSON).
 *
 * Usage (local):
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/social/playwright-post.ts --threads
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/social/playwright-post.ts --tiktok
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/social/playwright-post.ts --threads --tiktok
 *
 * In GitHub Actions: THREADS_SESSION and TIKTOK_SESSION secrets are base64-encoded storageState JSON.
 */
import { chromium, type Page } from "@playwright/test";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: join(process.cwd(), ".env.local") });

const ROOT = process.cwd();
const args = process.argv.slice(2);
const doThreads = args.includes("--threads");
const doTikTok = args.includes("--tiktok");
const today = args.find(a => /^\d{4}-\d{2}-\d{2}$/.test(a)) ?? new Date().toISOString().slice(0, 10);

if (!doThreads && !doTikTok) {
  console.error("Usage: playwright-post.ts --threads [--tiktok] [YYYY-MM-DD]");
  process.exit(1);
}

// ─── Load queue entry ─────────────────────────────────────────────────────────

function getEntry(queueFile: string): { date: string; type: string; text: string } | null {
  const q = JSON.parse(readFileSync(join(ROOT, queueFile), "utf8")) as {
    queue: Array<{ date: string; type: string; text: string }>;
  };
  return q.queue.find(e => e.date === today) ?? null;
}

// ─── Session state helpers ─────────────────────────────────────────────────────

function loadSession(envVar: string, fallbackFile: string): string | null {
  // GitHub Actions: env var holds base64-encoded JSON
  if (process.env[envVar]) {
    const json = Buffer.from(process.env[envVar]!, "base64").toString("utf8");
    writeFileSync(fallbackFile, json);
    return fallbackFile;
  }
  // Local: use saved file
  if (existsSync(fallbackFile)) return fallbackFile;
  return null;
}

// ─── Threads poster ───────────────────────────────────────────────────────────

async function postToThreads(text: string): Promise<void> {
  const sessionFile = loadSession("THREADS_SESSION", join(ROOT, ".threads-session.json"));
  if (!sessionFile) throw new Error("No Threads session. Run capture-session.ts --threads first.");

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ storageState: sessionFile });
  const page = await ctx.newPage();

  try {
    await page.goto("https://www.threads.com", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Click the create/new thread button
    const createSelectors = [
      '[aria-label*="New thread"]',
      '[aria-label*="Create"]',
      'div[role="button"]:has-text("New thread")',
      'svg[aria-label*="New"]',
    ];
    let clicked = false;
    for (const sel of createSelectors) {
      try {
        await page.click(sel, { timeout: 3000 });
        clicked = true;
        break;
      } catch { /* try next */ }
    }
    if (!clicked) {
      // Try navigating directly to compose URL
      await page.goto("https://www.threads.com/intent/post", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
    }

    await page.waitForTimeout(1500);

    // Find and fill the text input
    const textSelectors = [
      '[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"]',
      'textarea',
    ];
    let filled = false;
    for (const sel of textSelectors) {
      try {
        const el = page.locator(sel).first();
        await el.click({ timeout: 3000 });
        await page.keyboard.type(text, { delay: 10 });
        filled = true;
        break;
      } catch { /* try next */ }
    }
    if (!filled) throw new Error("Could not find Threads text input");

    await page.waitForTimeout(1000);

    // Click post button
    const postSelectors = [
      'div[role="button"]:has-text("Post")',
      'button:has-text("Post")',
      '[data-testid="submit-button"]',
    ];
    for (const sel of postSelectors) {
      try {
        await page.click(sel, { timeout: 3000 });
        break;
      } catch { /* try next */ }
    }

    await page.waitForTimeout(3000);
    console.log(`✓ Threads post published (${[...text].length} chars)`);

    // Save updated session state
    await ctx.storageState({ path: sessionFile });

  } finally {
    await browser.close();
  }
}

// ─── TikTok poster ────────────────────────────────────────────────────────────

async function postToTikTok(text: string): Promise<void> {
  const sessionFile = loadSession("TIKTOK_SESSION", join(ROOT, ".tiktok-session.json"));
  if (!sessionFile) throw new Error("No TikTok session. Run capture-session.ts --tiktok first.");

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ storageState: sessionFile });
  const page = await ctx.newPage();

  try {
    // Navigate to TikTok text post creator
    await page.goto("https://www.tiktok.com/creator#/text", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(4000);

    // If redirected to login, session expired
    if (page.url().includes("login")) throw new Error("TikTok session expired. Re-run capture-session.ts --tiktok");

    // Check if we're on the right page - look for text editor
    const textEditorSelectors = [
      '[contenteditable="true"]',
      'div[data-contents="true"]',
      '.public-DraftEditor-content',
      'textarea[placeholder]',
    ];
    let filled = false;
    for (const sel of textEditorSelectors) {
      try {
        const el = page.locator(sel).first();
        await el.click({ timeout: 5000 });
        await page.keyboard.type(text, { delay: 15 });
        filled = true;
        break;
      } catch { /* try next */ }
    }
    if (!filled) throw new Error("Could not find TikTok text editor");

    await page.waitForTimeout(1000);

    // Click Post button
    const postSelectors = [
      'button:has-text("Post")',
      'button[type="submit"]',
      'div[role="button"]:has-text("Post")',
    ];
    for (const sel of postSelectors) {
      try {
        await page.click(sel, { timeout: 3000 });
        break;
      } catch { /* try next */ }
    }

    await page.waitForTimeout(4000);
    console.log(`✓ TikTok text post published (${[...text].length} chars)`);

    await ctx.storageState({ path: sessionFile });

  } finally {
    await browser.close();
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log(`\nPosting for ${today}…`);

if (doThreads) {
  const entry = getEntry("src/data/threads-queue.json");
  if (!entry) { console.log(`No Threads entry for ${today} — skipping`); }
  else {
    console.log(`\nThreads [${entry.type}]:\n${entry.text}\n`);
    await postToThreads(entry.text);
  }
}

if (doTikTok) {
  const entry = getEntry("src/data/tiktok-queue.json");
  if (!entry) { console.log(`No TikTok entry for ${today} — skipping`); }
  else {
    console.log(`\nTikTok [${entry.type}]:\n${entry.text}\n`);
    await postToTikTok(entry.text);
  }
}

console.log("\nDone.");
