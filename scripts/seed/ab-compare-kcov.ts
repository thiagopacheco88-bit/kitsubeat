/**
 * ab-compare-kcov.ts — Diff kanji-coverage between original WhisperX run
 * and the Demucs-stem rerun for each pilot slug.
 *
 * Reads:
 *   data/lyrics-cache/{slug}.json       (ground truth raw_lyrics)
 *   data/timing-cache/{slug}.json       (original Whisper timing)
 *   data/timing-cache-stem/{slug}.json  (stem Whisper timing)
 *
 * Writes:
 *   data/ab-stem-comparison-report.json
 *
 * Prints a table sorted by kCov delta descending so the biggest wins from
 * vocal separation surface first. Reuses the exact coverage metric from
 * 03b-validate-lyrics-vs-whisper.ts so the numbers are directly comparable.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/ab-compare-kcov.ts
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const LYRICS_DIR = "data/lyrics-cache";
const ORIG_DIR = "data/timing-cache";
const STEM_DIR = "data/timing-cache-stem";
const REPORT_PATH = "data/ab-stem-comparison-report.json";

const PILOT_SLUGS = [
  "whats-up-people-maximum-the-hormone",
  "speed-analogfish",
  "99-mob-choir",
  "mountain-a-go-go-too-captain-straydum",
  "vivid-vice-who-ya-extended",
  "change-the-world-v6",
  "kick-back-kenshi-yonezu",
  "specialz-king-gnu",
];

interface LyricsEntry {
  slug: string;
  source: string;
  raw_lyrics: string;
}

interface TimingEntry {
  words?: Array<{ word: string }>;
}

interface Row {
  slug: string;
  source: string;
  lyric_kanji: number;
  orig_words: number;
  orig_distinct_ratio: number;
  orig_kcov: number;
  stem_words: number;
  stem_distinct_ratio: number;
  stem_kcov: number;
  kcov_delta: number;
  verdict: "BIG_WIN" | "WIN" | "FLAT" | "REGRESSION" | "MISSING";
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

function loadTiming(path: string): { words: number; distinctRatio: number; kanji: Set<string> } | null {
  if (!existsSync(path)) return null;
  const entry = JSON.parse(readFileSync(path, "utf-8")) as TimingEntry;
  const words = entry.words ?? [];
  const text = words.map((w) => w.word).join("");
  const distinct = new Set(words.map((w) => w.word)).size;
  return {
    words: words.length,
    distinctRatio: words.length > 0 ? distinct / words.length : 0,
    kanji: kanjiSet(text),
  };
}

function verdictFor(delta: number): Row["verdict"] {
  if (delta >= 0.15) return "BIG_WIN";
  if (delta >= 0.03) return "WIN";
  if (delta <= -0.03) return "REGRESSION";
  return "FLAT";
}

function main() {
  console.log("=".repeat(72));
  console.log("A/B comparison — original WhisperX vs Demucs-stem WhisperX");
  console.log("=".repeat(72));

  const rows: Row[] = [];

  for (const slug of PILOT_SLUGS) {
    const lyricPath = join(LYRICS_DIR, `${slug}.json`);
    const origPath = join(ORIG_DIR, `${slug}.json`);
    const stemPath = join(STEM_DIR, `${slug}.json`);

    if (!existsSync(lyricPath)) {
      console.warn(`[warn] no lyrics cache for ${slug}`);
      continue;
    }
    const lyric = JSON.parse(readFileSync(lyricPath, "utf-8")) as LyricsEntry;
    const lyricK = kanjiSet(lyric.raw_lyrics ?? "");

    const orig = loadTiming(origPath);
    const stem = loadTiming(stemPath);

    if (!orig || !stem) {
      rows.push({
        slug,
        source: lyric.source,
        lyric_kanji: lyricK.size,
        orig_words: orig?.words ?? 0,
        orig_distinct_ratio: orig?.distinctRatio ?? 0,
        orig_kcov: orig ? coverage(lyricK, orig.kanji) : 0,
        stem_words: stem?.words ?? 0,
        stem_distinct_ratio: stem?.distinctRatio ?? 0,
        stem_kcov: stem ? coverage(lyricK, stem.kanji) : 0,
        kcov_delta: 0,
        verdict: "MISSING",
      });
      continue;
    }

    const origKcov = coverage(lyricK, orig.kanji);
    const stemKcov = coverage(lyricK, stem.kanji);
    const delta = stemKcov - origKcov;

    rows.push({
      slug,
      source: lyric.source,
      lyric_kanji: lyricK.size,
      orig_words: orig.words,
      orig_distinct_ratio: Math.round(orig.distinctRatio * 1000) / 1000,
      orig_kcov: Math.round(origKcov * 1000) / 1000,
      stem_words: stem.words,
      stem_distinct_ratio: Math.round(stem.distinctRatio * 1000) / 1000,
      stem_kcov: Math.round(stemKcov * 1000) / 1000,
      kcov_delta: Math.round(delta * 1000) / 1000,
      verdict: verdictFor(delta),
    });
  }

  rows.sort((a, b) => b.kcov_delta - a.kcov_delta);

  // Console table
  console.log();
  console.log(
    "slug".padEnd(42) +
      "  src".padEnd(10) +
      "  lyrK".padStart(6) +
      "   origW".padStart(8) +
      "  stemW".padStart(8) +
      "  origD".padStart(7) +
      "  stemD".padStart(7) +
      "  origK".padStart(7) +
      "  stemK".padStart(7) +
      "  \u0394kCov".padStart(8) +
      "  verdict",
  );
  console.log("-".repeat(120));
  for (const r of rows) {
    console.log(
      r.slug.padEnd(42) +
        ("  " + r.source).padEnd(10) +
        String(r.lyric_kanji).padStart(6) +
        String(r.orig_words).padStart(10) +
        String(r.stem_words).padStart(8) +
        r.orig_distinct_ratio.toFixed(2).padStart(9) +
        r.stem_distinct_ratio.toFixed(2).padStart(7) +
        r.orig_kcov.toFixed(3).padStart(9) +
        r.stem_kcov.toFixed(3).padStart(7) +
        (r.kcov_delta >= 0 ? "+" : "") +
        r.kcov_delta.toFixed(3).padStart(7) +
        `  ${r.verdict}`,
    );
  }
  console.log();

  const summary = {
    BIG_WIN: rows.filter((r) => r.verdict === "BIG_WIN").length,
    WIN: rows.filter((r) => r.verdict === "WIN").length,
    FLAT: rows.filter((r) => r.verdict === "FLAT").length,
    REGRESSION: rows.filter((r) => r.verdict === "REGRESSION").length,
    MISSING: rows.filter((r) => r.verdict === "MISSING").length,
  };
  const deltas = rows.filter((r) => r.verdict !== "MISSING").map((r) => r.kcov_delta);
  const meanDelta = deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;

  console.log(
    `summary: BIG_WIN=${summary.BIG_WIN}  WIN=${summary.WIN}  FLAT=${summary.FLAT}  ` +
      `REGRESSION=${summary.REGRESSION}  MISSING=${summary.MISSING}  ` +
      `mean \u0394kCov=${meanDelta >= 0 ? "+" : ""}${meanDelta.toFixed(3)}`,
  );

  writeFileSync(
    REPORT_PATH,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        summary,
        mean_kcov_delta: Math.round(meanDelta * 1000) / 1000,
        rows,
      },
      null,
      2,
    ),
    "utf-8",
  );
  console.log(`\nreport: ${REPORT_PATH}`);
}

main();
