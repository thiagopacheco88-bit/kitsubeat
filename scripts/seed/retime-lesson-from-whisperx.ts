/**
 * retime-lesson-from-whisperx.ts — Re-derive verse start_time_ms / end_time_ms
 * for a lesson by LCS-aligning verse text to the WhisperX word sequence.
 *
 * Why this exists: lesson generators (Claude inline) sometimes produce synthetic
 * round-number verse timings (0, 14000, 28000, ...) when WhisperX coverage is
 * incomplete or when canonical lyrics don't line up 1:1 with WhisperX text.
 * This pass replaces those with real WhisperX-derived timings via character-
 * level LCS, similar to 10b-derive-tv-lessons.ts.
 *
 * For verses BEFORE the first WhisperX-aligned char (intro vocals WhisperX
 * missed), we estimate by extrapolating backward at the average char-per-second
 * rate of the first 5 successfully-aligned verses.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/retime-lesson-from-whisperx.ts <slug>
 *   npx tsx ... retime-lesson-from-whisperx.ts <slug> --dry-run
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const slug = process.argv[2];
const dryRun = process.argv.includes("--dry-run");
if (!slug) { console.error("usage: retime-lesson-from-whisperx.ts <slug> [--dry-run]"); process.exit(1); }

const lessonPath = resolve(`data/lessons-cache/${slug}.json`);
const timingPath = resolve(`data/timing-cache/${slug}.json`);
const lesson = JSON.parse(readFileSync(lessonPath, "utf-8"));
const timing = JSON.parse(readFileSync(timingPath, "utf-8"));

interface CharTime { ch: string; startMs: number; endMs: number; }

// Flatten WhisperX words into a per-character timing array
const whisperChars: CharTime[] = [];
for (const w of timing.words as Array<{ word: string; start: number; end: number }>) {
  const chars = [...w.word].filter((c) => c.trim());
  if (!chars.length) continue;
  const dur = (w.end - w.start) / chars.length;
  chars.forEach((ch, i) => {
    whisperChars.push({ ch, startMs: Math.round((w.start + dur * i) * 1000), endMs: Math.round((w.start + dur * (i + 1)) * 1000) });
  });
}
console.log(`[retime] WhisperX char count: ${whisperChars.length}, first char @ ${whisperChars[0]?.startMs}ms, last @ ${whisperChars.at(-1)?.endMs}ms`);

// LCS char alignment: for each verse, find the contiguous WhisperX char range
// whose chars best match the verse's tokens (concatenated). Use a greedy
// monotonic walk: track a cursor into whisperChars; for each verse, scan forward
// to find a window whose char-set overlap with the verse text is maximal.
function verseChars(v: any): string[] {
  const text = (v.tokens as Array<{ surface: string }>).map((t) => t.surface).join("");
  return [...text].filter((c) => c.trim());
}

const verseAlignments: Array<{ verse: any; firstIdx: number; lastIdx: number }> = [];
let cursor = 0;
for (const v of lesson.verses) {
  const vChars = verseChars(v);
  if (!vChars.length) { verseAlignments.push({ verse: v, firstIdx: -1, lastIdx: -1 }); continue; }

  // Slide a window of length ~vChars.length × 1.5 starting at cursor; pick window with best char-set overlap
  const windowLen = Math.min(whisperChars.length - cursor, Math.max(20, Math.round(vChars.length * 1.5)));
  if (windowLen <= 0) { verseAlignments.push({ verse: v, firstIdx: -1, lastIdx: -1 }); continue; }

  const vSet = new Set(vChars);
  let bestStart = -1, bestScore = -1, bestEnd = -1;
  // Try several window starts within next 50 chars from cursor
  const tryStarts = Math.min(50, whisperChars.length - cursor);
  for (let s = 0; s < tryStarts; s++) {
    const wStart = cursor + s;
    const wEnd = Math.min(whisperChars.length, wStart + windowLen);
    let score = 0;
    for (let i = wStart; i < wEnd; i++) if (vSet.has(whisperChars[i].ch)) score++;
    if (score > bestScore) { bestScore = score; bestStart = wStart; bestEnd = wEnd; }
  }

  if (bestScore >= Math.max(2, Math.floor(vChars.length * 0.3))) {
    // Tighten the window: find first/last matching chars within best window
    let firstMatch = -1, lastMatch = -1;
    for (let i = bestStart; i < bestEnd; i++) {
      if (vSet.has(whisperChars[i].ch)) {
        if (firstMatch === -1) firstMatch = i;
        lastMatch = i;
      }
    }
    verseAlignments.push({ verse: v, firstIdx: firstMatch, lastIdx: lastMatch });
    cursor = lastMatch + 1;
  } else {
    verseAlignments.push({ verse: v, firstIdx: -1, lastIdx: -1 });
  }
}

// Compute new timings
const newTimings = verseAlignments.map(({ verse, firstIdx, lastIdx }) => {
  if (firstIdx === -1) return { verse_number: verse.verse_number, start_time_ms: null, end_time_ms: null, source: "unaligned" };
  return {
    verse_number: verse.verse_number,
    start_time_ms: whisperChars[firstIdx].startMs,
    end_time_ms: whisperChars[lastIdx].endMs,
    source: "whisperx-lcs",
  };
});

// Estimate timings for unaligned verses: extrapolate from neighboring aligned verses
const aligned = newTimings.filter((t) => t.start_time_ms !== null);
if (aligned.length >= 2) {
  const totalAlignedChars = lesson.verses
    .filter((v: any, i: number) => newTimings[i].start_time_ms !== null)
    .reduce((sum: number, v: any) => sum + verseChars(v).length, 0);
  const totalAlignedMs = aligned[aligned.length - 1].end_time_ms! - aligned[0].start_time_ms!;
  const msPerChar = totalAlignedMs / totalAlignedChars;
  console.log(`[retime] estimated ${msPerChar.toFixed(2)}ms/char from ${aligned.length} aligned verses`);

  // Backfill unaligned verses by walking outward from aligned anchors
  for (let i = 0; i < newTimings.length; i++) {
    if (newTimings[i].start_time_ms !== null) continue;
    const verse = lesson.verses[i];
    const vLen = verseChars(verse).length;
    // Find nearest aligned neighbor
    let prevAligned = i - 1;
    while (prevAligned >= 0 && newTimings[prevAligned].start_time_ms === null) prevAligned--;
    let nextAligned = i + 1;
    while (nextAligned < newTimings.length && newTimings[nextAligned].start_time_ms === null) nextAligned++;
    if (prevAligned >= 0) {
      const start = newTimings[prevAligned].end_time_ms! + 100;
      newTimings[i].start_time_ms = start;
      newTimings[i].end_time_ms = Math.round(start + vLen * msPerChar);
      newTimings[i].source = "extrapolated-forward";
    } else if (nextAligned < newTimings.length) {
      // Extrapolate backward from next aligned verse
      const end = newTimings[nextAligned].start_time_ms! - 100;
      const start = Math.max(0, Math.round(end - vLen * msPerChar));
      newTimings[i].start_time_ms = start;
      newTimings[i].end_time_ms = end;
      newTimings[i].source = "extrapolated-backward";
    }
  }
}

console.log("\n[retime] new verse timings:");
console.table(newTimings.map((t, i) => ({
  v: t.verse_number,
  old_start: lesson.verses[i].start_time_ms,
  new_start: t.start_time_ms,
  new_end: t.end_time_ms,
  source: t.source,
})));

if (dryRun) { console.log("\n[retime] dry-run; not writing"); process.exit(0); }

// Apply
for (let i = 0; i < lesson.verses.length; i++) {
  const t = newTimings[i];
  if (t.start_time_ms !== null) {
    lesson.verses[i].start_time_ms = t.start_time_ms;
    lesson.verses[i].end_time_ms = t.end_time_ms;
  }
}
writeFileSync(lessonPath, JSON.stringify(lesson, null, 2), "utf-8");
console.log(`[retime] wrote ${lessonPath}`);
