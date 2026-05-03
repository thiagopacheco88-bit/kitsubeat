/**
 * screenshot-light.mjs
 * Captures the light-theme reference screenshot from demo-CA-hybrid.html.
 *
 * Output: _temp/path-redesign/demo-CA-hybrid-light.png (390x844, iPhone 14 Pro viewport)
 *
 * Strategy: The demo shows both dark + light IosFrames side-by-side. We render the full
 * page at a wide viewport so both phones mount correctly, then clip exactly the light
 * IosFrame's screen div (390x844, second occurrence of the iPhone screen element).
 *
 * The original demo-CA-hybrid.html is NOT modified — it is the locked dark contract for AC #2.
 * (T-14.1.00-02 threat mitigation: script never writes to demo-CA-hybrid.html)
 */

import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fileUrl = 'file:///' + path.join(__dirname, 'demo-CA-hybrid.html').replace(/\\/g, '/');
const outPath = path.join(__dirname, 'demo-CA-hybrid-light.png');

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
// We capture the second 390x844 screen div.
const screenDivs = page.locator('div[style*="width: 390px"][style*="height: 844px"]');
const count = await screenDivs.count();
if (count < 2) {
  // Fallback: try with border-radius (also unique to IosFrame screen)
  const alt = page.locator('div[style*="border-radius: 48px"][style*="height: 844px"]');
  const altCount = await alt.count();
  if (altCount < 2) {
    console.error(`ERROR: Expected 2 IosFrame screens, found ${count} (alt: ${altCount}). Demo may not have mounted.`);
    await browser.close();
    process.exit(1);
  }
  const lightScreen = alt.nth(1);
  const box = await lightScreen.boundingBox();
  console.log(`Light screen (alt selector) found at: ${JSON.stringify(box)}`);
  await lightScreen.screenshot({ path: outPath });
} else {
  const lightScreen = screenDivs.nth(1); // index 1 = second element = light phone
  const box = await lightScreen.boundingBox();
  if (!box) {
    console.error('ERROR: Light IosFrame screen not in viewport');
    await browser.close();
    process.exit(1);
  }
  console.log(`Light screen found at: ${JSON.stringify(box)}`);
  await lightScreen.screenshot({ path: outPath });
}

console.log(`Done. Saved to: ${outPath}`);
console.log('Expected dimensions: 390x844');

await browser.close();
