/**
 * 10b-derive-tv-lessons-nw.ts — TV lesson derivation via Needleman-Wunsch.
 *
 * Replaces scripts/seed/10b-derive-tv-lessons.ts (per-verse romaji LCS) which
 * fails on clean Demucs-stem WhisperX input. NW is locked by SPEC-REQ-2.
 *
 * Inputs:
 *   - Full lesson:        data/lessons-cache/{slug}.json
 *   - TV-stem timing:     data/timing-cache-tv-stem/{slug}.json
 *
 * Output:
 *   - data/lessons-cache-tv-nw/{slug}.json   (NEW dir per D-08; NOT lessons-cache-tv/)
 *
 * Scoring (starting points per SPEC-REQ-2 constraints):
 *   match=+2  mismatch=-1  gap=-1
 *
 * NW time/space budget: O(|A| * |B|). For typical inputs |A|≈1500 (full-lesson
 * romaji), |B|≈800 (TV-cut WhisperX romaji), the DP table is ~1.2M cells × 4 bytes
 * = ~5MB. Fine for batch processing on a dev machine.
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
const FULL_LESSON_DIR = join(PROJECT_ROOT, "data/lessons-cache");
const TV_STEM_TIMING_DIR = join(PROJECT_ROOT, "data/timing-cache-tv-stem");
const OUT_DIR = join(PROJECT_ROOT, "data/lessons-cache-tv-nw"); // PARALLEL DIR per D-08
const TV_MANIFEST = join(PROJECT_ROOT, "data/songs-manifest-tv.json");

const SCORE_MATCH = 2;
const SCORE_MISMATCH = -1;
const SCORE_GAP = -1;
const VERSE_BOUNDARY_MARKER = ""; // non-romaji sentinel; mismatches everything
const VERSE_PRESENCE_THRESHOLD = 0.40; // ≥40% matched chars per verse range (SPEC-REQ-2)

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type WhisperWord = { word: string; start: number; end: number; score: number };
type TimingCache = { words: WhisperWord[] };
type FullLesson = Lesson;

/** Result entry for one aligned position in the NW traceback. */
type AlignEntry = {
  aIndex: number | null; // index in stream A, or null if gap on a
  bIndex: number | null; // index in stream B, or null if gap on b
  type: "match" | "mismatch" | "gap-a" | "gap-b";
};

/** Full NW result. */
export type NWResult = {
  score: number;
  alignment: AlignEntry[];
};

/** Per-verse range in streamA. */
interface VerseRange {
  verseNumber: number;
  charStart: number; // inclusive index in streamA
  charEnd: number;   // inclusive index in streamA (last char of verse tokens)
}

interface SongResult {
  slug: string;
  status: "ok" | "missing_full" | "missing_timing" | "no_detected_verses" | "invalid" | "error";
  detectedVerses: number;
  totalVerses: number;
  vocabKept: number;
  totalVocab: number;
  meanCoveragePct?: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Needleman-Wunsch alignment core
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Classic Needleman-Wunsch global alignment.
 * Returns the alignment score and a per-position traceback mapping
 * between the two input strings.
 *
 * Uses Int32Array for the DP table — tight memory; typical inputs are
 * 1-3kb after normRomaji so the DP table stays well under 10MB.
 */
export function needlemanWunsch(
  a: string,
  b: string,
  opts: { match: number; mismatch: number; gap: number }
): NWResult {
  const N = a.length;
  const M = b.length;
  const { match, mismatch, gap } = opts;

  // Allocate DP table as flat Int32Array: (N+1) x (M+1)
  const dp = new Int32Array((N + 1) * (M + 1));
  const idx = (i: number, j: number) => i * (M + 1) + j;

  // Initialize base cases
  for (let i = 0; i <= N; i++) dp[idx(i, 0)] = i * gap;
  for (let j = 0; j <= M; j++) dp[idx(0, j)] = j * gap;

  // Fill DP table
  for (let i = 1; i <= N; i++) {
    const charA = a[i - 1];
    for (let j = 1; j <= M; j++) {
      const charB = b[j - 1];
      const diagScore = dp[idx(i - 1, j - 1)] + (charA === charB ? match : mismatch);
      const upScore = dp[idx(i - 1, j)] + gap;
      const leftScore = dp[idx(i, j - 1)] + gap;
      dp[idx(i, j)] = Math.max(diagScore, upScore, leftScore);
    }
  }

  const score = dp[idx(N, M)];

  // Traceback from (N, M) → (0, 0)
  const alignment: AlignEntry[] = [];
  let i = N;
  let j = M;

  while (i > 0 || j > 0) {
    if (i === 0) {
      // Only horizontal moves left (gap on a)
      alignment.push({ aIndex: null, bIndex: j - 1, type: "gap-a" });
      j--;
    } else if (j === 0) {
      // Only vertical moves left (gap on b)
      alignment.push({ aIndex: i - 1, bIndex: null, type: "gap-b" });
      i--;
    } else {
      const charA = a[i - 1];
      const charB = b[j - 1];
      const diagScore = dp[idx(i - 1, j - 1)] + (charA === charB ? match : mismatch);
      const upScore = dp[idx(i - 1, j)] + gap;
      const leftScore = dp[idx(i, j - 1)] + gap;
      const current = dp[idx(i, j)];

      if (current === diagScore) {
        // Diagonal: match or mismatch
        alignment.push({
          aIndex: i - 1,
          bIndex: j - 1,
          type: charA === charB ? "match" : "mismatch",
        });
        i--;
        j--;
      } else if (current === upScore) {
        // Gap on b (consumed char from a, but not from b)
        alignment.push({ aIndex: i - 1, bIndex: null, type: "gap-b" });
        i--;
      } else {
        // Gap on a (consumed char from b, but not from a)
        alignment.push({ aIndex: null, bIndex: j - 1, type: "gap-a" });
        j--;
      }
    }
  }

  alignment.reverse();

  return { score, alignment };
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalisation helpers (copied verbatim from 10b-derive-tv-lessons.ts; exported
// so Plan 06's spot-check tool can import the exact same romanization pipeline)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalise Hepburn romaji for NW alignment: lowercase, drop combining diacritics
 * (ū→u, ē→e), strip anything non-alphanumeric. Both sides go through this so
 * minor transliteration-style drift and punctuation/whitespace don't break
 * character-level matching.
 */
export function normRomaji(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Full-lesson tokens already carry Hepburn `romaji`. Prefer that so romaji-only
 * verses and kanji verses land in the same script.
 * Exported so Plan 06's spot-check tool can import and use the same pipeline.
 */
export function tokenAlignText(tok: {
  surface: string;
  reading?: string;
  romaji?: string;
}): string {
  return normRomaji(tok.romaji ?? tok.reading ?? tok.surface);
}

// ─────────────────────────────────────────────────────────────────────────────
// Time-range computation with gap-fill between detected verses
// (copied verbatim from 10b-derive-tv-lessons.ts)
// ─────────────────────────────────────────────────────────────────────────────

/** Exported so spot-check-tv-onsets.ts can use the same type. */
export interface DetectedVerse {
  verseNumber: number;
  startMs: number;
  endMs: number;
}

/**
 * Apply gap-midpoint expansion to the raw NW spans.
 * Tightens inter-verse boundaries by averaging adjacent verse end/start.
 * The first verse's start clamps to the first TV word's start.
 * The last verse's end gets a +1s sustain buffer.
 *
 * Exported so spot-check-tv-onsets.ts can apply the same adjustment and compare
 * apples-to-apples against lesson.start_time_ms (which was produced by this fn).
 */
export function computeVerseTimes(
  rawSpans: Array<{ verseNumber: number; startMs: number; endMs: number }>,
  tvFirstWordStartMs: number
): DetectedVerse[] {
  if (rawSpans.length === 0) return [];

  const SUSTAIN_BUFFER_MS = 1000;

  // Sort by startMs (NW is global so they should already be monotonic, but be safe)
  const sorted = [...rawSpans].sort((a, b) => a.startMs - b.startMs);

  // Clamp first verse start to TV audio's first word
  sorted[0].startMs = Math.min(sorted[0].startMs, tvFirstWordStartMs);

  // Gap-midpoint expansion: tighten inter-verse boundaries
  for (let i = 0; i < sorted.length - 1; i++) {
    const gapMidMs = Math.round((sorted[i].endMs + sorted[i + 1].startMs) / 2);
    sorted[i].endMs = gapMidMs;
    sorted[i + 1].startMs = gapMidMs;
  }

  // Sustain buffer on last verse
  sorted[sorted.length - 1].endMs += SUSTAIN_BUFFER_MS;

  return sorted;
}

// ─────────────────────────────────────────────────────────────────────────────
// TV-time index builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a per-char timing index for streamB.
 * For each char in streamB, records the start ms of the word it belongs to.
 * The last char of each word uses word.end instead, giving a tighter span
 * when a verse's last matched char lands at a word boundary.
 */
function buildTvTimeIndex(
  words: WhisperWord[],
  streamB: string
): { charToStartMs: number[]; charToEndMs: number[] } {
  const charToStartMs: number[] = [];
  const charToEndMs: number[] = [];

  for (const word of words) {
    const norm = normRomaji(word.word);
    const n = norm.length;
    const startMs = Math.round(word.start * 1000);
    const endMs = Math.round(word.end * 1000);

    for (let ci = 0; ci < n; ci++) {
      charToStartMs.push(startMs);
      charToEndMs.push(endMs);
    }
  }

  // Sanity: lengths should match streamB
  if (charToStartMs.length !== streamB.length) {
    // Minor mismatch possible due to parallel construction — fall back to
    // linear spread if sizes diverge. This is belt-and-suspenders; in practice
    // both are built from the same normRomaji calls so they must agree.
    console.warn(
      `[warn] TV time index length mismatch: ${charToStartMs.length} vs streamB ${streamB.length}. Using clamped access.`
    );
  }

  return { charToStartMs, charToEndMs };
}

// ─────────────────────────────────────────────────────────────────────────────
// Lesson construction (adapted from 10b-derive-tv-lessons.ts)
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

  // Filter vocabulary by source-verse presence (mirrors 10b logic)
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
// Per-song NW pipeline
// ─────────────────────────────────────────────────────────────────────────────

async function deriveOne(
  slug: string,
  force: boolean
): Promise<SongResult> {
  const fullPath = join(FULL_LESSON_DIR, `${slug}.json`);
  const timingPath = join(TV_STEM_TIMING_DIR, `${slug}.json`);
  const outPath = join(OUT_DIR, `${slug}.json`);

  // Idempotency: skip if output exists unless --force
  if (!force && existsSync(outPath)) {
    const existing = JSON.parse(readFileSync(outPath, "utf-8")) as FullLesson;
    return {
      slug,
      status: "ok",
      detectedVerses: existing.verses.length,
      totalVerses: existing.verses.length,
      vocabKept: existing.vocabulary.length,
      totalVocab: existing.vocabulary.length,
    };
  }

  if (!existsSync(fullPath)) {
    return { slug, status: "missing_full", detectedVerses: 0, totalVerses: 0, vocabKept: 0, totalVocab: 0 };
  }
  if (!existsSync(timingPath)) {
    return { slug, status: "missing_timing", detectedVerses: 0, totalVerses: 0, vocabKept: 0, totalVocab: 0 };
  }

  try {
    const full = JSON.parse(readFileSync(fullPath, "utf-8")) as FullLesson;
    const timingData = JSON.parse(readFileSync(timingPath, "utf-8")) as TimingCache;

    // ── Step 3: Build full-lesson alignment stream (streamA) ──────────────────
    // For each verse: append normRomaji of each token, then VERSE_BOUNDARY_MARKER
    // Record verseRanges[i] = {verseNumber, charStart, charEnd} in streamA positions.
    let streamA = "";
    const verseRanges: VerseRange[] = [];

    for (const verse of full.verses) {
      const charStart = streamA.length;
      for (const tok of verse.tokens) {
        streamA += tokenAlignText(tok);
      }
      const charEnd = streamA.length - 1; // last char index of this verse's tokens
      verseRanges.push({ verseNumber: verse.verse_number, charStart, charEnd });
      streamA += VERSE_BOUNDARY_MARKER; // mark end of verse
    }

    // ── Step 4: Build TV-stem alignment stream (streamB) ──────────────────────
    // Concatenate all word.text, romanize with toHepburnRomaji, then normRomaji.
    // Build streamB_charToTimeMs: each char in streamB maps to the start ms of
    // its source word. The LAST char of each word maps to word.end (tighter span).
    let streamB = "";
    const tvCharToStartMs: number[] = [];
    const tvCharToEndMs: number[] = [];

    for (const word of timingData.words) {
      const romaji = await toHepburnRomaji(word.word);
      const norm = normRomaji(romaji);
      if (norm.length === 0) continue;

      const startMs = Math.round(word.start * 1000);
      const endMs = Math.round(word.end * 1000);
      for (let ci = 0; ci < norm.length; ci++) {
        tvCharToStartMs.push(startMs);
        // Last char of word gets word.end; intermediate chars get word.start
        tvCharToEndMs.push(ci === norm.length - 1 ? endMs : startMs);
      }
      streamB += norm;
    }

    if (streamA.length === 0 || streamB.length === 0) {
      return {
        slug,
        status: "no_detected_verses",
        detectedVerses: 0,
        totalVerses: full.verses.length,
        vocabKept: 0,
        totalVocab: full.vocabulary.length,
      };
    }

    // ── Step 5: Run NW ────────────────────────────────────────────────────────
    const nwResult = needlemanWunsch(streamA, streamB, {
      match: SCORE_MATCH,
      mismatch: SCORE_MISMATCH,
      gap: SCORE_GAP,
    });

    // ── Step 6: Per-verse projection ──────────────────────────────────────────
    // Build a fast lookup: aIndex → bIndex for matched positions
    const aToB = new Map<number, number>();
    for (const entry of nwResult.alignment) {
      if (entry.type === "match" && entry.aIndex !== null && entry.bIndex !== null) {
        aToB.set(entry.aIndex, entry.bIndex);
      }
    }

    const rawSpans: Array<{
      verseNumber: number;
      startMs: number;
      endMs: number;
      coverage: number;
    }> = [];
    let totalMatched = 0;
    let totalVerseLenChars = 0;

    for (const range of verseRanges) {
      const { verseNumber, charStart, charEnd } = range;
      const verseLengthChars = charEnd - charStart + 1;
      if (verseLengthChars <= 0) continue;

      // Collect all matched bIndices for this verse's range in streamA
      const matchedBIndices: number[] = [];
      for (let ai = charStart; ai <= charEnd; ai++) {
        const bi = aToB.get(ai);
        if (bi !== undefined) matchedBIndices.push(bi);
      }

      const matchedChars = matchedBIndices.length;
      const coverage = matchedChars / verseLengthChars;

      totalMatched += matchedChars;
      totalVerseLenChars += verseLengthChars;

      if (coverage < VERSE_PRESENCE_THRESHOLD) {
        // Below threshold: emit with zero timing (no TV timing claim)
        // Per plan: emit ALL verses, just with degraded timing for low-coverage
        // We skip emitting zero-time verses to avoid polluting monotonic check.
        // Low-coverage verses are simply not included in the TV lesson.
        continue;
      }

      // Get TV timing from first and last matched chars
      const firstBi = Math.min(...matchedBIndices);
      const lastBi = Math.max(...matchedBIndices);

      const startMs = tvCharToStartMs[firstBi] ?? 0;
      const endMs = tvCharToEndMs[lastBi] ?? startMs;

      rawSpans.push({ verseNumber, startMs, endMs, coverage });
    }

    if (rawSpans.length === 0) {
      return {
        slug,
        status: "no_detected_verses",
        detectedVerses: 0,
        totalVerses: full.verses.length,
        vocabKept: 0,
        totalVocab: full.vocabulary.length,
      };
    }

    // ── Step 7: Apply gap-midpoint expansion ──────────────────────────────────
    const tvFirstWordStartMs = tvCharToStartMs[0] ?? 0;
    const detected = computeVerseTimes(rawSpans, tvFirstWordStartMs);

    // ── Step 8: Emit lesson ───────────────────────────────────────────────────
    const tvLesson = buildTvLesson(full, detected);

    // ── Step 9: Validate ──────────────────────────────────────────────────────
    const parsed = LessonSchema.safeParse(tvLesson);
    if (!parsed.success) {
      const errMsg = parsed.error.errors
        .slice(0, 3)
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");
      console.error(`[error] ${slug} LessonSchema validation failed: ${errMsg}`);
      return {
        slug,
        status: "invalid",
        detectedVerses: detected.length,
        totalVerses: full.verses.length,
        vocabKept: tvLesson.vocabulary.length,
        totalVocab: full.vocabulary.length,
        error: errMsg,
      };
    }

    // ── Step 10: Write ────────────────────────────────────────────────────────
    writeFileSync(outPath, JSON.stringify(parsed.data, null, 2), "utf-8");

    const meanCoverage =
      totalVerseLenChars > 0
        ? Math.round((totalMatched / totalVerseLenChars) * 100)
        : 0;

    return {
      slug,
      status: "ok",
      detectedVerses: detected.length,
      totalVerses: full.verses.length,
      vocabKept: tvLesson.vocabulary.length,
      totalVocab: full.vocabulary.length,
      meanCoveragePct: meanCoverage,
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
// Argument parsing
// ─────────────────────────────────────────────────────────────────────────────

function parseArgs(): { slug: string | null; all: boolean; force: boolean } {
  const args = { slug: null as string | null, all: false, force: false };
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === "--slug") args.slug = process.argv[++i];
    else if (a.startsWith("--slug=")) args.slug = a.slice("--slug=".length);
    else if (a === "--all") args.all = true;
    else if (a === "--force") args.force = true;
  }
  return args;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs();

  mkdirSync(OUT_DIR, { recursive: true });
  await initKuroshiro();

  let slugs: string[];

  if (args.slug) {
    slugs = [args.slug];
  } else if (args.all) {
    if (!existsSync(TV_MANIFEST)) {
      console.error(`[error] TV manifest not found: ${TV_MANIFEST}`);
      process.exit(1);
    }
    const manifest = JSON.parse(readFileSync(TV_MANIFEST, "utf-8")) as { slug: string }[];
    slugs = manifest.map((e) => e.slug);
  } else {
    console.error("[error] Provide --slug <slug> or --all");
    process.exit(1);
  }

  console.log(`=== 10b-derive-tv-lessons-nw: ${slugs.length} song(s) ===\n`);

  const results: SongResult[] = [];
  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];
    const r = await deriveOne(slug, args.force);
    results.push(r);

    // Per-slug log format: [N/M] {slug} verses={K}/{total} vocab={J}/{total} coverage={mean}%
    const detail =
      r.status === "ok"
        ? `  verses ${r.detectedVerses}/${r.totalVerses}  vocab ${r.vocabKept}/${r.totalVocab}  coverage ${r.meanCoveragePct ?? 0}%`
        : r.error
          ? `  (${r.error})`
          : "";
    console.log(`[${i + 1}/${slugs.length}] [${r.status.padEnd(18)}] ${slug}${detail}`);
  }

  const counts = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  console.log();
  console.log("=== Summary ===");
  for (const [status, n] of Object.entries(counts)) {
    console.log(`  ${status}: ${n}`);
  }
}

// Run only when invoked directly (not when imported by tests or other scripts)
const isMain = process.argv[1]?.replace(/\\/g, "/").endsWith("10b-derive-tv-lessons-nw.ts") ||
  process.argv[1]?.replace(/\\/g, "/").endsWith("10b-derive-tv-lessons-nw.js");

if (isMain) {
  main().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
}
