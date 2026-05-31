/**
 * Post today's entry to Threads and/or TikTok via browser automation.
 * Threads: posts as a reply chain (same thread structure as X).
 * TikTok:  uploads video file from the videos/ directory.
 *
 * Reads session state from env (base64-encoded JSON set as GitHub Secret).
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/social/playwright-post.ts --threads
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/social/playwright-post.ts --tiktok
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/social/playwright-post.ts --threads --tiktok
 */
import { chromium } from "playwright";
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

// ─── Queue loader ─────────────────────────────────────────────────────────────

type QueueEntry = { date: string; type: string; tweets: string[] };

function getEntry(): QueueEntry | null {
  const q = JSON.parse(readFileSync(join(ROOT, "src/data/social-queue.json"), "utf8")) as {
    queue: QueueEntry[];
  };
  return q.queue.find(e => e.date === today) ?? null;
}

// ─── Session loader ───────────────────────────────────────────────────────────

function loadSession(envVar: string, fallbackFile: string): string | null {
  if (process.env[envVar]) {
    const json = Buffer.from(process.env[envVar]!, "base64").toString("utf8");
    writeFileSync(fallbackFile, json);
    return fallbackFile;
  }
  if (existsSync(fallbackFile)) return fallbackFile;
  return null;
}

// ─── Threads — full reply chain (same structure as X) ─────────────────────────

async function postToThreads(tweets: string[]): Promise<void> {
  const sessionFile = loadSession("THREADS_SESSION", join(ROOT, ".threads-session.json"));
  if (!sessionFile) throw new Error("No Threads session. Run capture-session.ts --threads first.");

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ storageState: sessionFile });
  const page = await ctx.newPage();

  try {
    await page.goto("https://www.threads.com", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Open the "New thread" composer
    const newThreadSelectors = [
      '[aria-label*="New thread"]',
      'div[role="button"]:has-text("New thread")',
      '[href="/intent/post"]',
      'a[href*="intent/post"]',
    ];
    let opened = false;
    for (const sel of newThreadSelectors) {
      try {
        await page.click(sel, { timeout: 3000 });
        opened = true;
        break;
      } catch { /* try next */ }
    }
    if (!opened) {
      await page.goto("https://www.threads.com/intent/post", { waitUntil: "domcontentloaded" });
    }
    await page.waitForTimeout(2000);

    // Type the first tweet and add subsequent ones as thread replies
    for (let i = 0; i < tweets.length; i++) {
      const tweet = tweets[i];

      // Find the active text input (last/newest contenteditable in the composer)
      const inputSelectors = [
        '[contenteditable="true"][role="textbox"]',
        'div[contenteditable="true"]',
      ];

      let typed = false;
      for (const sel of inputSelectors) {
        try {
          const els = page.locator(sel);
          const count = await els.count();
          if (count > 0) {
            const el = els.nth(count - 1); // use the last (newest) input
            await el.click({ timeout: 3000 });
            await el.fill(tweet);
            typed = true;
            break;
          }
        } catch { /* try next */ }
      }
      if (!typed) throw new Error(`Could not type tweet ${i + 1}`);
      console.log(`  ✓ typed tweet ${i + 1}/${tweets.length} (${[...tweet].length} chars)`);

      // If there are more tweets, click "Add to thread" / "+" to add the next post
      if (i < tweets.length - 1) {
        await page.waitForTimeout(500);
        const addSelectors = [
          '[aria-label*="Add"]',
          'div[role="button"]:has-text("Add to thread")',
          'svg[aria-label*="Add"]',
          // Threads often shows a small "+" icon
        ];
        let added = false;
        for (const sel of addSelectors) {
          try {
            await page.click(sel, { timeout: 2000 });
            added = true;
            break;
          } catch { /* try next */ }
        }
        if (!added) {
          // Press Enter twice as fallback (creates a new paragraph, Threads may thread it)
          console.log(`  ⚠ Could not find Add button after tweet ${i + 1}, using Enter fallback`);
          await page.keyboard.press("Enter");
          await page.keyboard.press("Enter");
        }
        await page.waitForTimeout(500);
      }
    }

    await page.waitForTimeout(1000);

    // Click the Post button
    const postSelectors = [
      'div[role="button"]:has-text("Post")',
      'button:has-text("Post")',
      '[data-testid="submit-button"]',
    ];
    let posted = false;
    for (const sel of postSelectors) {
      try {
        await page.click(sel, { timeout: 3000 });
        posted = true;
        break;
      } catch { /* try next */ }
    }
    if (!posted) throw new Error("Could not find Post button");

    await page.waitForTimeout(4000);
    console.log(`✓ Threads thread posted (${tweets.length} posts)`);

    await ctx.storageState({ path: sessionFile });

  } finally {
    await browser.close();
  }
}

// ─── TikTok — video upload ────────────────────────────────────────────────────

async function postVideoToTikTok(videoPath: string, caption: string): Promise<void> {
  const sessionFile = loadSession("TIKTOK_SESSION", join(ROOT, ".tiktok-session.json"));
  if (!sessionFile) throw new Error("No TikTok session. Run capture-session.ts --tiktok first.");

  const browser = await chromium.launch({ headless: false }); // headless=false for file upload
  const ctx = await browser.newContext({ storageState: sessionFile });
  const page = await ctx.newPage();

  try {
    await page.goto("https://www.tiktok.com/creator-center/upload", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);

    if (page.url().includes("login")) throw new Error("TikTok session expired");

    // Upload video file
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(videoPath);
    console.log("  ✓ Video uploaded, waiting for processing...");
    await page.waitForTimeout(15000); // wait for video to process

    // Set caption
    const captionSelectors = [
      '.public-DraftEditor-content',
      '[contenteditable="true"]',
      'div[class*="caption"] [contenteditable]',
    ];
    for (const sel of captionSelectors) {
      try {
        await page.click(sel, { timeout: 3000 });
        await page.keyboard.selectAll();
        await page.keyboard.type(caption, { delay: 10 });
        break;
      } catch { /* try next */ }
    }

    await page.waitForTimeout(2000);

    // Click Post
    const postBtn = page.locator('button:has-text("Post"), button[type="submit"]').first();
    await postBtn.click({ timeout: 5000 });
    await page.waitForTimeout(5000);

    console.log("✓ TikTok video posted");
    await ctx.storageState({ path: sessionFile });

  } finally {
    await browser.close();
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log(`\nPosting for ${today}…`);

if (doThreads) {
  const entry = getEntry();
  if (!entry) {
    console.log(`No Threads entry for ${today} — skipping`);
  } else {
    console.log(`\nThreads [${entry.type}] — ${entry.tweets.length} tweets as reply chain:`);
    entry.tweets.forEach((t, i) => console.log(`\n  [${i + 1}/${entry.tweets.length}]\n${t}`));
    console.log("\nPosting thread...");
    await postToThreads(entry.tweets);
  }
}

if (doTikTok) {
  // TikTok video posting is handled separately via post-to-tiktok.py
  // This path is for text posts only
  console.log("TikTok video posting: use scripts/social/post-to-tiktok.py for video uploads");
}

console.log("\nDone.");
