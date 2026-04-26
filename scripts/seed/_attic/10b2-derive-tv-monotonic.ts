/**
 * 10b2-derive-tv-monotonic.ts — Anchored monotonic alternative to 10b.
 *
 * 10b runs per-verse LCS over the full TV char stream. With cleaner
 * Demucs-stem transcripts that contain many common phonemes, every verse
 * matches 90–100% of its chars — but spread across the whole 400+-char
 * stream — so MAX_SPAN_RATIO=2 rejects everything ([no_detected_verses]).
 *
 * This script enforces a single forward path: each verse's LCS search
 * starts at the TV-char index where the previous detected verse ended.
 * Reordered TV cuts (chorus-first openings) are not supported here, but
 * for the common "TV is a contiguous prefix/window of the full song"
 * case, this is faster and produces tight per-verse spans.
 *
 * Usage:
 *   npx tsx scripts/seed/10b2-derive-tv-monotonic.ts --slug=<slug>
 *      [--threshold=0.4]   # min char-match fraction per verse
 *
 * Reads: data/lessons-cache/<slug>.json, data/timing-cache-tv/<slug>.json
 * Writes: data/lessons-cache-tv/<slug>.json
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, join } from "path";
import { fileURLToPath } from "url";
import { initKuroshiro, toHepburnRomaji } from "../lib/kuroshiro-tokenizer.js";
import { LessonSchema, type Lesson } from "../types/lesson.js";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const FULL_DIR = join(ROOT, "data/lessons-cache");
const TV_TIMING_DIR = join(ROOT, "data/timing-cache-tv");
const TV_OUT_DIR = join(ROOT, "data/lessons-cache-tv");

const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [[m[1], m[2]]] : [];
  })
);
const slug = args.slug;
const threshold = args.threshold ? parseFloat(args.threshold) : 0.4;
const MIN_MATCHED_CHARS = 6;
if (!slug) { console.error("usage: --slug=<slug>"); process.exit(1); }

function normRomaji(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
}

/** LCS over a tv slice [windowStart, windowEnd). Returns absolute matched tv indices. */
function lcsInWindow(verseChars: string[], tvChars: string[], windowStart: number, windowEnd: number): number[] {
  const N = verseChars.length;
  const M = windowEnd - windowStart;
  if (N === 0 || M <= 0) return [];
  const dp: Uint16Array[] = [];
  for (let i = 0; i <= N; i++) dp.push(new Uint16Array(M + 1));
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= M; j++) {
      dp[i][j] = verseChars[i - 1] === tvChars[windowStart + j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const matched: number[] = [];
  let i = N, j = M;
  while (i > 0 && j > 0) {
    if (verseChars[i - 1] === tvChars[windowStart + j - 1] && dp[i][j] === dp[i - 1][j - 1] + 1) {
      matched.push(windowStart + j - 1); i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  matched.reverse();
  return matched;
}

/** Windowed best-match: slide a window of size verseLen*WINDOW_SCALE across
 *  tvChars[cursor..], find the window with highest LCS-match fraction.
 *  Anchors per-verse spans tight (avoiding global-LCS scatter) while still
 *  tolerating WhisperX hallucinations / phoneme drift inside the window. */
function bestWindowMatch(verseChars: string[], tvChars: string[], cursor: number): { matched: number[]; pct: number; score: number } {
  const verseLen = verseChars.length;
  const winSize = Math.max(Math.ceil(verseLen * 1.6), 14);
  const stride = Math.max(1, Math.floor(verseLen / 6));
  let best = { matched: [] as number[], pct: 0, score: 0 };
  for (let start = cursor; start + Math.min(verseLen, winSize) <= tvChars.length; start += stride) {
    const end = Math.min(start + winSize, tvChars.length);
    const m = lcsInWindow(verseChars, tvChars, start, end);
    if (m.length === 0) continue;
    const pct = m.length / verseLen;
    // Density: matched chars / span. High density = tight cluster (good).
    const span = m[m.length - 1] - m[0] + 1;
    const density = m.length / span;
    // Score balances coverage and tightness — penalises sparse matches.
    const score = pct * density;
    if (score > best.score) best = { matched: m, pct, score };
    if (pct >= 0.9 && density >= 0.7) break;
  }
  return best;
}

await initKuroshiro();

const full = JSON.parse(readFileSync(join(FULL_DIR, `${slug}.json`), "utf-8")) as Lesson & {
  verses: Array<{ verse_number: number; tokens: Array<{ surface: string; reading?: string; romaji?: string }>; start_time_ms: number; end_time_ms: number }>;
  vocabulary: Array<{ surface: string; example_from_song?: string }>;
};
const tv = JSON.parse(readFileSync(join(TV_TIMING_DIR, `${slug}.json`), "utf-8")) as {
  words: Array<{ word: string; start: number; end: number }>;
};

const tvChars: string[] = [];
const tvCharToWordIdx: number[] = [];
for (let wi = 0; wi < tv.words.length; wi++) {
  const r = await toHepburnRomaji(tv.words[wi].word);
  for (const ch of normRomaji(r)) { tvChars.push(ch); tvCharToWordIdx.push(wi); }
}
console.log(`TV: ${tv.words.length} words, ${tvChars.length} chars`);

type Detected = { vno: number; tvStartIdx: number; tvEndIdx: number; matched: number; total: number };
const detected: Detected[] = [];
let cursor = 0;

for (const v of full.verses) {
  const verseChars: string[] = [];
  for (const tok of v.tokens) for (const ch of normRomaji(tok.romaji ?? tok.reading ?? tok.surface)) verseChars.push(ch);
  if (verseChars.length === 0) continue;

  const { matched, pct } = bestWindowMatch(verseChars, tvChars, cursor);
  if (matched.length < MIN_MATCHED_CHARS || pct < threshold) {
    console.log(`  v${v.verse_number} SKIP pct=${(pct * 100).toFixed(0)}% matched=${matched.length}/${verseChars.length}`);
    continue;
  }
  const tvStartIdx = matched[0];
  const tvEndIdx = matched[matched.length - 1];
  const surface = v.tokens.map((t) => t.surface).join("").slice(0, 40);
  const tvStart = tv.words[tvCharToWordIdx[tvStartIdx]].start;
  const tvEnd = tv.words[tvCharToWordIdx[tvEndIdx]].end;
  console.log(`  v${v.verse_number} OK pct=${(pct * 100).toFixed(0)}% tv=${tvStart.toFixed(2)}-${tvEnd.toFixed(2)}s | ${surface}`);
  detected.push({ vno: v.verse_number, tvStartIdx, tvEndIdx, matched: matched.length, total: verseChars.length });
  cursor = tvEndIdx + 1;
}

console.log(`\ndetected ${detected.length}/${full.verses.length} verses`);
if (detected.length === 0) { console.error("no verses detected — bailing"); process.exit(1); }

// Gap-fill timing as in 10b: each verse's end expands to midpoint of gap before next verse.
const ms = (idx: number) => Math.round(tv.words[tvCharToWordIdx[idx]].start * 1000);
const msEnd = (idx: number) => Math.round(tv.words[tvCharToWordIdx[idx]].end * 1000);
const detectedTimes = detected.map((d) => ({ vno: d.vno, startMs: ms(d.tvStartIdx), endMs: msEnd(d.tvEndIdx) }));
for (let i = 0; i < detectedTimes.length - 1; i++) {
  const mid = Math.round((detectedTimes[i].endMs + detectedTimes[i + 1].startMs) / 2);
  detectedTimes[i].endMs = mid;
  detectedTimes[i + 1].startMs = mid;
}
detectedTimes[detectedTimes.length - 1].endMs += 1000;

const detectedSet = new Set(detected.map((d) => d.vno));
const tvVerses = full.verses
  .filter((v) => detectedSet.has(v.verse_number))
  .map((v, idx) => {
    const t = detectedTimes.find((d) => d.vno === v.verse_number)!;
    return { ...v, verse_number: idx + 1, start_time_ms: t.startMs, end_time_ms: t.endMs };
  });

const detectedSurfaces = tvVerses.map((v) => v.tokens.map((t) => t.surface).join("")).join("");
const tvVocab = full.vocabulary.filter((vo) => detectedSurfaces.includes(vo.surface));

const tvLesson = { ...full, verses: tvVerses, vocabulary: tvVocab };
const parsed = LessonSchema.safeParse(tvLesson);
if (!parsed.success) {
  console.error("schema invalid:", parsed.error.errors.slice(0, 3));
  process.exit(1);
}

writeFileSync(join(TV_OUT_DIR, `${slug}.json`), JSON.stringify(tvLesson, null, 2), "utf-8");
console.log(`\nwrote data/lessons-cache-tv/${slug}.json — ${tvVerses.length} verses, ${tvVocab.length} vocab`);
process.exit(0);
