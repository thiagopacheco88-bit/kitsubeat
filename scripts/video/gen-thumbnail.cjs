#!/usr/bin/env node
/**
 * gen-thumbnail.cjs
 * Generates a 1280x720 YouTube thumbnail for a quiz folder.
 * Usage: node scripts/gen-thumbnail.cjs <quizDir> <animeLabel> <partLabel> <animeLogo> <word1,word2,...>
 * Called by create-quiz.mjs
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const [, , quizDir, animeLabel, partLabel, animeLogoPath, wordsArg] = process.argv;
const words = wordsArg.split('|');

const logoExists = fs.existsSync(animeLogoPath);
const logoB64 = logoExists
  ? 'data:image/png;base64,' + fs.readFileSync(animeLogoPath).toString('base64')
  : '';

// KitsuBeat icon
const rootDir = path.join(__dirname, '..');
const iconPath = path.join(rootDir, 'public', 'apple-touch-icon.png');
const iconB64 = 'data:image/png;base64,' + fs.readFileSync(iconPath).toString('base64');

const wordsHtml = words.map(w =>
  `<div class="word">${w}</div>`
).join('');

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap" rel="stylesheet">
<style>
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
body {
  width: 1280px; height: 720px; overflow: hidden;
  background: #0E0E0E;
  font-family: Inter, system-ui, sans-serif;
  color: #F5F5F4;
  display: flex;
  align-items: stretch;
}

/* Left panel — anime logo */
.left {
  width: 480px;
  background: #111;
  border-right: 4px solid #dc2626;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 40px;
  gap: 32px;
  flex-shrink: 0;
}
.anime-logo {
  max-width: 360px;
  max-height: 220px;
  object-fit: contain;
}
.anime-logo-fallback {
  font-size: 52px;
  font-weight: 900;
  text-align: center;
  line-height: 1.1;
}
.quiz-badge {
  background: #dc2626;
  color: white;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 10px 24px;
  border-radius: 100px;
}

/* Right panel — quiz content */
.right {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 44px 48px;
  justify-content: space-between;
}
.hook {
  font-size: 56px;
  font-weight: 900;
  line-height: 1.1;
  color: #F5F5F4;
}
.hook span { color: #dc2626; }
.words-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.word {
  font-size: 32px;
  font-weight: 700;
  color: rgba(245,245,244,0.72);
  padding: 12px 20px;
  background: #191919;
  border: 1.5px solid #2A2A2A;
  border-radius: 12px;
  letter-spacing: -0.2px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}
.brand-icon {
  width: 44px; height: 44px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
}
.brand-icon img { width: 100%; height: 100%; object-fit: cover; }
.brand-url {
  font-size: 26px;
  font-weight: 800;
  color: #dc2626;
  letter-spacing: -0.3px;
}
</style>
</head>
<body>
  <div class="left">
    ${logoB64
      ? `<img class="anime-logo" src="${logoB64}" alt="${animeLabel}">`
      : `<div class="anime-logo-fallback">${animeLabel}</div>`}
    <div class="quiz-badge">Vocab Quiz · ${partLabel}</div>
  </div>
  <div class="right">
    <div class="hook">Can you get<br><span>5/5?</span></div>
    <div class="words-list">${wordsHtml}</div>
    <div class="brand">
      <div class="brand-icon"><img src="${iconB64}" alt="KitsuBeat"></div>
      <div class="brand-url">kitsubeat.com</div>
    </div>
  </div>
</body>
</html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.setContent(html, { waitUntil: 'networkidle' });

  const outPath = path.join(quizDir, 'thumbnail.png');
  await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: 1280, height: 720 } });
  await browser.close();

  const size = fs.statSync(outPath).size;
  console.log(`thumbnail: ${outPath} (${(size / 1024).toFixed(1)} KB)`);
})().catch(e => { console.error('thumbnail error:', e.message); process.exit(1); });
