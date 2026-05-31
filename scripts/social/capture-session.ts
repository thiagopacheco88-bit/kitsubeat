/**
 * Capture browser session state for Threads and/or TikTok.
 * Opens a real browser, you log in, then it saves the session.
 * Run once locally; the saved JSON becomes your GitHub Secret.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/social/capture-session.ts --threads
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/social/capture-session.ts --tiktok
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/social/capture-session.ts --threads --tiktok
 */
import { chromium } from "playwright";
import { writeFileSync, readFileSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
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

async function captureSession(url: string, outFile: string, platform: string): Promise<void> {
  console.log(`\n[${platform}] Opening browser…`);
  // Use launchPersistentContext — opens a real visible window immediately
  const tmpDir = mkdtempSync(join(tmpdir(), `pw-${platform.toLowerCase()}-`));
  const ctx = await chromium.launchPersistentContext(tmpDir, {
    headless: false,
    slowMo: 50,
    args: ["--start-maximized"],
    ignoreDefaultArgs: ["--disable-extensions"],
  });
  const page = await ctx.newPage();

  await page.goto(url);
  console.log(`[${platform}] Log into ${platform} in the browser window.`);
  await waitForEnter(`[${platform}] Press Enter once you are logged in and on the home feed…`);

  await ctx.storageState({ path: outFile });
  console.log(`[${platform}] ✓ Session saved to ${outFile}`);

  // Print base64 for GitHub Secret
  const json = readFileSync(outFile, "utf8");
  const b64 = Buffer.from(json).toString("base64");
  console.log(`\n[${platform}] GitHub Secret:`);
  console.log(`  Name:  ${platform.toUpperCase()}_SESSION`);
  console.log(`  Value: (base64, ${b64.length} chars — saved to ${outFile}.b64)`);
  writeFileSync(outFile + ".b64", b64);
  console.log(`  Preview: ${b64.slice(0, 60)}…`);

  await ctx.close();
}

if (!doThreads && !doTikTok) {
  console.error("Usage: capture-session.ts --threads [--tiktok]");
  process.exit(1);
}

if (doThreads) {
  await captureSession(
    "https://www.threads.com",
    join(ROOT, ".threads-session.json"),
    "Threads"
  );
}

if (doTikTok) {
  await captureSession(
    "https://www.tiktok.com/login",
    join(ROOT, ".tiktok-session.json"),
    "TikTok"
  );
}

console.log("\n✅ Sessions captured. Next steps:");
console.log("1. Go to your GitHub repo → Settings → Secrets → Actions");
if (doThreads) console.log("2. Add secret THREADS_SESSION with the base64 value from .threads-session.json.b64");
if (doTikTok)  console.log("3. Add secret TIKTOK_SESSION with the base64 value from .tiktok-session.json.b64");
console.log("4. Sessions last ~90 days — re-run this script when they expire.");
