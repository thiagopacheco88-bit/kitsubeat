/**
 * 03c-validate-tv-vs-canonical.ts — kCov gate for TV cohort.
 *
 * Why a separate script: 03b-validate-lyrics-vs-whisper.ts compares
 * lyrics-cache vs timing-cache for the same version. On the TV side every
 * lyrics-cache-tv file has source="whisper" (lyrics were reconstructed FROM
 * the WhisperX transcript), so 03b's kCov check is tautological and skipped
 * by design.
 *
 * The right TV-side question is: does the TV WhisperX transcript contain a
 * subset of the canonical (lrclib / genius) lyrics from the full-version
 * cache? A near-zero kCov here flags either (a) wrong youtube_id pointing
 * to a different song, (b) a karaoke/instrumental upload, or (c) WhisperX
 * failing the language.
 *
 * Method:
 *   target_kanji = kanji set from data/lyrics-cache/{slug}.json (canonical)
 *   source_kanji = kanji set from data/timing-cache-tv-stem/{slug}.json (TV WhisperX)
 *   kCov = |target ∩ source| / |target|
 *
 * Buckets reuse 03b thresholds (calibrated on full-version):
 *   kCov < 0.05  → REJECT
 *   kCov < 0.25  → REVIEW
 *   kCov >= 0.25 → ACCEPT
 *   word_count < 100 OR distinct_ratio < 0.20 → INSUFFICIENT_SIGNAL
 *
 * Output: data/lyrics-validation-report-tv-canonical.json
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/03c-validate-tv-vs-canonical.ts
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

const REJECT_KCOV = 0.05;
const REVIEW_KCOV = 0.25;
const MIN_WORDS_FOR_JUDGMENT = 100;
const MIN_DISTINCT_WORD_RATIO = 0.20;

const CANONICAL_LYRICS_DIR = "data/lyrics-cache";       // full-version canonical
const TV_STEM_DIR = "data/timing-cache-tv-stem";        // TV WhisperX (Demucs stem)
const TV_RAW_DIR = "data/timing-cache-tv";              // TV WhisperX (raw audio fallback)
const REPORT_PATH = "data/lyrics-validation-report-tv-canonical.json";

type Bucket = "ACCEPT" | "REVIEW" | "REJECT" | "INSUFFICIENT_SIGNAL";

interface CanonicalLyric {
  source?: string;
  raw_lyrics?: string;
}

interface TimingEntry {
  words?: Array<{ word: string }>;
}

interface ValidationRow {
  slug: string;
  bucket: Bucket;
  canonical_source: string;
  whisper_source: "stem" | "raw";
  canonical_kanji: number;
  whisper_kanji: number;
  kanji_coverage: number;
  whisper_word_count: number;
  distinct_word_ratio: number;
}

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

function classify(kCov: number, wc: number, distinct: number): Bucket {
  if (wc < MIN_WORDS_FOR_JUDGMENT) return "INSUFFICIENT_SIGNAL";
  if (distinct < MIN_DISTINCT_WORD_RATIO) return "INSUFFICIENT_SIGNAL";
  if (kCov < REJECT_KCOV) return "REJECT";
  if (kCov < REVIEW_KCOV) return "REVIEW";
  return "ACCEPT";
}

function main() {
  console.log("=".repeat(66));
  console.log("TV WhisperX ↔ canonical full-version lyrics validator");
  console.log(`Canonical: ${CANONICAL_LYRICS_DIR}`);
  console.log(`TV stem:   ${TV_STEM_DIR}`);
  console.log(`TV raw:    ${TV_RAW_DIR}`);
  console.log("=".repeat(66));

  if (!existsSync(CANONICAL_LYRICS_DIR)) {
    console.error(`[error] canonical lyrics dir missing: ${CANONICAL_LYRICS_DIR}`);
    process.exit(1);
  }

  const stemFiles = existsSync(TV_STEM_DIR)
    ? new Set(readdirSync(TV_STEM_DIR).filter((f) => f.endsWith(".json")))
    : new Set<string>();
  const rawFiles = existsSync(TV_RAW_DIR)
    ? new Set(readdirSync(TV_RAW_DIR).filter((f) => f.endsWith(".json")))
    : new Set<string>();

  if (stemFiles.size === 0 && rawFiles.size === 0) {
    console.error("[error] no TV timing files found.");
    process.exit(1);
  }

  // Iterate every TV-version song; pair it with canonical lyrics from the
  // full-version cache. If no canonical lyrics exist for a TV slug, skip with
  // a note (catalog gap).
  const candidateSlugs = Array.from(new Set([...stemFiles, ...rawFiles])).sort();

  const rows: ValidationRow[] = [];
  let missingCanonical = 0;
  let canonicalIsWhisper = 0;

  for (const file of candidateSlugs) {
    const slug = file.replace(/\.json$/, "");
    const canonicalPath = join(CANONICAL_LYRICS_DIR, file);
    if (!existsSync(canonicalPath)) {
      missingCanonical++;
      continue;
    }

    const canonical = JSON.parse(readFileSync(canonicalPath, "utf-8")) as CanonicalLyric;
    const canonicalSource = canonical.source ?? "unknown";

    // If the full-version lyrics are themselves Whisper-reconstructed, the
    // comparison would be against WhisperX-vs-WhisperX (cross-version) — still
    // worth a check but flagged separately.
    const isWhisperCanonical = canonicalSource === "whisper" || canonicalSource === "pending_whisper";
    if (isWhisperCanonical) canonicalIsWhisper++;

    const useStem = stemFiles.has(file);
    const timingPath = useStem ? join(TV_STEM_DIR, file) : join(TV_RAW_DIR, file);
    let timing: TimingEntry;
    try {
      timing = JSON.parse(readFileSync(timingPath, "utf-8")) as TimingEntry;
    } catch (err) {
      console.warn(`[warn] could not parse TV timing for ${slug}: ${(err as Error).message}`);
      continue;
    }

    const words = timing.words ?? [];
    const whisperText = words.map((w) => w.word).join("");
    const canonicalK = kanjiSet(canonical.raw_lyrics ?? "");
    const whisperK = kanjiSet(whisperText);
    const kCov = coverage(canonicalK, whisperK);
    const wc = words.length;
    const distinctWords = new Set(words.map((w) => w.word)).size;
    const distinctRatio = wc > 0 ? distinctWords / wc : 0;
    const bucket = classify(kCov, wc, distinctRatio);

    rows.push({
      slug,
      bucket,
      canonical_source: canonicalSource,
      whisper_source: useStem ? "stem" : "raw",
      canonical_kanji: canonicalK.size,
      whisper_kanji: whisperK.size,
      kanji_coverage: Math.round(kCov * 1000) / 1000,
      whisper_word_count: wc,
      distinct_word_ratio: Math.round(distinctRatio * 1000) / 1000,
    });
  }

  const order: Record<Bucket, number> = { REJECT: 0, REVIEW: 1, INSUFFICIENT_SIGNAL: 2, ACCEPT: 3 };
  rows.sort((a, b) => order[a.bucket] - order[b.bucket] || a.kanji_coverage - b.kanji_coverage);

  const counts: Record<Bucket, number> = { ACCEPT: 0, REVIEW: 0, REJECT: 0, INSUFFICIENT_SIGNAL: 0 };
  for (const r of rows) counts[r.bucket]++;

  console.log();
  console.log("-".repeat(66));
  console.log(
    `ACCEPT=${counts.ACCEPT}  REVIEW=${counts.REVIEW}  REJECT=${counts.REJECT}  INSUFFICIENT_SIGNAL=${counts.INSUFFICIENT_SIGNAL}  total=${rows.length}`
  );
  console.log(
    `whisper source: stem=${rows.filter((r) => r.whisper_source === "stem").length}, raw=${rows.filter((r) => r.whisper_source === "raw").length}`
  );
  console.log(
    `canonical from whisper-only: ${canonicalIsWhisper}  |  TV slug missing canonical: ${missingCanonical}`
  );
  console.log("-".repeat(66));

  // Per-bucket detail
  for (const bucket of ["REJECT", "REVIEW"] as const) {
    const items = rows.filter((r) => r.bucket === bucket);
    if (items.length === 0) continue;
    console.log(`\n## ${bucket} (${items.length})`);
    console.log(`| slug | kCov | canonical_kanji | whisper_kanji | wc | distinct | canonical_source |`);
    console.log(`|------|------|-----------------|---------------|----|----------|------------------|`);
    for (const r of items) {
      console.log(
        `| ${r.slug} | ${r.kanji_coverage.toFixed(3)} | ${r.canonical_kanji} | ${r.whisper_kanji} | ${r.whisper_word_count} | ${r.distinct_word_ratio.toFixed(3)} | ${r.canonical_source} |`
      );
    }
  }

  const report = {
    generated_at: new Date().toISOString(),
    version: "tv",
    method: "tv-whisper-vs-canonical-full-lyrics",
    thresholds: {
      reject_kcov: REJECT_KCOV,
      review_kcov: REVIEW_KCOV,
      min_words_for_judgment: MIN_WORDS_FOR_JUDGMENT,
      min_distinct_word_ratio: MIN_DISTINCT_WORD_RATIO,
    },
    counts,
    total: rows.length,
    missing_canonical: missingCanonical,
    canonical_is_whisper: canonicalIsWhisper,
    rows,
  };
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`\nReport: ${REPORT_PATH}`);

  process.exit(counts.REJECT > 0 ? 1 : 0);
}

main();
