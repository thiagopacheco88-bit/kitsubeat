import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fileUrl = 'file:///' + path.join(__dirname, 'demo-CA-hybrid.html').replace(/\\/g, '/');

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1100, height: 1100 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto(fileUrl);
await page.waitForTimeout(1500);

// Scroll the dark-theme phone's inner content to bottom so locked nodes (Side C) render
await page.evaluate(() => {
  const darkScreen = document.querySelector('[data-theme="dark"]');
  const scroller = darkScreen?.closest('div')?.parentElement?.querySelector('div[style*="overflow: auto"]') || darkScreen?.parentElement;
  // The IosFrame.content div is `position: absolute; top: 54; bottom: 34; overflow: auto`
  const allScrollers = document.querySelectorAll('div[style*="overflow"]');
  for (const s of allScrollers) {
    if (s.scrollHeight > s.clientHeight) s.scrollTop = s.scrollHeight;
  }
});
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(__dirname, 'demo-CA-hybrid-scrolled.png'), fullPage: true });

console.log('Done');
await browser.close();
