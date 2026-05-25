#!/usr/bin/env node
/**
 * gen-reel-thumbnail.cjs
 * Generates a 1080x1920 portrait thumbnail from public/thumbnails/<anime>.html
 *
 * Usage:
 *   node scripts/gen-reel-thumbnail.cjs --anime naruto --part 1
 *   node scripts/gen-reel-thumbnail.cjs --anime one-piece --part 3
 *
 * Output: videos/<anime>-quiz[-N]/thumbnail.png
 */

const { chromium } = require('playwright');
const fs   = require('fs');
const path = require('path');

const args   = process.argv.slice(2);
const getArg = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };

const animeSlug = getArg('--anime');
const partNum   = parseInt(getArg('--part') || '1', 10);

if (!animeSlug) {
  console.error('Usage: node scripts/gen-reel-thumbnail.cjs --anime <slug> --part <n>');
  process.exit(1);
}

const ROOT       = path.join(__dirname, '..');
const htmlPath   = path.join(ROOT, 'public', 'thumbnails', `${animeSlug}.html`);
const folderName = partNum === 1 ? `${animeSlug}-quiz` : `${animeSlug}-quiz-${partNum}`;
const outDir     = path.join(ROOT, 'videos', folderName);
const outPath    = path.join(outDir, 'thumbnail.png');

if (!fs.existsSync(htmlPath)) {
  console.error(`✗ Template not found: ${htmlPath}`);
  process.exit(1);
}
if (!fs.existsSync(outDir)) {
  console.error(`✗ Quiz folder not found: ${outDir}`);
  process.exit(1);
}

const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

(async () => {
  const browser = await chromium.launch();
  const page    = await browser.newPage();
  await page.setViewportSize({ width: 1080, height: 1920 });

  await page.goto(fileUrl, { waitUntil: 'networkidle' });

  // Update part number if not part 1
  if (partNum > 1) {
    await page.evaluate((n) => {
      const pill = document.querySelector('.part-pill');
      if (pill) pill.textContent = `Part ${n}`;
    }, partNum);
  }

  // Make the card fill the full 1080x1920 viewport and hide the preview chrome
  await page.evaluate(() => {
    // Hide preview labels and body padding
    document.querySelectorAll('.pg-lbl, .pg-sub').forEach(el => el.style.display = 'none');
    document.body.style.cssText = 'margin:0;padding:0;background:#0E0E0E;display:block;';

    // Make the card fill the full screen
    const card = document.querySelector('.p');
    if (card) {
      card.style.cssText = `
        width: 1080px;
        height: 1920px;
        border-radius: 0;
        box-shadow: none;
        position: fixed;
        top: 0; left: 0;
      `;
    }

    // Scale up the inner content proportionally (card was 290×515, now 1080×1920)
    const scaleX = 1080 / 290;
    const scaleY = 1920 / 515;
    const scale  = Math.min(scaleX, scaleY); // ≈ 3.72

    const content = document.querySelector('.content');
    if (content) {
      content.style.transform       = `scale(${scale})`;
      content.style.transformOrigin = 'top left';
      content.style.top    = '0';
      content.style.bottom = 'auto';
      content.style.left   = '0';
      content.style.right  = 'auto';
      // Recentre: translate so it's centred in the 1080×1920 frame
      const contentW = 290 * scale;
      const contentH = 515 * scale;
      const offsetX  = (1080 - contentW) / 2;
      const offsetY  = (1920 - contentH) / 2;
      content.style.transform       = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
      content.style.transformOrigin = 'top left';
    }

    // Hide safe zone overlays
    document.querySelectorAll('.safe-top, .safe-bot').forEach(el => el.style.display = 'none');
  });

  await page.waitForTimeout(600); // let fonts / images finish

  await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
  await browser.close();

  const size = fs.statSync(outPath).size;
  console.log(`✓ thumbnail: ${outPath} (${(size / 1024).toFixed(1)} KB)`);
})().catch(e => { console.error('✗ thumbnail error:', e.message); process.exit(1); });
