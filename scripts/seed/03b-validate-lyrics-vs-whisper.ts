/**
 * 03b-validate-lyrics-vs-whisper.ts — Catch wrong / mismatched lyrics by
 * cross-checking LRCLIB / Genius output against WhisperX word output.
 *
 * Placement: runs AFTER step 3 (extract timing) and BEFORE step 4 (backfill).
 *
 * Method:
 *   For each song that has BOTH a lyrics-cache entry (source lrclib/genius/
 *   genius_canonical) and a timing-cache entry, compute the fraction of
 *   distinct kanji in raw_lyrics that also appear anywhere in the WhisperX
 *   word output. Kanji is the strongest signal — hiragana repeats across
 *   unrelated songs; a matching kanji set indicates the lyrics and audio
 *   actually describe the same content.
 *
 *   Prefers data/timing-cache-stem/ (Demucs+WhisperX, mean kCov +0.24 over
 *   raw audio) when present, falls back to data/timing-cache/ otherwise. The
 *   report records `whisper_source` per row so reviewers can distinguish
 *   stem-quality verdicts from older raw-audio verdicts.
 *
 * Decision matrix (thresholds calibrated on a 36-song sample — see
 *   scripts/seed/sample-lyrics-overlap.ts history):
 *
 *     whisper_words < MIN_WORDS_FOR_JUDGMENT  -> INSUFFICIENT_SIGNAL
 *     kCov < REJECT_KCOV                      -> REJECT
 *     REJECT_KCOV <= kCov < REVIEW_KCOV       -> REVIEW
 *     kCov >= REVIEW_KCOV                     -> ACCEPT
 *
 * Side effects (NON-DESTRUCTIVE since 0013_dual_source_lyrics):
 *   - Writes data/lyrics-validation-report.json summarising all four buckets.
 *   - Never moves files, never overwrites lyrics-cache. The dual-source DB
 *     columns (canonical_lyrics, whisper_lyrics) preserve both sources
 *     permanently, so flipping the active source is a deliberate manual or
 *     scripted DB update — not an automatic file-system mutation here.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/03b-validate-lyrics-vs-whisper.ts
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/03b-validate-lyrics-vs-whisper.ts --version tv
 */

import {
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync,
} from "fs";
import { join } from "path";

// ─────────────────────────────────────────────────────────────────────────────
// Thresholds — retightened 2026-04-24 after the 36-song calibration found
// every REVIEW-bucket song to be a false positive (low kCov caused by kanji
// density / katakana-heavy songs / Whisper garbling, not wrong lyrics).
// The single REJECT candidate was Whisper failing on screamo, not a lyric
// mismatch — so we add a distinct-word-ratio guard that catches Whisper
// self-repeating (screamo / instrumentals / bad audio) before it can flag
// correct lyrics as REJECT.
// ─────────────────────────────────────────────────────────────────────────────

const REJECT_KCOV = 0.05;
const REVIEW_KCOV = 0.25;
const MIN_WORDS_FOR_JUDGMENT = 100;
// Whisper hallucinates by repeating the same handful of words. A healthy
// transcript has ~0.30+ distinct/total; below 0.20 the output is almost
// certainly degenerate and any kCov signal is unreliable.
const MIN_DISTINCT_WORD_RATIO = 0.20;

// ─────────────────────────────────────────────────────────────────────────────
// Arg parsing — --version tv|full (default full), --dry-run
// ─────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const versionArg = (() => {
  const idx = args.indexOf("--version");
  const raw = idx !== -1 ? args[idx + 1] : null;
  if (raw === "tv" || raw === "full") return raw;
  if (raw !== null) {
    console.error(`[error] --version must be 'tv' or 'full', got: ${raw}`);
    process.exit(1);
  }
  return "full" as const;
})();
const suffix = versionArg === "tv" ? "-tv" : "";

const LYRICS_CACHE_DIR = `data/lyrics-cache${suffix}`;
const TIMING_CACHE_DIR = `data/timing-cache${suffix}`;
const TIMING_STEM_DIR = `data/timing-cache-stem${suffix}`;
const REPORT_PATH = `data/lyrics-validation-report${suffix}.json`;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Bucket = "ACCEPT" | "REVIEW" | "REJECT" | "INSUFFICIENT_SIGNAL";

interface LyricsEntry {
  slug: string;
  title?: string;
  artist?: string;
  source: string;
  raw_lyrics: string;
  synced_lrc: unknown | null;
  tokens: unknown[];
}

interface TimingEntry {
  words?: Array<{ word: string }>;
}

interface ValidationRow {
  slug: string;
  bucket: Bucket;
  source: string;
  whisper_source: "stem" | "orig";
  lyric_kanji: number;
  whisper_kanji: number;
  kanji_coverage: number;
  whisper_word_count: number;
  distinct_word_ratio: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Kanji helpers
// ─────────────────────────────────────────────────────────────────────────────

function isKanji(ch: string): boolean {
  const cp = ch.codePointAt(0) ?? 0;
  return (
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x20000 && cp <= 0x2a6df)
  );
}

function kanjiSet(text: string): Set<string> {
  const s = new Set<string>();
  for (const ch of text) if (isKanji(ch)) s.add(ch);
  return s;
}

function coverage(target: Set<string>, source: Set<string>): number {
  if (target.size === 0) return 1;
  let hit = 0;
  for (const ch of target) if (source.has(ch)) hit++;
  return hit / target.size;
}

// ─────────────────────────────────────────────────────────────────────────────
// Classification
// ─────────────────────────────────────────────────────────────────────────────

function classify(
  kCov: number,
  whisperWords: number,
  distinctRatio: number,
): Bucket {
  if (whisperWords < MIN_WORDS_FOR_JUDGMENT) return "INSUFFICIENT_SIGNAL";
  if (distinctRatio < MIN_DISTINCT_WORD_RATIO) return "INSUFFICIENT_SIGNAL";
  if (kCov < REJECT_KCOV) return "REJECT";
  if (kCov < REVIEW_KCOV) return "REVIEW";
  return "ACCEPT";
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

function main() {
  console.log("=".repeat(66));
  console.log("Lyrics ↔ WhisperX validator");
  console.log(`Version: ${versionArg}`);
  console.log(`Lyrics:  ${LYRICS_CACHE_DIR}`);
  console.log(`Timing:  ${TIMING_CACHE_DIR}`);
  console.log("=".repeat(66));

  if (!existsSync(LYRICS_CACHE_DIR)) {
    console.error(`[error] Lyrics cache dir not found: ${LYRICS_CACHE_DIR}`);
    process.exit(1);
  }
  const stemTimingExists = existsSync(TIMING_STEM_DIR);
  const origTimingExists = existsSync(TIMING_CACHE_DIR);
  if (!stemTimingExists && !origTimingExists) {
    console.error(`[error] No timing dirs found (looked at ${TIMING_STEM_DIR} and ${TIMING_CACHE_DIR})`);
    process.exit(1);
  }

  // Build set of slugs that have ANY timing on disk; remember which dir won.
  const stemFiles = stemTimingExists
    ? new Set(readdirSync(TIMING_STEM_DIR).filter((f) => f.endsWith(".json")))
    : new Set<string>();
  const origFiles = origTimingExists
    ? new Set(readdirSync(TIMING_CACHE_DIR).filter((f) => f.endsWith(".json")))
    : new Set<string>();

  const rows: ValidationRow[] = [];

  for (const lyricFile of readdirSync(LYRICS_CACHE_DIR)) {
    if (!lyricFile.endsWith(".json")) continue;

    const useStem = stemFiles.has(lyricFile);
    const useOrig = !useStem && origFiles.has(lyricFile);
    if (!useStem && !useOrig) continue;

    const slug = lyricFile.replace(/\.json$/, "");
    const lyricPath = join(LYRICS_CACHE_DIR, lyricFile);
    const timingPath = useStem
      ? join(TIMING_STEM_DIR, lyricFile)
      : join(TIMING_CACHE_DIR, lyricFile);

    let lyric: LyricsEntry;
    let timing: TimingEntry;
    try {
      lyric = JSON.parse(readFileSync(lyricPath, "utf-8")) as LyricsEntry;
      timing = JSON.parse(readFileSync(timingPath, "utf-8")) as TimingEntry;
    } catch (err) {
      console.warn(`[warn] could not parse ${slug}: ${(err as Error).message}`);
      continue;
    }

    // Skip entries that have nothing to validate:
    //   - pending_whisper: lyrics are empty by definition; step 4 will handle.
    //   - whisper: lyrics were reconstructed FROM the same whisper output,
    //     so the comparison is tautological (always 1.000).
    if (lyric.source === "pending_whisper" || lyric.source === "whisper") continue;

    const whisperWords = timing.words ?? [];
    const whisperText = whisperWords.map((w) => w.word).join("");
    const lyricK = kanjiSet(lyric.raw_lyrics ?? "");
    const whisperK = kanjiSet(whisperText);
    const kCov = coverage(lyricK, whisperK);
    const wordCount = whisperWords.length;
    const distinctWords = new Set(whisperWords.map((w) => w.word)).size;
    const distinctRatio = wordCount > 0 ? distinctWords / wordCount : 0;
    const bucket = classify(kCov, wordCount, distinctRatio);

    rows.push({
      slug,
      bucket,
      source: lyric.source,
      whisper_source: useStem ? "stem" : "orig",
      lyric_kanji: lyricK.size,
      whisper_kanji: whisperK.size,
      kanji_coverage: Math.round(kCov * 1000) / 1000,
      whisper_word_count: wordCount,
      distinct_word_ratio: Math.round(distinctRatio * 1000) / 1000,
    });
  }

  // Sort by bucket severity, then by coverage ascending so the worst are first
  const bucketOrder: Record<Bucket, number> = {
    REJECT: 0,
    REVIEW: 1,
    INSUFFICIENT_SIGNAL: 2,
    ACCEPT: 3,
  };
  rows.sort((a, b) => {
    const d = bucketOrder[a.bucket] - bucketOrder[b.bucket];
    return d !== 0 ? d : a.kanji_coverage - b.kanji_coverage;
  });

  // Counts
  const counts: Record<Bucket, number> = {
    ACCEPT: 0,
    REVIEW: 0,
    REJECT: 0,
    INSUFFICIENT_SIGNAL: 0,
  };
  for (const r of rows) counts[r.bucket]++;

  // Write report
  const report = {
    generated_at: new Date().toISOString(),
    version: versionArg,
    thresholds: {
      reject_kcov: REJECT_KCOV,
      review_kcov: REVIEW_KCOV,
      min_words_for_judgment: MIN_WORDS_FOR_JUDGMENT,
      min_distinct_word_ratio: MIN_DISTINCT_WORD_RATIO,
    },
    counts,
    total: rows.length,
    rows,
  };
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf-8");

  // Human-readable summary
  console.log();
  for (const bucket of ["REJECT", "REVIEW", "INSUFFICIENT_SIGNAL"] as const) {
    const inBucket = rows.filter((r) => r.bucket === bucket);
    if (inBucket.length === 0) continue;
    console.log(`[${bucket}] ${inBucket.length}`);
    for (const r of inBucket) {
      console.log(
        `  ${r.slug.padEnd(44)}  kCov=${r.kanji_coverage.toFixed(3)}  whWords=${String(r.whisper_word_count).padStart(4)}  distinct=${r.distinct_word_ratio.toFixed(2)}  (${r.source}/${r.whisper_source})`,
      );
    }
    console.log();
  }

  const stemRows = rows.filter((r) => r.whisper_source === "stem").length;
  const origRows = rows.filter((r) => r.whisper_source === "orig").length;

  console.log("-".repeat(66));
  console.log(
    `ACCEPT=${counts.ACCEPT}  REVIEW=${counts.REVIEW}  REJECT=${counts.REJECT}  INSUFFICIENT_SIGNAL=${counts.INSUFFICIENT_SIGNAL}  total=${rows.length}`,
  );
  console.log(
    `whisper source: stem=${stemRows} (Demucs+WhisperX, higher accuracy), orig=${origRows} (raw audio)`,
  );
  if (counts.REJECT > 0) {
    console.log(`${counts.REJECT} song(s) flagged REJECT — review report and decide whether to flip lyrics_source in DB.`);
    console.log(`This validator is non-destructive: it never moves files or overwrites lyrics-cache.`);
  }
  if (counts.REVIEW > 0) {
    console.log(`${counts.REVIEW} song(s) need manual review — see ${REPORT_PATH}`);
  }
  console.log("=".repeat(66));
}

main();
