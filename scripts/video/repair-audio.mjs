#!/usr/bin/env node
/**
 * repair-audio.mjs — Fix missing TTS audio in quiz folders then re-render
 *
 * Scans all videos/*-quiz* folders for missing assets/q*.mp3 files.
 * For each affected folder:
 *   1. Runs `node generate-audio.js` (skips already-existing files)
 *   2. Deletes stale renders from renders/
 *   3. Re-renders with `npx hyperframes render`
 *   4. Updates catalog.json with new render paths
 *
 * Usage:
 *   node scripts/repair-audio.mjs              # fix all affected
 *   node scripts/repair-audio.mjs --dry-run    # preview only
 *   node scripts/repair-audio.mjs --audio-only # regenerate audio, skip re-render
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, unlinkSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

const args       = process.argv.slice(2);
const DRY_RUN    = args.includes('--dry-run');
const AUDIO_ONLY = args.includes('--audio-only');

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATALOG_PATH = join(ROOT, 'videos', 'catalog.json');

function loadCatalog() {
  return JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'));
}
function saveCatalog(catalog) {
  writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n');
}

function getMissingAudio(folder) {
  const assetsDir = join(ROOT, 'videos', folder, 'assets');
  if (!existsSync(assetsDir)) return [1, 2, 3, 4, 5]; // all missing
  const missing = [];
  for (let i = 1; i <= 5; i++) {
    if (!existsSync(join(assetsDir, `q${i}.mp3`))) missing.push(i);
  }
  return missing;
}

function getRendersDir(folder) {
  return join(ROOT, 'videos', folder, 'renders');
}

function findRenderFiles(folder) {
  const rendersDir = getRendersDir(folder);
  if (!existsSync(rendersDir)) return { music: null, yt: null, clean: null };
  const files = readdirSync(rendersDir).filter(f => f.endsWith('.mp4'));
  return {
    music: files.filter(f => f.includes('_music')).sort().pop() ?? null,
    yt:    files.filter(f => f.includes('_yt')).sort().pop()    ?? null,
    clean: files.filter(f => !f.includes('_music') && !f.includes('_yt')).sort().pop() ?? null,
  };
}

function parseFolder(folderName) {
  const m = folderName.match(/^(.+)-quiz(?:-(\d+))?$/);
  if (!m) return null;
  return { series: m[1], part: m[2] ? parseInt(m[2]) : 1 };
}

// ── Scan for affected folders ─────────────────────────────────────────────────

const videosDir = join(ROOT, 'videos');
const quizFolders = readdirSync(videosDir).filter(f => f.match(/^.+-quiz/));

const affected = [];
for (const folder of quizFolders.sort()) {
  const missing = getMissingAudio(folder);
  if (missing.length > 0) {
    affected.push({ folder, missing });
  }
}

console.log(`\n🔧 KitsuBeat Audio Repair`);
console.log(`   Affected folders: ${affected.length}`);
console.log(`   Mode: ${DRY_RUN ? 'DRY RUN' : AUDIO_ONLY ? 'audio-only (no re-render)' : 'audio + re-render'}\n`);

if (affected.length === 0) {
  console.log('✅ All folders have complete audio. Nothing to repair.');
  process.exit(0);
}

for (const { folder, missing } of affected) {
  console.log(`  ${folder}: missing q${missing.join(', q')}.mp3`);
}
console.log('');

if (!AUDIO_ONLY) {
  const MINS = affected.length * 2.5;
  console.log(`   Estimated re-render time: ~${Math.ceil(MINS / 60)}h ${Math.round(MINS % 60)}m\n`);
}

// ── Repair loop ───────────────────────────────────────────────────────────────

let audioFixed = 0;
let audioFailed = 0;
let rendered = 0;
let renderFailed = 0;
const catalog = loadCatalog();

for (let i = 0; i < affected.length; i++) {
  const { folder, missing } = affected[i];
  const folderPath = join(ROOT, 'videos', folder);
  const audioScript = join(folderPath, 'generate-audio.js');

  console.log(`\n[${i + 1}/${affected.length}] ${folder}  (missing: q${missing.join(', q')})`);

  if (!existsSync(audioScript)) {
    console.warn(`  ⚠ No generate-audio.js — skipping (re-run batch-create for this folder)`);
    audioFailed++;
    continue;
  }

  if (DRY_RUN) {
    console.log(`  [dry-run] would run: node generate-audio.js`);
    if (!AUDIO_ONLY) console.log(`  [dry-run] would delete renders/ and re-render`);
    audioFixed++;
    continue;
  }

  // ── Step 1: Regenerate missing audio ───────────────────────────────────────
  process.stdout.write(`  🎙  Generating audio...`);
  const audioResult = spawnSync('node', ['generate-audio.js'], {
    cwd: folderPath,
    stdio: 'pipe',
    encoding: 'utf-8',
    shell: false,
  });

  if (audioResult.status !== 0) {
    console.log('');
    console.error(`  ❌ Audio generation failed:`);
    if (audioResult.stderr) console.error(audioResult.stderr.slice(0, 500));
    audioFailed++;
    continue;
  }

  // Verify all 5 now exist
  const stillMissing = getMissingAudio(folder);
  if (stillMissing.length > 0) {
    console.log(` partial — still missing q${stillMissing.join(', q')}`);
    audioFailed++;
    // Continue to re-render anyway so at least partial audio works
  } else {
    console.log(' ✓');
    audioFixed++;
  }

  if (AUDIO_ONLY) continue;

  // ── Step 2: Delete stale renders ───────────────────────────────────────────
  const rendersDir = getRendersDir(folder);
  if (existsSync(rendersDir)) {
    const stale = readdirSync(rendersDir).filter(f => f.endsWith('.mp4'));
    for (const f of stale) {
      unlinkSync(join(rendersDir, f));
    }
    process.stdout.write(`  🗑  Deleted ${stale.length} stale render(s). `);
  }

  // ── Step 3: Re-render ──────────────────────────────────────────────────────
  process.stdout.write(`Re-rendering...`);
  const start = Date.now();
  const renderResult = spawnSync('npx', ['hyperframes', 'render'], {
    cwd: folderPath,
    stdio: 'pipe',
    encoding: 'utf-8',
    shell: true,
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(0);

  if (renderResult.status !== 0) {
    console.log('');
    console.error(`  ❌ Render failed after ${elapsed}s`);
    renderFailed++;
    continue;
  }

  // ── Step 4: Update catalog ─────────────────────────────────────────────────
  const renders = findRenderFiles(folder);
  const parsed  = parseFolder(folder);

  if (parsed) {
    const catalogEntry = catalog[parsed.series];
    const catalogPart  = catalogEntry?.parts?.find(p => p.part === parsed.part);
    if (catalogPart) {
      const mainRender = renders.music || renders.clean;
      if (mainRender) catalogPart.render_file       = `${folder}/renders/${mainRender}`;
      if (renders.yt)  catalogPart.render_file_yt    = `${folder}/renders/${renders.yt}`;
      if (renders.clean) catalogPart.render_file_clean = `${folder}/renders/${renders.clean}`;
      catalogPart.status = 'rendered';
      saveCatalog(catalog);
    }
  }

  console.log(` ✅ ${elapsed}s`);
  rendered++;
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n✅ Audio repair complete.`);
console.log(`   Audio fixed: ${audioFixed}   Audio failed: ${audioFailed}`);
if (!AUDIO_ONLY && !DRY_RUN) {
  console.log(`   Re-rendered: ${rendered}   Render failed: ${renderFailed}`);
}
if (audioFailed > 0 || renderFailed > 0) {
  console.log(`\n   Re-run to retry — successfully repaired folders are skipped next time.`);
}
