#!/usr/bin/env node
/**
 * batch-create.mjs — Scaffold all 147 quiz folders from videos/schedule.json
 *
 * Reads the schedule, deduplicates to unique (series, part) pairs, checks
 * which folders already exist, and runs create-quiz.mjs for each missing one.
 *
 * Usage:
 *   node scripts/batch-create.mjs              # scaffold all missing
 *   node scripts/batch-create.mjs --no-audio   # skip TTS generation (faster, add audio later)
 *   node scripts/batch-create.mjs --dry-run    # preview only
 *   node scripts/batch-create.mjs --anime naruto  # one series only
 *   node scripts/batch-create.mjs --from 30    # start from post #30 in schedule
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

// ── Args ─────────────────────────────────────────────────────────────────────

const args    = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const NO_AUDIO = args.includes('--no-audio');
const ONLY_ANIME = args.includes('--anime') ? args[args.indexOf('--anime') + 1] : null;
const FROM_POST  = args.includes('--from')  ? parseInt(args[args.indexOf('--from') + 1]) : 1;

// ── Load schedule ─────────────────────────────────────────────────────────────

const schedule = JSON.parse(readFileSync(join(ROOT, 'videos', 'schedule.json'), 'utf-8'));
const posts    = schedule.posts;

// Deduplicate to unique (series, part) pairs, preserving schedule order
const seen = new Set();
const tasks = [];
for (const post of posts) {
  if (post.post < FROM_POST) continue;
  const key = `${post.series}:${post.part}`;
  if (seen.has(key)) continue;
  seen.add(key);
  if (ONLY_ANIME && post.series !== ONLY_ANIME) continue;
  tasks.push({ series: post.series, part: post.part, label: post.label });
}

// ── Check which folders already exist ─────────────────────────────────────────

function folderName(series, part) {
  return part === 1 ? `${series}-quiz` : `${series}-quiz-${part}`;
}

function folderExists(series, part) {
  const folder = join(ROOT, 'videos', folderName(series, part));
  // Consider "done" if folder has index.html AND social.json
  return existsSync(join(folder, 'index.html')) && existsSync(join(folder, 'social.json'));
}

const todo   = tasks.filter(t => !folderExists(t.series, t.part));
const done   = tasks.filter(t =>  folderExists(t.series, t.part));

console.log(`\n🦊 KitsuBeat Batch Creator`);
console.log(`   Total unique (series, part) in schedule: ${tasks.length}`);
console.log(`   Already scaffolded: ${done.length}`);
console.log(`   To create: ${todo.length}`);
if (ONLY_ANIME) console.log(`   Filtered to: ${ONLY_ANIME}`);
if (NO_AUDIO)   console.log(`   --no-audio: skipping TTS generation`);
if (DRY_RUN)    console.log(`   DRY RUN — no changes\n`);
else            console.log('');

if (todo.length === 0) {
  console.log('✅ All folders already exist. Nothing to do.');
  process.exit(0);
}

// ── Run create-quiz.mjs for each ─────────────────────────────────────────────

let created = 0;
let failed  = 0;

for (let i = 0; i < todo.length; i++) {
  const { series, part, label } = todo[i];
  const folder = folderName(series, part);
  console.log(`\n[${i + 1}/${todo.length}] ${label} P${part} → videos/${folder}`);

  if (DRY_RUN) {
    console.log(`  [dry-run] would run: node scripts/create-quiz.mjs --anime ${series} --part ${part}${NO_AUDIO ? ' --no-audio' : ''}`);
    created++;
    continue;
  }

  const scriptArgs = ['scripts/create-quiz.mjs', '--anime', series, '--part', String(part)];
  if (NO_AUDIO) scriptArgs.push('--no-audio');

  const result = spawnSync('node', scriptArgs, {
    cwd: ROOT,
    stdio: 'inherit',
    encoding: 'utf-8',
  });

  if (result.status === 0) {
    console.log(`  ✅ Done`);
    created++;
  } else {
    console.error(`  ❌ Failed (exit ${result.status})`);
    failed++;
    // Continue with next — don't abort the whole batch
  }

  // Small pause between ElevenLabs calls to stay within rate limits
  if (!NO_AUDIO && i < todo.length - 1) {
    await new Promise(r => setTimeout(r, 1000));
  }
}

console.log(`\n✅ Batch complete.`);
console.log(`   Created: ${created}  Failed: ${failed}  Skipped (existing): ${done.length}`);
if (failed > 0) {
  console.log(`\n   Re-run to retry failed ones — existing folders are skipped automatically.`);
}
