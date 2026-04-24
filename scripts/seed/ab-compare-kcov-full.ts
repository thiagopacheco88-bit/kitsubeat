/**
 * ab-compare-kcov-full.ts — Full-catalog Demucs+WhisperX A/B report.
 *
 * After the worker promotion has flipped production timing caches to the
 * stem-based output, every reprocessed slug has its original preserved at
 * data/timing-cache/_pre-demucs/{slug}.json. This script computes kanji
 * coverage before and after for every such slug and writes a delta report.
 *
 * Output:
 *   data/ab-repass-report.json   machine-readable per-slug rows + tier counts
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/ab-compare-kcov-full.ts
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

const LYRICS_DIR = "data/lyrics-cache";
const PROD_DIR = "data/timing-cache";
const BACKUP_DIR = "data/timing-cache/_pre-demucs";
const REPORT_PATH = "data/ab-repass-report.json";

interface TimingEntry {
  words?: Array<{ word: string }>;
}

interface Row {
  slug: string;
  source: string;
  lyric_kanji: number;
  orig_words: number;
  orig_distinct_ratio: number;
  orig_kcov: number | null;
  stem_words: number;
  stem_distinct_ratio: number;
  stem_kcov: number | null;
  kcov_delta: number | null;
  verdict: "BIG_WIN" | "WIN" | "FLAT" | "REGRESSION" | "NO_GROUND_TRUTH";
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

function coverage(target: Set<string>, source: Set<string>): number | null {
  if (target.size === 0) return null;
  let hit = 0;
  for (const ch of target) if (source.has(ch)) hit++;
  return hit / target.size;
}

function describeTiming(path: string) {
  if (!existsSync(path)) return null;
  const e = JSON.parse(readFileSync(path, "utf-8")) as TimingEntry;
  const words = e.words ?? [];
  const text = words.map((w) => w.word).join("");
  const distinct = new Set(words.map((w) => w.word)).size;
  return {
    words: words.length,
    distinctRatio: words.length > 0 ? distinct / words.length : 0,
    kanji: kanjiSet(text),
  };
}

function verdictFor(delta: number | null): Row["verdict"] {
  if (delta === null) return "NO_GROUND_TRUTH";
  if (delta >= 0.15) return "BIG_WIN";
  if (delta >= 0.03) return "WIN";
  if (delta <= -0.03) return "REGRESSION";
  return "FLAT";
}

function main() {
  if (!existsSync(BACKUP_DIR)) {
    console.error(`[error] backup dir not found: ${BACKUP_DIR}`);
    process.exit(1);
  }

  const slugs = readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();

  console.log(`[compare-full] ${slugs.length} slugs with backups`);

  const rows: Row[] = [];

  for (const slug of slugs) {
    const lyricPath = join(LYRICS_DIR, `${slug}.json`);
    const origPath = join(BACKUP_DIR, `${slug}.json`);
    const stemPath = join(PROD_DIR, `${slug}.json`);

    const orig = describeTiming(origPath);
    const stem = describeTiming(stemPath);
    if (!orig || !stem) continue;

    let source = "unknown";
    let hasCanonical = false;
    let lyricK: Set<string> = new Set();

    if (existsSync(lyricPath)) {
      const lyric = JSON.parse(readFileSync(lyricPath, "utf-8"));
      source = (lyric.source as string) ?? "unknown";
      if (source !== "whisper" && source !== "pending_whisper") {
        hasCanonical = true;
        lyricK = kanjiSet(lyric.raw_lyrics ?? "");
      }
    }

    const origKcov = hasCanonical ? coverage(lyricK, orig.kanji) : null;
    const stemKcov = hasCanonical ? coverage(lyricK, stem.kanji) : null;
    const delta =
      origKcov !== null && stemKcov !== null ? stemKcov - origKcov : null;

    rows.push({
      slug,
      source,
      lyric_kanji: lyricK.size,
      orig_words: orig.words,
      orig_distinct_ratio: Math.round(orig.distinctRatio * 1000) / 1000,
      orig_kcov: origKcov !== null ? Math.round(origKcov * 1000) / 1000 : null,
      stem_words: stem.words,
      stem_distinct_ratio: Math.round(stem.distinctRatio * 1000) / 1000,
      stem_kcov: stemKcov !== null ? Math.round(stemKcov * 1000) / 1000 : null,
      kcov_delta: delta !== null ? Math.round(delta * 1000) / 1000 : null,
      verdict: verdictFor(delta),
    });
  }

  rows.sort((a, b) => {
    const av = a.kcov_delta ?? -Infinity;
    const bv = b.kcov_delta ?? -Infinity;
    return bv - av;
  });

  const counts = {
    BIG_WIN: rows.filter((r) => r.verdict === "BIG_WIN").length,
    WIN: rows.filter((r) => r.verdict === "WIN").length,
    FLAT: rows.filter((r) => r.verdict === "FLAT").length,
    REGRESSION: rows.filter((r) => r.verdict === "REGRESSION").length,
    NO_GROUND_TRUTH: rows.filter((r) => r.verdict === "NO_GROUND_TRUTH").length,
  };
  const measured = rows.filter((r) => r.kcov_delta !== null);
  const meanDelta =
    measured.length > 0
      ? measured.reduce((a, r) => a + (r.kcov_delta as number), 0) /
        measured.length
      : 0;

  console.log();
  console.log(
    `counts: BIG_WIN=${counts.BIG_WIN}  WIN=${counts.WIN}  FLAT=${counts.FLAT}  ` +
      `REGRESSION=${counts.REGRESSION}  NO_GROUND_TRUTH=${counts.NO_GROUND_TRUTH}`,
  );
  console.log(
    `measured=${measured.length}  mean ΔkCov=${meanDelta >= 0 ? "+" : ""}${meanDelta.toFixed(3)}`,
  );

  writeFileSync(
    REPORT_PATH,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        counts,
        measured_count: measured.length,
        mean_kcov_delta: Math.round(meanDelta * 1000) / 1000,
        rows,
      },
      null,
      2,
    ),
    "utf-8",
  );
  console.log(`report: ${REPORT_PATH}`);

  // Print top 20 wins + any regressions for quick console scan
  console.log("\ntop 20 wins:");
  for (const r of measured.slice(0, 20)) {
    console.log(
      `  ${r.slug.padEnd(50)} ${r.source.padEnd(10)}  orig=${(r.orig_kcov ?? 0).toFixed(3)}  stem=${(r.stem_kcov ?? 0).toFixed(3)}  Δ=${(r.kcov_delta ?? 0) >= 0 ? "+" : ""}${(r.kcov_delta ?? 0).toFixed(3)}  ${r.verdict}`,
    );
  }
  const regressions = rows.filter((r) => r.verdict === "REGRESSION");
  if (regressions.length > 0) {
    console.log(`\n${regressions.length} regressions:`);
    for (const r of regressions) {
      console.log(
        `  ${r.slug.padEnd(50)} ${r.source.padEnd(10)}  orig=${(r.orig_kcov ?? 0).toFixed(3)}  stem=${(r.stem_kcov ?? 0).toFixed(3)}  Δ${(r.kcov_delta ?? 0).toFixed(3)}`,
      );
    }
  }
}

main();
