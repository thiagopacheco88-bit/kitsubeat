#!/usr/bin/env node
/**
 * batch-render.mjs — Render all scaffolded quiz folders to MP4
 *
 * Loops through videos/schedule.json, finds folders that have index.html
 * but no renders yet, and runs `npx hyperframes render` in each.
 *
 * Usage:
 *   node scripts/batch-render.mjs              # render all missing
 *   node scripts/batch-render.mjs --dry-run    # preview only
 *   node scripts/batch-render.mjs --anime naruto  # one series only
 *   node scripts/batch-render.mjs --from 30    # start from post #30
 *
 * Renders per folder produce:
 *   renders/<name>_music.mp4   — with baked anime OST (Instagram)
 *   renders/<name>_yt.mp4      — royalty-free audio (YouTube)
 *   renders/<name>.mp4         — clean, no audio (TikTok)
 *
 * After rendering, updates catalog.json render_file paths.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '../..');

// ── Args ─────────────────────────────────────────────────────────────────────

const args     = process.argv.slice(2);
const DRY_RUN  = args.includes('--dry-run');
const ONLY_ANIME = args.includes('--anime') ? args[args.indexOf('--anime') + 1] : null;
const FROM_POST  = args.includes('--from')  ? parseInt(args[args.indexOf('--from') + 1]) : 1;

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATALOG_PATH = join(ROOT, 'videos', 'catalog.json');

function loadCatalog() {
  return JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'));
}
function saveCatalog(catalog) {
  writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2), 'utf-8');
}

function folderName(series, part) {
  return part === 1 ? `${series}-quiz` : `${series}-quiz-${part}`;
}

function getRendersDir(folder) {
  return join(ROOT, 'videos', folder, 'renders');
}

function findRenderFiles(folder) {
  const rendersDir = getRendersDir(folder);
  if (!existsSync(rendersDir)) return { music: null, yt: null, clean: null };
  const files = readdirSync(rendersDir).filter(f => f.endsWith('.mp4'));
  return {
    music: files.find(f => f.includes('_music'))  ?? null,
    yt:    files.find(f => f.includes('_yt'))      ?? null,
    clean: files.find(f => !f.includes('_music') && !f.includes('_yt')) ?? null,
  };
}

// ── Load schedule ─────────────────────────────────────────────────────────────

const schedule = JSON.parse(readFileSync(join(ROOT, 'videos', 'schedule.json'), 'utf-8'));
const posts    = schedule.posts;

const seen  = new Set();
const tasks = [];
for (const post of posts) {
  if (post.post < FROM_POST) continue;
  const key = `${post.series}:${post.part}`;
  if (seen.has(key)) continue;
  seen.add(key);
  if (ONLY_ANIME && post.series !== ONLY_ANIME) continue;
  tasks.push({ series: post.series, part: post.part, label: post.label });
}

// ── Identify what needs rendering ─────────────────────────────────────────────

const todo = [];
const skip = [];

for (const task of tasks) {
  const folder   = folderName(task.series, task.part);
  const indexPath = join(ROOT, 'videos', folder, 'index.html');
  if (!existsSync(indexPath)) {
    skip.push({ ...task, reason: 'not scaffolded yet' });
    continue;
  }
  const renders = findRenderFiles(folder);
  if (renders.music) {
    skip.push({ ...task, reason: 'already rendered' });
  } else {
    todo.push({ ...task, folder });
  }
}

console.log(`\n🎬 KitsuBeat Batch Renderer`);
console.log(`   To render: ${todo.length}`);
console.log(`   Already done: ${skip.filter(s => s.reason === 'already rendered').length}`);
console.log(`   Not scaffolded: ${skip.filter(s => s.reason !== 'already rendered').length}`);
if (ONLY_ANIME) console.log(`   Filtered to: ${ONLY_ANIME}`);
if (DRY_RUN)    console.log(`   DRY RUN\n`);
else            console.log('');

if (todo.length === 0) {
  console.log('✅ Nothing to render.');
  process.exit(0);
}

// Estimate time
const MINS_PER_VIDEO = 3; // rough estimate
const totalMins = todo.length * MINS_PER_VIDEO;
console.log(`   Estimated time: ~${Math.ceil(totalMins / 60)}h ${totalMins % 60}m (${MINS_PER_VIDEO} min/video)\n`);

// ── Render loop ───────────────────────────────────────────────────────────────

let rendered = 0;
let failed   = 0;
const catalog = loadCatalog();

for (let i = 0; i < todo.length; i++) {
  const { series, part, label, folder } = todo[i];
  const folderPath = join(ROOT, 'videos', folder);
  console.log(`\n[${i + 1}/${todo.length}] ${label} P${part} → ${folder}`);

  if (DRY_RUN) {
    console.log(`  [dry-run] would run: npx hyperframes render in ${folder}`);
    rendered++;
    continue;
  }

  const start  = Date.now();
  const result = spawnSync('npx', ['hyperframes', 'render'], {
    cwd:      folderPath,
    stdio:    'inherit',
    encoding: 'utf-8',
    shell:    true,
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(0);

  if (result.status === 0) {
    const renders = findRenderFiles(folder);
    console.log(`  ✅ Done in ${elapsed}s`);
    if (renders.music) console.log(`     music : ${renders.music}`);
    if (renders.yt)    console.log(`     yt    : ${renders.yt}`);
    if (renders.clean) console.log(`     clean : ${renders.clean}`);

    // Update catalog render_file paths
    const catalogSeries = catalog[series];
    if (catalogSeries) {
      const catalogPart = catalogSeries.parts?.find(p => p.part === part);
      if (catalogPart) {
        if (renders.music) catalogPart.render_file    = `${folder}/renders/${renders.music}`;
        if (renders.yt)    catalogPart.render_file_yt = `${folder}/renders/${renders.yt}`;
        if (renders.clean) catalogPart.render_file_clean = `${folder}/renders/${renders.clean}`;
        catalogPart.status = 'rendered';
        saveCatalog(catalog);
      }
    }
    rendered++;
  } else {
    console.error(`  ❌ Failed (exit ${result.status}) after ${elapsed}s`);
    failed++;
  }
}

console.log(`\n✅ Batch render complete.`);
console.log(`   Rendered: ${rendered}  Failed: ${failed}`);
if (failed > 0) {
  console.log(`   Re-run to retry — already-rendered folders are skipped.`);
}
