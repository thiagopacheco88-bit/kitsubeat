/**
 * Capture session cookies from your ALREADY LOGGED-IN Chrome browser.
 * Uses CDP to connect to the running browser — no new browser launched.
 * Run once locally; the saved JSON becomes your GitHub Secret.
 *
 * Prerequisites: Chrome must be running with remote debugging enabled:
 *   chrome.exe --remote-debugging-port=9222
 * Or use browser-harness (which already connects to your running Chrome).
 *
 * Easier: just run the browser-harness extraction inline (see comments below).
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/social/capture-session.ts --threads
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/social/capture-session.ts --tiktok
 */
import { chromium } from "playwright";
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import * as readline from "readline";

const ROOT = process.cwd();
const args = process.argv.slice(2);
const doThreads = args.includes("--threads");
const doTikTok = args.includes("--tiktok");

function waitForEnter(message: string): Promise<void> {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(message, () => { rl.close(); resolve(); });
  });
}

async function captureFromExistingBrowser(url: string, outFile: string, platform: string): Promise<void> {
  console.log(`\n[${platform}] Connecting to your running Chrome…`);
  console.log(`  Make sure Chrome is open and logged into ${platform}.`);

  // Connect to the already-running Chrome via CDP
  let browser;
  try {
    browser = await chromium.connectOverCDP("http://localhost:9222");
  } catch {
    // Fallback: launch a new browser and let user log in
    console.log(`  Could not connect to existing Chrome (needs --remote-debugging-port=9222)`);
    console.log(`  Launching new browser — please log in manually.`);
    const ctx = await chromium.launchPersistentContext(
      join(ROOT, `.pw-${platform.toLowerCase()}-profile`),
      { headless: false, slowMo: 50 }
    );
    const page = await ctx.newPage();
    await page.goto(url);
    await waitForEnter(`  [${platform}] Logged in? Press Enter to save session…`);
    await ctx.storageState({ path: outFile });
    await ctx.close();
    saveBase64(outFile, platform);
    return;
  }

  // Use existing browser context
  const contexts = browser.contexts();
  const ctx = contexts[0] ?? await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  await ctx.storageState({ path: outFile });
  console.log(`[${platform}] ✓ Session saved to ${outFile}`);
  saveBase64(outFile, platform);
  await browser.close();
}

function saveBase64(outFile: string, platform: string): void {
  const json = readFileSync(outFile, "utf8");
  const b64 = Buffer.from(json).toString("base64");
  writeFileSync(outFile + ".b64", b64);
  console.log(`[${platform}] GitHub Secret:`);
  console.log(`  Name:  ${platform.toUpperCase()}_SESSION`);
  console.log(`  Value: ${b64.length} chars — saved to ${outFile}.b64`);
}

if (!doThreads && !doTikTok) {
  console.error("Usage: capture-session.ts --threads [--tiktok]");
  process.exit(1);
}

if (doThreads) {
  await captureFromExistingBrowser(
    "https://www.threads.com",
    join(ROOT, ".threads-session.json"),
    "Threads"
  );
}

if (doTikTok) {
  await captureFromExistingBrowser(
    "https://www.tiktok.com",
    join(ROOT, ".tiktok-session.json"),
    "TikTok"
  );
}

console.log("\n✅ Done. Add the .b64 file contents as GitHub Secrets:");
if (doThreads) console.log("  THREADS_SESSION → .threads-session.json.b64");
if (doTikTok)  console.log("  TIKTOK_SESSION  → .tiktok-session.json.b64");
