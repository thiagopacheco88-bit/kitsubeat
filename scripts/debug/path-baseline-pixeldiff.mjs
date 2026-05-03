#!/usr/bin/env node
/**
 * Phase 14.1 W-2 pre-baseline pixel-diff gate.
 *
 * Captures /path at 390x844 dark theme, compares against
 * _temp/path-redesign/demo-CA-hybrid.png with pixelmatch.
 *
 * Exit 0   -> diff <= 5%, safe to lock Playwright baseline next
 * Exit 1   -> diff > 5%, halt for manual review
 *
 * Usage:
 *   node scripts/debug/path-baseline-pixeldiff.mjs
 *
 * NOT a CI gate. Run once before `npx playwright test ... --update-snapshots`.
 */
import { chromium } from "playwright";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import fs from "node:fs";
import path from "node:path";

const DEMO_PNG = path.resolve("_temp/path-redesign/demo-CA-hybrid.png");
const LIVE_PNG = path.resolve("_temp/path-redesign/path-live-prebaseline.png");
const DIFF_PNG = path.resolve("_temp/path-redesign/path-prebaseline-diff.png");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:7000";
const THRESHOLD = 0.05; // 5%

async function capture() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    document.documentElement.setAttribute("data-theme", "dark");
  });
  await page.goto(`${BASE_URL}/path`);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: LIVE_PNG, fullPage: false });
  await browser.close();
}

function diff() {
  const live = PNG.sync.read(fs.readFileSync(LIVE_PNG));
  const ref = PNG.sync.read(fs.readFileSync(DEMO_PNG));
  if (live.width !== ref.width || live.height !== ref.height) {
    console.error(
      `[prebaseline] dimension mismatch live=${live.width}x${live.height} ref=${ref.width}x${ref.height} — capture before comparing`,
    );
    process.exit(1);
  }
  const diffImg = new PNG({ width: live.width, height: live.height });
  const diffPx = pixelmatch(
    live.data,
    ref.data,
    diffImg.data,
    live.width,
    live.height,
    { threshold: 0.1 },
  );
  fs.writeFileSync(DIFF_PNG, PNG.sync.write(diffImg));
  const ratio = diffPx / (live.width * live.height);
  console.log(
    `[prebaseline] diff pixels=${diffPx} ratio=${(ratio * 100).toFixed(2)}% threshold=${THRESHOLD * 100}%`,
  );
  if (ratio > THRESHOLD) {
    console.error(
      `[prebaseline] HALT — live /path diverges from demo by ${(ratio * 100).toFixed(2)}% (>5%). ` +
        `Inspect ${DIFF_PNG}; do NOT lock Playwright baseline until visual matches the demo. ` +
        `If the demo has intentionally been refined and live is correct, update _temp/path-redesign/demo-CA-hybrid.png explicitly with a commit explaining the change.`,
    );
    process.exit(1);
  }
  console.log("[prebaseline] PASS — safe to run `npx playwright test path-visual-dark --update-snapshots`");
}

await capture();
diff();
