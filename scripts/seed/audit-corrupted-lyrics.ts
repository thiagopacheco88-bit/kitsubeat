/**
 * audit-corrupted-lyrics.ts — Find lyrics-cache files corrupted by the
 * WhisperX char-rip pattern, where every Japanese character is space-separated.
 *
 * Output: a list of slugs that need re-fetching from a clean source
 * (j-lyric, genius, uta-net), printed to stdout. Optionally writes
 * data/_corrupted-lyrics.json so the next pipeline step can consume it.
 *
 * Detection logic combines two signals:
 *   1. pair-ratio ≥ 40%: the share of CJK chars followed by `<space><CJK>`.
 *      Char-ripped output sits at 95–98% (every char gets isolated). Normal
 *      word-spaced lyrics never exceed ~15% even when phrases use spaces.
 *   2. ≥3 occurrences of four CJK chars in a row, each separated by a single
 *      space (`X X X X`). Word-spacing never produces this run; only char-rip
 *      does. Catches shorter rips that the ratio threshold might miss.
 *
 * NOT corruption signals (deliberate false-positive avoidance):
 *   - low CJK density (bilingual songs like milet's "Anytime Anywhere" are clean)
 *   - high raw pair count alone (a clean song with many word-separated phrases
 *     can hit 30+ pairs without any rip)
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/audit-corrupted-lyrics.ts
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/audit-corrupted-lyrics.ts --write
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { resolve, join } from "path";

const CACHE_DIR = resolve("data/lyrics-cache");
const OUT_PATH = resolve("data/_corrupted-lyrics.json");

interface Entry {
  slug: string;
  title: string;
  artist: string;
  raw_lyrics: string;
  source?: string;
}

interface Finding {
  slug: string;
  title: string;
  artist: string;
  source: string;
  cjk_percent: number;
  spaced_cjk_pairs: number;
  spaced_cjk_quads: number;
  pair_ratio: number;
  total_cjk: number;
  signal: "char-rip";
}

function cjkCount(s: string): number {
  return (s.match(/[぀-ヿ一-鿿]/g) || []).length;
}

function spacedCjkPairCount(s: string): number {
  // Count occurrences of "<CJK> <CJK>" — every CJK char that has a space and
  // another CJK char immediately after. Use lookahead so overlapping pairs are
  // all counted: 「あ い う」 → 2 pairs.
  const re = /[぀-ヿ一-鿿](?= [぀-ヿ一-鿿])/g;
  return (s.match(re) || []).length;
}

function spacedCjkQuadCount(s: string): number {
  // Count runs of 4 CJK chars separated by single spaces. Word-spaced lyrics
  // never produce this (phrases are never single-char); only the char-rip does.
  const re = /[぀-ヿ一-鿿] [぀-ヿ一-鿿] [぀-ヿ一-鿿] [぀-ヿ一-鿿]/g;
  return (s.match(re) || []).length;
}

function audit(): Finding[] {
  const findings: Finding[] = [];
  const files = readdirSync(CACHE_DIR).filter(
    (f) => f.endsWith(".json") && !f.endsWith(".bak.json") && !f.endsWith(".presplit.json"),
  );

  for (const file of files) {
    const slug = file.replace(/\.json$/, "");
    let entry: Entry;
    try {
      entry = JSON.parse(readFileSync(join(CACHE_DIR, file), "utf-8")) as Entry;
    } catch {
      continue;
    }
    const lyrics = entry.raw_lyrics || "";
    if (!lyrics) continue;

    const totalCjk = cjkCount(lyrics);
    if (totalCjk < 20) continue; // not a Japanese song; skip

    const stripped = lyrics.replace(/\s/g, "");
    const cjkPercent = stripped.length ? Math.round((totalCjk / stripped.length) * 100) : 0;
    const pairs = spacedCjkPairCount(lyrics);
    const quads = spacedCjkQuadCount(lyrics);
    const pairRatio = totalCjk > 0 ? pairs / totalCjk : 0;

    // Char-rip if either signal trips:
    //   - pair_ratio ≥ 40%  (95–98% on real rips, never above 15% on clean)
    //   - quads ≥ 3         (any 4-char run; clean songs hit 0)
    if (pairRatio < 0.4 && quads < 3) continue;

    findings.push({
      slug,
      title: entry.title || slug,
      artist: entry.artist || "",
      source: entry.source || "",
      cjk_percent: cjkPercent,
      spaced_cjk_pairs: pairs,
      spaced_cjk_quads: quads,
      pair_ratio: Math.round(pairRatio * 100) / 100,
      total_cjk: totalCjk,
      signal: "char-rip",
    });
  }

  // Worst offenders first.
  findings.sort((a, b) => b.pair_ratio - a.pair_ratio || b.spaced_cjk_quads - a.spaced_cjk_quads);
  return findings;
}

function main() {
  const args = process.argv.slice(2);
  const write = args.includes("--write");

  const findings = audit();

  console.log(`[audit] scanned ${readdirSync(CACHE_DIR).length} files`);
  console.log(`[audit] ${findings.length} suspect entries\n`);

  if (findings.length === 0) {
    console.log("[audit] no corruption detected.");
    return;
  }

  for (const f of findings) {
    console.log(
      `  ${f.signal.padEnd(8)} ratio=${String(Math.round(f.pair_ratio * 100)).padStart(3)}%  quads=${String(
        f.spaced_cjk_quads,
      ).padStart(4)}  pairs=${String(f.spaced_cjk_pairs).padStart(5)}  src=${f.source.padEnd(18)} ${f.slug} (${f.artist})`,
    );
  }

  if (write) {
    writeFileSync(
      OUT_PATH,
      JSON.stringify(
        {
          generated_at: new Date().toISOString(),
          count: findings.length,
          slugs: findings.map((f) => f.slug),
          details: findings,
        },
        null,
        2,
      ),
      "utf-8",
    );
    console.log(`\n[audit] wrote ${OUT_PATH}`);
  }
}

main();
