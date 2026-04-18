/**
 * 10b-derive-tv-lessons.ts — Derive TV-cut lessons from full-version lessons.
 *
 * Context:
 *   WhisperX transcriptions of TV cuts are too noisy to drive lesson generation
 *   directly (kanji substitution errors, credits/jingle pollution, etc.). But
 *   the full-version lesson — already generated with clean lyrics — contains
 *   the canonical tokens, vocabulary, and grammar_points for the song.
 *
 *   The TV cut is a subset of the full song, so a TV lesson is:
 *     • the subset of full-version verses that appear in the TV audio
 *     • those verses re-timed against the TV youtube video
 *     • vocabulary entries filtered to words that appear in detected verses
 *     • full grammar_points kept verbatim (song-wide patterns)
 *
 *   Verse detection uses global LCS alignment between the full-version char
 *   sequence and the TV WhisperX char sequence. This is monotonic and
 *   robust to WhisperX transcription errors.
 *
 * Input:
 *   - data/lessons-cache/{slug}.json      (full-version lesson — source of truth)
 *   - data/timing-cache-tv/{slug}.json    (TV WhisperX word-level timings)
 *
 * Output:
 *   - data/lessons-cache-tv/{slug}.json   (validated Lesson JSON for TV cut)
 *
 * Usage:
 *   npx tsx scripts/seed/10b-derive-tv-lessons.ts                # all 60 TV songs
 *   npx tsx scripts/seed/10b-derive-tv-lessons.ts --slug <slug>  # single song
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";

import { LessonSchema, type Lesson } from "../types/lesson.js";

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../../");
const TV_MANIFEST = join(PROJECT_ROOT, "data/songs-manifest-tv.json");
const FULL_LESSONS_DIR = join(PROJECT_ROOT, "data/lessons-cache");
const TV_TIMING_DIR = join(PROJECT_ROOT, "data/timing-cache-tv");
const TV_LESSONS_DIR = join(PROJECT_ROOT, "data/lessons-cache-tv");

/** Verse considered present in TV cut if ≥threshold of its chars aligned. */
const DEFAULT_PRESENCE_THRESHOLD = 0.4;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type WhisperWord = { word: string; start: number; end: number; score: number };
type TimingCache = { words: WhisperWord[] };
type FullLesson = Lesson; // full-version lesson has the same schema

// ─────────────────────────────────────────────────────────────────────────────
// LCS-based alignment
// ─────────────────────────────────────────────────────────────────────────────

interface VerseAlignment {
  verseNumber: number;
  matchedChars: number;
  verseLen: number;
  pct: number;
  tvStartIdx: number;
  tvEndIdx: number;
}

function alignVersesToTv(full: FullLesson, tv: TimingCache): VerseAlignment[] {
  const fullChars: string[] = [];
  const fullCharVerse: number[] = [];
  for (const v of full.verses) {
    for (const tok of v.tokens) {
      for (const ch of tok.surface) {
        fullChars.push(ch);
        fullCharVerse.push(v.verse_number);
      }
    }
  }
  const tvChars = tv.words.map((w) => w.word);

  const N = fullChars.length;
  const M = tvChars.length;
  const dp: Uint16Array[] = [];
  for (let i = 0; i <= N; i++) dp.push(new Uint16Array(M + 1));
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= M; j++) {
      dp[i][j] =
        fullChars[i - 1] === tvChars[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const tvIdxForFull: number[] = new Array(N).fill(-1);
  {
    let i = N;
    let j = M;
    while (i > 0 && j > 0) {
      if (fullChars[i - 1] === tvChars[j - 1] && dp[i][j] === dp[i - 1][j - 1] + 1) {
        tvIdxForFull[i - 1] = j - 1;
        i--;
        j--;
      } else if (dp[i - 1][j] >= dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }
  }

  const perVerse = new Map<number, VerseAlignment>();
  for (const v of full.verses) {
    const verseLen = v.tokens.map((t) => t.surface).join("").length;
    perVerse.set(v.verse_number, {
      verseNumber: v.verse_number,
      matchedChars: 0,
      verseLen,
      pct: 0,
      tvStartIdx: Number.POSITIVE_INFINITY,
      tvEndIdx: -1,
    });
  }
  for (let i = 0; i < N; i++) {
    const tvIdx = tvIdxForFull[i];
    if (tvIdx === -1) continue;
    const vNum = fullCharVerse[i];
    const a = perVerse.get(vNum)!;
    a.matchedChars++;
    if (tvIdx < a.tvStartIdx) a.tvStartIdx = tvIdx;
    if (tvIdx > a.tvEndIdx) a.tvEndIdx = tvIdx;
  }
  for (const a of perVerse.values()) a.pct = a.matchedChars / a.verseLen;
  return [...perVerse.values()];
}

// ─────────────────────────────────────────────────────────────────────────────
// Time-range computation with gap-fill between detected verses
// ─────────────────────────────────────────────────────────────────────────────

interface DetectedVerse {
  verseNumber: number;
  startMs: number;
  endMs: number;
  coverage: VerseAlignment;
}

function computeVerseTimes(
  aligned: VerseAlignment[],
  tv: TimingCache,
  presenceThreshold: number
): DetectedVerse[] {
  const detected = aligned
    .filter((a) => a.pct >= presenceThreshold && a.tvEndIdx >= 0)
    .map((a) => ({
      verseNumber: a.verseNumber,
      startMs: Math.round(tv.words[a.tvStartIdx].start * 1000),
      endMs: Math.round(tv.words[a.tvEndIdx].end * 1000),
      coverage: a,
    }))
    .sort((x, y) => x.startMs - y.startMs);

  if (detected.length === 0) return detected;

  // Fill gaps: each verse's end expands to midpoint of gap before next verse.
  // First verse's start clamps to the TV audio's first word (fine — vocal-only
  // pre-roll is rare for TV cuts). Last verse's end gets a small sustain
  // buffer (+1s) — DO NOT extend to the audio end, since WhisperX often
  // transcribes post-vocal pollution (credits, outros) that's not lyrics.
  const SUSTAIN_BUFFER_MS = 1000;

  detected[0].startMs = Math.min(detected[0].startMs, Math.round(tv.words[0].start * 1000));
  for (let i = 0; i < detected.length - 1; i++) {
    const gapMidMs = Math.round((detected[i].endMs + detected[i + 1].startMs) / 2);
    detected[i].endMs = gapMidMs;
    detected[i + 1].startMs = gapMidMs;
  }
  detected[detected.length - 1].endMs += SUSTAIN_BUFFER_MS;
  return detected;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lesson construction
// ─────────────────────────────────────────────────────────────────────────────

function buildTvLesson(full: FullLesson, detected: DetectedVerse[]): Lesson {
  const detectedMap = new Map(detected.map((d) => [d.verseNumber, d]));
  const detectedVerseNums = new Set(detected.map((d) => d.verseNumber));

  // Filter verses from full; renumber to 1..N for TV-facing display.
  const tvVerses = full.verses
    .filter((v) => detectedMap.has(v.verse_number))
    .sort(
      (a, b) =>
        detectedMap.get(a.verse_number)!.startMs -
        detectedMap.get(b.verse_number)!.startMs
    )
    .map((v, idx) => {
      const d = detectedMap.get(v.verse_number)!;
      return {
        ...v,
        verse_number: idx + 1,
        start_time_ms: d.startMs,
        end_time_ms: d.endMs,
      };
    });

  // Filter vocabulary by source-verse presence. Each full-version vocab entry
  // carries an `example_from_song` quote drawn from a specific full-verse;
  // matching that quote back to its source verse tells us whether the word's
  // original context survived in the TV cut. This sidesteps inflection entirely
  // (surface-matching citation forms like 戻る against lyric text containing
  // 戻らない would drop most verbs/adjectives). As a fallback for vocab whose
  // quote cannot be resolved to a verse, fall back to a substring check on
  // the detected TV text.
  // Normalise for quote/verse comparison: drop whitespace and punctuation
  // (example_from_song often wraps highlighted words with 'apostrophes' or
  // 「」 that are absent from verse surface text).
  const normalise = (s: string) =>
    s.replace(/[\s'"`‘’“”「」『』()（）、。・,.!?！？]/g, "");
  const verseSurfaces = full.verses.map((v) => ({
    num: v.verse_number,
    surface: normalise(v.tokens.map((t) => t.surface).join("")),
  }));
  const detectedText = tvVerses
    .map((v) => v.tokens.map((t) => t.surface).join(""))
    .join("");

  const tvVocab = full.vocabulary.filter((vocab) => {
    const quote = normalise(vocab.example_from_song ?? "");
    if (quote) {
      const source = verseSurfaces.find(
        (v) => v.surface.includes(quote) || quote.includes(v.surface)
      );
      if (source) return detectedVerseNums.has(source.num);
    }
    return detectedText.includes(vocab.surface);
  });

  return {
    jlpt_level: full.jlpt_level,
    difficulty_tier: full.difficulty_tier,
    verses: tvVerses,
    vocabulary: tvVocab,
    grammar_points: full.grammar_points, // song-wide; keep verbatim
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-song pipeline
// ─────────────────────────────────────────────────────────────────────────────

interface SongResult {
  slug: string;
  status: "ok" | "missing_full" | "missing_timing" | "no_detected_verses" | "invalid" | "error";
  detectedVerses: number;
  totalVerses: number;
  vocabKept: number;
  totalVocab: number;
  error?: string;
}

function deriveOne(slug: string, presenceThreshold: number): SongResult {
  const fullPath = join(FULL_LESSONS_DIR, `${slug}.json`);
  const timingPath = join(TV_TIMING_DIR, `${slug}.json`);
  const outPath = join(TV_LESSONS_DIR, `${slug}.json`);

  if (!existsSync(fullPath)) {
    return {
      slug,
      status: "missing_full",
      detectedVerses: 0,
      totalVerses: 0,
      vocabKept: 0,
      totalVocab: 0,
    };
  }
  if (!existsSync(timingPath)) {
    return {
      slug,
      status: "missing_timing",
      detectedVerses: 0,
      totalVerses: 0,
      vocabKept: 0,
      totalVocab: 0,
    };
  }

  try {
    const full = JSON.parse(readFileSync(fullPath, "utf-8")) as FullLesson;
    const tv = JSON.parse(readFileSync(timingPath, "utf-8")) as TimingCache;

    const aligned = alignVersesToTv(full, tv);
    const detected = computeVerseTimes(aligned, tv, presenceThreshold);

    if (detected.length === 0) {
      return {
        slug,
        status: "no_detected_verses",
        detectedVerses: 0,
        totalVerses: full.verses.length,
        vocabKept: 0,
        totalVocab: full.vocabulary.length,
      };
    }

    const tvLesson = buildTvLesson(full, detected);
    const parsed = LessonSchema.safeParse(tvLesson);
    if (!parsed.success) {
      return {
        slug,
        status: "invalid",
        detectedVerses: detected.length,
        totalVerses: full.verses.length,
        vocabKept: tvLesson.vocabulary.length,
        totalVocab: full.vocabulary.length,
        error: parsed.error.errors
          .slice(0, 3)
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join("; "),
      };
    }

    writeFileSync(outPath, JSON.stringify(parsed.data, null, 2), "utf-8");

    return {
      slug,
      status: "ok",
      detectedVerses: detected.length,
      totalVerses: full.verses.length,
      vocabKept: tvLesson.vocabulary.length,
      totalVocab: full.vocabulary.length,
    };
  } catch (err) {
    return {
      slug,
      status: "error",
      detectedVerses: 0,
      totalVerses: 0,
      vocabKept: 0,
      totalVocab: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

function parseArgs(): { slug: string | null; threshold: number } {
  const args = { slug: null as string | null, threshold: DEFAULT_PRESENCE_THRESHOLD };
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === "--slug") args.slug = process.argv[++i];
    else if (a.startsWith("--slug=")) args.slug = a.slice("--slug=".length);
    else if (a === "--threshold") args.threshold = parseFloat(process.argv[++i]);
    else if (a.startsWith("--threshold=")) args.threshold = parseFloat(a.slice("--threshold=".length));
  }
  if (!(args.threshold > 0 && args.threshold <= 1)) {
    console.error(`[error] --threshold must be in (0, 1], got: ${args.threshold}`);
    process.exit(1);
  }
  return args;
}

function main(): void {
  const args = parseArgs();
  mkdirSync(TV_LESSONS_DIR, { recursive: true });

  let slugs: string[];
  if (args.slug) {
    slugs = [args.slug];
  } else {
    if (!existsSync(TV_MANIFEST)) {
      console.error(`[error] TV manifest not found: ${TV_MANIFEST}`);
      process.exit(1);
    }
    const manifest = JSON.parse(readFileSync(TV_MANIFEST, "utf-8")) as {
      slug: string;
    }[];
    slugs = manifest.map((e) => e.slug);
  }

  console.log(`=== 10b-derive-tv-lessons: ${slugs.length} song(s), threshold=${args.threshold} ===\n`);

  const results: SongResult[] = [];
  for (const slug of slugs) {
    const r = deriveOne(slug, args.threshold);
    results.push(r);
    const detail =
      r.status === "ok"
        ? `  verses ${r.detectedVerses}/${r.totalVerses}  vocab ${r.vocabKept}/${r.totalVocab}`
        : r.error
          ? `  (${r.error})`
          : "";
    console.log(`[${r.status.padEnd(18)}] ${slug}${detail}`);
  }

  const counts = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  console.log();
  console.log(`=== Summary ===`);
  for (const [status, n] of Object.entries(counts)) {
    console.log(`  ${status}: ${n}`);
  }
}

main();
