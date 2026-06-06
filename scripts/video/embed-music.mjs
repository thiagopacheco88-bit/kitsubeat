#!/usr/bin/env node
/**
 * embed-music.mjs — Embed background music + thumbnail first frame into quiz renders
 *
 * Creates two variants per clean render:
 *   <name>_music.mp4  — with series music (Instagram / TikTok)
 *   <name>_yt.mp4     — with YouTube-safe free music
 *
 * Music config lives in catalog.json:
 *   "music"    → filename (no ext) in videos/music/  (Reels/TikTok)
 *   "yt_music" → filename (no ext) in videos/music/  (YouTube)
 *
 * USAGE:
 *   node scripts/embed-music.mjs --anime naruto
 *   node scripts/embed-music.mjs --anime naruto --part 1
 *   node scripts/embed-music.mjs --anime naruto --dry-run
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '../..');
const MUSIC_DIR = join(ROOT, 'videos', 'music');

// ─── CLI args ────────────────────────────────────────────────────────────────

const args     = process.argv.slice(2);
const getArg   = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const hasFlag  = (f) => args.includes(f);

const forceAnime = getArg('--anime');
const forcePart  = getArg('--part') ? parseInt(getArg('--part'), 10) : null;
const dryRun     = hasFlag('--dry-run');

if (!forceAnime) {
  console.error('✗ --anime <slug> is required');
  process.exit(1);
}

// ─── Load catalog ────────────────────────────────────────────────────────────

const catalog = JSON.parse(readFileSync(join(ROOT, 'videos', 'catalog.json'), 'utf-8'));
const series  = catalog[forceAnime];
if (!series) {
  console.error(`✗ Unknown anime: ${forceAnime}`);
  process.exit(1);
}

// ─── Resolve music files ─────────────────────────────────────────────────────

function findMusic(name) {
  if (!name) return null;
  // Build a flat list of {rel, full} for all files in music/ and music/free/
  const entries = [
    ...readdirSync(MUSIC_DIR)
      .filter(f => f.endsWith('.mp3'))
      .map(f => ({ rel: f, full: join(MUSIC_DIR, f) })),
    ...readdirSync(join(MUSIC_DIR, 'free'))
      .filter(f => f.endsWith('.mp3'))
      .map(f => ({ rel: join('free', f), full: join(MUSIC_DIR, 'free', f) })),
  ];
  // Match by: stem of name (strip free/ prefix) against stem of file
  const stemName = basename(name, '.mp3').replace(/^free[/\\]/, '');
  const found = entries.find(e => {
    const stemFile = basename(e.full, '.mp3');
    return stemFile === stemName || stemFile.includes(stemName) || stemName.includes(stemFile);
  });
  return found ? found.full : null;
}

const reelsMusic  = findMusic(series.music);
const ytMusic     = findMusic(series.yt_music);
const MUSIC_START = series.music_start ?? 0;

console.log(`\n🎵 ${series.label} — music embed`);
console.log(`   Reels : ${reelsMusic ? basename(reelsMusic) : '✗ not found (set "music" in catalog.json)'}`);
console.log(`   YT    : ${ytMusic    ? basename(ytMusic)    : '✗ not found (set "yt_music" in catalog.json)'}`);
console.log(`   Start : ${MUSIC_START}s`);
console.log('');

// ─── Process parts ───────────────────────────────────────────────────────────

const parts = forcePart
  ? series.parts.filter(p => p.part === forcePart)
  : series.parts;

for (const part of parts) {
  const folderName = part.part === 1 ? `${forceAnime}-quiz` : `${forceAnime}-quiz-${part.part}`;
  const quizDir    = join(ROOT, 'videos', folderName);
  const rendersDir = join(quizDir, 'renders');
  const thumbPath  = join(quizDir, 'thumbnail.png');

  if (!existsSync(rendersDir)) {
    console.log(`⚠  Part ${part.part}: renders/ not found — skipping`);
    continue;
  }

  // Find clean render (not _music, _yt, sagas, _bk)
  const cleanRender = readdirSync(rendersDir)
    .filter(f => f.endsWith('.mp4') && !/_music|_yt|sagas|_bk/.test(f))
    .sort()
    .pop(); // newest last alphabetically (date-stamped)

  if (!cleanRender) {
    console.log(`⚠  Part ${part.part}: no clean render found — skipping`);
    continue;
  }

  const inputPath  = join(rendersDir, cleanRender);
  const baseName   = cleanRender.replace(/\.mp4$/, '');

  // Get video duration
  const dur = parseFloat(
    execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${inputPath}"`).toString().trim()
  );
  const fadeStart = Math.max(0, dur - 3).toFixed(3);
  const totalDur  = (dur + 1/30).toFixed(6); // +1 thumbnail frame

  console.log(`📦 Part ${part.part}: ${cleanRender} (${dur.toFixed(1)}s)`);

  const hasThumbnail = existsSync(thumbPath);
  if (!hasThumbnail) console.warn(`   ⚠ No thumbnail.png — first frame will be raw video`);

  // Build ffmpeg command for a variant
  // Music is mixed UNDER the original voice audio (voice at 100%, music at 15%)
  function buildCmd(outputPath, musicPath) {
    if (!musicPath) return null;

    // Delay in ms for 1 thumbnail frame (only applied when thumbnail is prepended)
    const frameDelayMs = Math.round(1000 / 30);

    if (hasThumbnail) {
      // Insert thumbnail as 1 frame, then full video.
      // Voice audio is delayed by 1 frame to stay in sync.
      // Music covers the whole duration at low volume underneath.
      return [
        'ffmpeg', '-y',
        '-loop', '1', '-framerate', '30', '-t', String(1/30), '-i', thumbPath,
        '-i', inputPath,
        '-i', musicPath,
        '-filter_complex',
          `[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,format=yuv420p[thumb];` +
          `[thumb][1:v]concat=n=2:v=1:a=0[outv];` +
          `[1:a]adelay=${frameDelayMs}|${frameDelayMs},asetpts=PTS-STARTPTS[voice];` +
          `[2:a]atrim=${MUSIC_START}:${MUSIC_START + parseFloat(totalDur)},afade=t=out:st=${fadeStart}:d=3,volume=0.35,asetpts=PTS-STARTPTS[music];` +
          `[voice][music]amix=inputs=2:duration=first[outa]`,
        '-map', '[outv]',
        '-map', '[outa]',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '192k',
        '-movflags', '+faststart',
        outputPath,
      ];
    } else {
      // No thumbnail — mix music under original voice audio
      return [
        'ffmpeg', '-y',
        '-i', inputPath,
        '-i', musicPath,
        '-filter_complex',
          `[0:a]asetpts=PTS-STARTPTS[voice];` +
          `[1:a]atrim=${MUSIC_START}:${MUSIC_START + dur},afade=t=out:st=${fadeStart}:d=3,volume=0.35,asetpts=PTS-STARTPTS[music];` +
          `[voice][music]amix=inputs=2:duration=first[outa]`,
        '-map', '0:v',
        '-map', '[outa]',
        '-c:v', 'copy',
        '-c:a', 'aac', '-b:a', '192k',
        '-movflags', '+faststart',
        outputPath,
      ];
    }
  }

  // ── Reels / Instagram / TikTok variant ───────────────────────────────────
  const musicOut = join(rendersDir, `${baseName}_music.mp4`);
  const musicCmd = buildCmd(musicOut, reelsMusic);
  if (musicCmd) {
    console.log(`   🎬 Creating _music.mp4...`);
    if (dryRun) {
      console.log('   [dry-run]', musicCmd.join(' '));
    } else {
      const r = spawnSync(musicCmd[0], musicCmd.slice(1), { stdio: 'inherit' });
      if (r.status !== 0) { console.error('   ✗ _music.mp4 failed'); }
      else console.log(`   ✓ ${basename(musicOut)}`);
    }
  } else {
    console.log('   ⏭  _music.mp4 skipped (no reels music configured)');
  }

  // ── YouTube variant ───────────────────────────────────────────────────────
  const ytOut = join(rendersDir, `${baseName}_yt.mp4`);
  const ytCmd = buildCmd(ytOut, ytMusic);
  if (ytCmd) {
    console.log(`   🎬 Creating _yt.mp4...`);
    if (dryRun) {
      console.log('   [dry-run]', ytCmd.join(' '));
    } else {
      const r = spawnSync(ytCmd[0], ytCmd.slice(1), { stdio: 'inherit' });
      if (r.status !== 0) { console.error('   ✗ _yt.mp4 failed'); }
      else console.log(`   ✓ ${basename(ytOut)}`);
    }
  } else {
    console.log('   ⏭  _yt.mp4 skipped (no yt_music configured)');
  }
}

console.log('\n✅ Done.\n');
