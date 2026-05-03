/**
 * screenshot-home-light.mjs
 * Captures the light-theme reference screenshot from demo-home-CA-hybrid.html.
 *
 * Output: _temp/path-redesign/demo-home-CA-hybrid-light.png (390x844, iPhone 14 Pro viewport)
 *
 * Strategy: The home demo shows both dark + light IosFrames side-by-side. We render the full
 * page at a wide viewport so both phones mount correctly, then clip exactly the light
 * IosFrame's screen div (390x844, second occurrence of the iPhone screen element).
 *
 * The original demo-home-CA-hybrid.html is NOT modified — it is the locked dark contract for AC #2.
 * (T-14.2-01-03 threat mitigation: script reads from local demo file, no network input)
 *
 * Adapted from _temp/path-redesign/screenshot-light.mjs (14.1 light-theme capture pattern).
 * Same approach: wide viewport → locate second IosFrame screen div → screenshot that element.
 *
 * Usage: node _temp/path-redesign/screenshot-home-light.mjs
 *   (requires @playwright/test installed — already present from Phase 08.1)
 */

import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fileUrl = 'file:///' + path.join(__dirname, 'demo-home-CA-hybrid.html').replace(/\\/g, '/');
const outPath = path.join(__dirname, 'demo-home-CA-hybrid-light.png');

const browser = await chromium.launch();
// Use a wide viewport so both side-by-side phones render without wrapping
const ctx = await browser.newContext({ viewport: { width: 1200, height: 1200 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

await page.goto(fileUrl);
// Wait for React/Babel to mount and fonts to settle
await page.waitForLoadState('networkidle');
await page.waitForTimeout(500);

// The IosFrame renders a div with exactly width:390px height:844px (the iPhone screen).
// The demo shows dark first, then light — so the light phone is the SECOND such element.
// We capture the second 390x844 screen div (same approach as screenshot-light.mjs).
// The data-theme="light" div is INSIDE the screen (height:100%), so we target the wrapper.
const screenDivs = page.locator('div[style*="width: 390px"][style*="height: 844px"]');
const count = await screenDivs.count();

if (count >= 2) {
  const lightScreen = screenDivs.nth(1); // index 1 = second element = light phone
  const box = await lightScreen.boundingBox();
  if (!box) {
    console.error('ERROR: Light IosFrame screen not in viewport');
    await browser.close();
    process.exit(1);
  }
  console.log(`Light screen found at: ${JSON.stringify(box)}`);
  await lightScreen.screenshot({ path: outPath });
} else {
  // Fallback: try border-radius selector (also unique to IosFrame screen)
  const alt = page.locator('div[style*="border-radius: 48px"][style*="height: 844px"]');
  const altCount = await alt.count();
  if (altCount >= 2) {
    const lightScreen = alt.nth(1);
    const box = await lightScreen.boundingBox();
    console.log(`Light screen (alt selector) found at: ${JSON.stringify(box)}`);
    await lightScreen.screenshot({ path: outPath });
  } else {
    // Final fallback: use data-theme="light" div (inner screen content, ~390x756)
    const lightThemeDiv = page.locator('[data-theme="light"]');
    const lightCount = await lightThemeDiv.count();
    if (lightCount >= 1) {
      const box = await lightThemeDiv.first().boundingBox();
      if (!box) {
        console.error('ERROR: Light theme div not in viewport');
        await browser.close();
        process.exit(1);
      }
      console.log(`Light theme div (fallback) found at: ${JSON.stringify(box)}`);
      await lightThemeDiv.first().screenshot({ path: outPath });
    } else {
      console.error(`ERROR: Expected 2 IosFrame screens, found ${count}. Demo may not have mounted.`);
      await browser.close();
      process.exit(1);
    }
  }
}

console.log(`Done. Saved to: ${outPath}`);
console.log('Expected dimensions: 390x844');

await browser.close();
