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
import { initKuroshiro, toHepburnRomaji } from "../lib/kuroshiro-tokenizer.js";

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
  /** Char-level span of matched chars in tvChars — used to reject spurious
   *  spread matches (a verse not really in TV whose chars got stolen piecewise
   *  from across the whole transcript). */
  tvCharStartIdx: number;
  tvCharEndIdx: number;
}

/** Max ratio of matched-char tv span to verse romaji length. A verse not in
 *  the TV can still accumulate matches on common phonemes (`no`, `wa`, `ni`,
 *  vowels) — those matches spread across the whole transcript. Real matches
 *  cluster tightly. Tightened from 3.0 to 2.0 because per-verse LCS (below) is
 *  more permissive than global LCS — each verse gets its own alignment pass,
 *  so spurious matches need a stricter cutoff. */
const MAX_SPAN_RATIO = 2.0;

/** Minimum matched-char count for a verse to be considered present at all.
 *  Very short verses (or common-phoneme-only fragments) could match a few
 *  chars anywhere — require an absolute floor to reject them. */
const MIN_MATCHED_CHARS = 8;

// Normalise Hepburn romaji for LCS: lowercase, drop combining diacritics
// (ū→u, ē→e), strip anything non-alphanumeric. Both sides go through this so
// minor transliteration-style drift (Hepburn vs. loose romaji in LRCLIB) and
// punctuation/whitespace don't break character-level matching.
function normRomaji(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Full-lesson tokens already carry Hepburn `romaji`. Prefer that so romaji-only
// verses (Karada naka furuwasu…) and kanji verses land in the same script.
function tokenAlignText(tok: { surface: string; reading?: string; romaji?: string }): string {
  return normRomaji(tok.romaji ?? tok.reading ?? tok.surface);
}

/** LCS between `verseChars` and `tvChars`. Returns tv-char indices of matched
 *  chars (same length as matched count), in ascending order. Empty array if
 *  no match. Runs per-verse so each verse gets its own alignment pass,
 *  independent of what other verses match — this is what tolerates TV cuts
 *  reordering verses. The global-LCS approach forced a single forward path
 *  across the whole lesson, so a reordered verse (e.g. chorus-first cut) got
 *  silently dropped whenever it conflicted with another verse's match.
 */
function lcsMatchedIndices(verseChars: string[], tvChars: string[]): number[] {
  const N = verseChars.length;
  const M = tvChars.length;
  if (N === 0 || M === 0) return [];
  const dp: Uint16Array[] = [];
  for (let i = 0; i <= N; i++) dp.push(new Uint16Array(M + 1));
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= M; j++) {
      dp[i][j] =
        verseChars[i - 1] === tvChars[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const matched: number[] = [];
  let i = N;
  let j = M;
  while (i > 0 && j > 0) {
    if (verseChars[i - 1] === tvChars[j - 1] && dp[i][j] === dp[i - 1][j - 1] + 1) {
      matched.push(j - 1);
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  matched.reverse();
  return matched;
}

async function alignVersesToTv(full: FullLesson, tv: TimingCache): Promise<VerseAlignment[]> {
  // TV: convert each WhisperX word to normalised Hepburn romaji chars, keep
  // tvCharIdx → tvWordIdx mapping for timing lookup.
  const tvChars: string[] = [];
  const tvCharToWordIdx: number[] = [];
  for (let wi = 0; wi < tv.words.length; wi++) {
    const romaji = await toHepburnRomaji(tv.words[wi].word);
    for (const ch of normRomaji(romaji)) {
      tvChars.push(ch);
      tvCharToWordIdx.push(wi);
    }
  }

  // Per-verse LCS: each verse searches the entire tvChars stream
  // independently. Different verses may match overlapping or out-of-order
  // windows, which is correct for reordered TV cuts.
  const alignments: VerseAlignment[] = [];
  for (const v of full.verses) {
    const verseChars: string[] = [];
    for (const tok of v.tokens) {
      for (const ch of tokenAlignText(tok)) verseChars.push(ch);
    }
    const verseLen = verseChars.length;

    const matched = lcsMatchedIndices(verseChars, tvChars);
    if (matched.length === 0) {
      alignments.push({
        verseNumber: v.verse_number,
        matchedChars: 0,
        verseLen,
        pct: 0,
        tvStartIdx: Number.POSITIVE_INFINITY,
        tvEndIdx: -1,
        tvCharStartIdx: Number.POSITIVE_INFINITY,
        tvCharEndIdx: -1,
      });
      continue;
    }

    const tvCharStart = matched[0];
    const tvCharEnd = matched[matched.length - 1];
    const tvWordStart = tvCharToWordIdx[tvCharStart];
    const tvWordEnd = tvCharToWordIdx[tvCharEnd];

    alignments.push({
      verseNumber: v.verse_number,
      matchedChars: matched.length,
      verseLen,
      pct: verseLen > 0 ? matched.length / verseLen : 0,
      tvStartIdx: tvWordStart,
      tvEndIdx: tvWordEnd,
      tvCharStartIdx: tvCharStart,
      tvCharEndIdx: tvCharEnd,
    });
  }

  return alignments;
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
    .filter((a) => {
      if (a.pct < presenceThreshold || a.tvEndIdx < 0) return false;
      // Absolute floor: short matches on common phonemes are untrustworthy
      // regardless of percentage — a 5/10 match on `no/wa/ni/a/i` could hit
      // anywhere. Require a real char count.
      if (a.matchedChars < MIN_MATCHED_CHARS) return false;
      // Reject spurious spread matches: char-level span must be a small
      // multiple of the verse's own length.
      const spanChars = a.tvCharEndIdx - a.tvCharStartIdx + 1;
      if (a.verseLen > 0 && spanChars / a.verseLen > MAX_SPAN_RATIO) return false;
      return true;
    })
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

async function deriveOne(slug: string, presenceThreshold: number): Promise<SongResult> {
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

    const aligned = await alignVersesToTv(full, tv);
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

async function main(): Promise<void> {
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

  await initKuroshiro();

  const results: SongResult[] = [];
  for (const slug of slugs) {
    const r = await deriveOne(slug, args.threshold);
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

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
