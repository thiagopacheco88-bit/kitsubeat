#!/usr/bin/env node
/**
 * post-reel.mjs — Deterministic Reel posting pipeline for KitsuBeat
 *
 * WHAT IT DOES (in order):
 *   1. Resolve next un-posted anime/part from catalog.json (or use --anime/--part)
 *   2. Generate audio (edge-tts + ElevenLabs) if not already done
 *   3. Generate portrait thumbnail from public/thumbnails/<anime>.html
 *   4. Render video with HyperFrames (if render doesn't exist)
 *   5. ADB push video to phone → /sdcard/Movies/kitsubeat-<anime>.mp4
 *   6. Trigger Android media scanner
 *   7. Open Instagram via Android share intent (video pre-selected)
 *   8. Print caption + instructions to terminal
 *   9. Wait for user to confirm posting done
 *  10. Mark instagram posted in catalog.json
 *
 * INSTAGRAM MUSIC:
 *   The Graph API cannot add music to Reels — it's app-only.
 *   This script opens Instagram on the connected phone with the video
 *   pre-selected via share intent. You then:
 *     → Tap "Reel" in the share sheet
 *     → Tap "Add audio" (music note icon)
 *     → Search for the track name shown in the terminal
 *     → Select it, trim if needed, tap "Share"
 *
 * USAGE:
 *   node scripts/post-reel.mjs                        # auto-pick next in queue
 *   node scripts/post-reel.mjs --anime naruto --part 1
 *   node scripts/post-reel.mjs --anime bleach --part 1 --no-render
 *   node scripts/post-reel.mjs --anime naruto --part 1 --dry-run
 *
 * FLAGS:
 *   --anime <slug>    Force a specific anime (naruto, one-piece, bleach, …)
 *   --part <n>        Force a specific part number (default: 1)
 *   --no-render       Skip rendering even if no mp4 exists (use existing render)
 *   --dry-run         Print plan only — no audio, render, or ADB calls
 *   --skip-audio      Skip audio generation (re-use existing assets/)
 *   --skip-thumbnail  Skip thumbnail regeneration
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawnSync } from 'child_process';
import { createInterface } from 'readline';
import { glob } from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args        = process.argv.slice(2);
const getArg      = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const hasFlag     = (f) => args.includes(f);

const forceAnime  = getArg('--anime');
const forcePart   = getArg('--part') ? parseInt(getArg('--part'), 10) : null;
const dryRun      = hasFlag('--dry-run');
const noRender    = hasFlag('--no-render');
const skipAudio   = hasFlag('--skip-audio');
const skipThumb   = hasFlag('--skip-thumbnail');

// ─── Load catalog ─────────────────────────────────────────────────────────────

const catalogPath = join(ROOT, 'videos', 'catalog.json');
const catalog     = JSON.parse(readFileSync(catalogPath, 'utf-8'));

// ─── Resolve target ───────────────────────────────────────────────────────────

let targetAnime, targetPart, targetEntry, targetSeries;

if (forceAnime) {
  const seriesSlug = forceAnime;
  targetSeries     = catalog[seriesSlug];
  if (!targetSeries) {
    console.error(`✗ Unknown anime slug: ${seriesSlug}`);
    console.error('  Available:', Object.keys(catalog).join(', '));
    process.exit(1);
  }
  const partN = forcePart || 1;
  targetEntry  = targetSeries.parts.find(p => p.part === partN);
  if (!targetEntry) {
    console.error(`✗ Part ${partN} not found in ${seriesSlug}`);
    process.exit(1);
  }
  targetAnime  = seriesSlug;
  targetPart   = partN;
} else {
  // Auto-pick: first part with instagram=null across all series
  outer: for (const [slug, series] of Object.entries(catalog)) {
    for (const part of series.parts) {
      if (!part.posted?.instagram) {
        targetAnime  = slug;
        targetPart   = part.part;
        targetEntry  = part;
        targetSeries = series;
        break outer;
      }
    }
  }
  if (!targetEntry) {
    console.log('🎉 All parts have been posted to Instagram!');
    process.exit(0);
  }
}

// ─── Paths ────────────────────────────────────────────────────────────────────

const folderName   = targetPart === 1 ? `${targetAnime}-quiz` : `${targetAnime}-quiz-${targetPart}`;
const quizDir      = join(ROOT, 'videos', folderName);
const rendersDir   = join(quizDir, 'renders');
const audioGenPath = join(quizDir, 'generate-audio.js');
const thumbHtml    = join(ROOT, 'public', 'thumbnails', `${targetAnime}.html`);
const thumbOut     = join(quizDir, 'thumbnail.png');
const socialPath   = join(quizDir, 'social.json');

if (!existsSync(quizDir)) {
  console.error(`✗ Quiz folder not found: ${quizDir}`);
  console.error('  Run: node scripts/create-quiz.mjs --anime ' + targetAnime + ' --part ' + targetPart);
  process.exit(1);
}

// ─── Social metadata ──────────────────────────────────────────────────────────

let social = {};
if (existsSync(socialPath)) {
  social = JSON.parse(readFileSync(socialPath, 'utf-8'));
}

const caption    = social.instagram?.caption || targetEntry.social?.instagram?.caption || '(no caption found)';
const musicTrack = targetSeries.music || '(not set — add "music" key to catalog.json)';

// ─── Print plan ───────────────────────────────────────────────────────────────

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`🦊 KitsuBeat Reel Post — ${targetSeries.label} Part ${targetPart}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`   Folder : ${folderName}`);
console.log(`   Music  : ${musicTrack}`);
console.log(`   Dry run: ${dryRun}`);
console.log('');

if (dryRun) {
  console.log('── CAPTION ──────────────────────────────────────────────────────');
  console.log(caption);
  console.log('─────────────────────────────────────────────────────────────────');
  console.log('\n[dry-run] Exiting without making changes.');
  process.exit(0);
}

// ─── Step 1: Audio generation ────────────────────────────────────────────────

if (!skipAudio && existsSync(audioGenPath)) {
  const assetsDir   = join(quizDir, 'assets');
  const audioExists = existsSync(join(assetsDir, 'q1.mp3')) &&
                      existsSync(join(assetsDir, 'q5.mp3'));
  if (audioExists) {
    console.log('⏭  Audio: already exists — skipping');
  } else {
    console.log('🔊 Generating audio...');
    const r = spawnSync('node', [audioGenPath], { stdio: 'inherit', cwd: ROOT });
    if (r.status !== 0) { console.error('✗ Audio generation failed'); process.exit(1); }
  }
} else if (skipAudio) {
  console.log('⏭  Audio: skipped (--skip-audio)');
}

// ─── Step 2: Portrait thumbnail ───────────────────────────────────────────────

if (!skipThumb) {
  if (!existsSync(thumbHtml)) {
    console.warn(`⚠  No thumbnail template found at ${thumbHtml} — skipping`);
  } else {
    console.log('🖼  Generating portrait thumbnail...');
    const r = spawnSync('node', [
      join(__dirname, 'gen-reel-thumbnail.cjs'),
      '--anime', targetAnime,
      '--part',  String(targetPart),
    ], { stdio: 'inherit', cwd: ROOT });
    if (r.status !== 0) { console.warn('⚠  Thumbnail generation failed — continuing'); }
  }
} else {
  console.log('⏭  Thumbnail: skipped (--skip-thumbnail)');
}

// ─── Step 3: Render video ─────────────────────────────────────────────────────

// Find existing render (prefer dated file, then any .mp4 that's not *_music* or *_yt*)
mkdirSync(rendersDir, { recursive: true });
let renderFile = null;
try {
  const files = execSync(`dir /b "${rendersDir}"`, { encoding: 'utf-8', shell: true })
    .split('\n').map(f => f.trim()).filter(Boolean);
  // Pick a clean render (not music embed, not yt variant)
  const clean = files.find(f => f.endsWith('.mp4') && !f.includes('_music') && !f.includes('_yt'));
  if (clean) renderFile = join(rendersDir, clean);
} catch {}

if (renderFile && noRender) {
  console.log(`⏭  Render: using existing ${renderFile}`);
} else if (renderFile) {
  console.log(`⏭  Render: existing file found — ${renderFile}`);
} else {
  console.log('🎬 Rendering video (this takes ~2-3 min)...');
  const r = spawnSync('npx', ['hyperframes', 'render'], {
    stdio: 'inherit', cwd: quizDir, shell: true,
  });
  if (r.status !== 0) { console.error('✗ Render failed'); process.exit(1); }

  // Find the new render
  const files = execSync(`dir /b "${rendersDir}"`, { encoding: 'utf-8', shell: true })
    .split('\n').map(f => f.trim()).filter(Boolean);
  const clean = files.find(f => f.endsWith('.mp4') && !f.includes('_music') && !f.includes('_yt'));
  if (clean) renderFile = join(rendersDir, clean);
}

if (!renderFile) { console.error('✗ No render file found after step'); process.exit(1); }
console.log(`✓ Video: ${renderFile}`);

// ─── Step 4: ADB push ─────────────────────────────────────────────────────────

const phoneVideoPath = `/sdcard/Movies/kitsubeat-${targetAnime}-part${targetPart}.mp4`;

console.log('\n📱 ADB: checking device...');
try {
  const devices = execSync('adb devices', { encoding: 'utf-8' });
  const connected = devices.split('\n').filter(l => l.includes('\tdevice')).length;
  if (connected === 0) throw new Error('no device');
  console.log(`✓ Device connected (${connected} device${connected > 1 ? 's' : ''})`);
} catch {
  console.error('✗ No ADB device connected. Connect your phone with USB debugging on.');
  process.exit(1);
}

console.log('📱 ADB: pushing video to phone...');
const push = spawnSync('adb', ['push', renderFile, phoneVideoPath], { stdio: 'inherit' });
if (push.status !== 0) { console.error('✗ ADB push failed'); process.exit(1); }

console.log('📱 ADB: triggering media scan...');
execSync(`adb shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file://${phoneVideoPath}`, { stdio: 'pipe' });

console.log('📱 ADB: waking phone...');
execSync('adb shell input keyevent 26');

// ─── Step 5: Open Instagram with video ────────────────────────────────────────

console.log('📱 ADB: opening Instagram share sheet with video...');
try {
  execSync(
    `adb shell am start -a android.intent.action.SEND -t video/mp4 --eu android.intent.extra.STREAM "file://${phoneVideoPath}" -f 0x00000001`,
    { stdio: 'pipe' }
  );
} catch {
  console.warn('⚠  Share intent failed — falling back to opening Instagram directly');
  execSync('adb shell am start -n com.instagram.android/.activity.MainTabActivity', { stdio: 'pipe' });
}

// ─── Step 6: Print posting instructions ──────────────────────────────────────

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 CAPTION (copy this):');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(caption);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`🎵 MUSIC: "${musicTrack}"`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\n📱 ON YOUR PHONE:');
console.log('   1. Unlock phone → share sheet should be open with the video');
console.log('   2. Tap "Instagram" → "Reel"');
console.log('   3. Tap the ♪ music icon → search "' + musicTrack + '"');
console.log('   4. Select the track → trim if needed');
console.log('   5. Paste the caption above');
console.log('   6. Tap "Share"');
console.log('');

// ─── Step 7: Wait for confirmation ────────────────────────────────────────────

const rl = createInterface({ input: process.stdin, output: process.stdout });
rl.question('✅ Press ENTER once you\'ve posted on Instagram (or type "skip" to exit without updating catalog): ', (answer) => {
  rl.close();
  if (answer.trim().toLowerCase() === 'skip') {
    console.log('Catalog not updated.');
    process.exit(0);
  }

  // ─── Step 8: Update catalog.json ──────────────────────────────────────────

  const today = new Date().toISOString().slice(0, 10);
  const freshCatalog = JSON.parse(readFileSync(catalogPath, 'utf-8'));
  const series = freshCatalog[targetAnime];
  const part   = series.parts.find(p => p.part === targetPart);

  if (!part.posted) part.posted = {};
  part.posted.instagram = { date: today };
  if (part.status !== 'posted') part.status = 'posted';

  writeFileSync(catalogPath, JSON.stringify(freshCatalog, null, 2), 'utf-8');
  console.log(`\n✅ catalog.json updated — ${targetSeries.label} Part ${targetPart} marked posted to Instagram (${today})`);
  console.log('\nNext post: run this script again to auto-pick the next in queue.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});
