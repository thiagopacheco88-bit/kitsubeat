/**
 * 04c-decorrupt-lyrics.ts — Strip WhisperX char-tokenization artifacts from
 * lyrics-cache entries that were rebuilt by 04b-backfill.
 *
 * Root cause: WhisperX tokenizes Japanese into single CJK characters and
 * gives each its own timestamp. 04b's gap-based reconstruction inserts a
 * space between every consecutive single-char token, producing output like
 *   "そ の 夢 は 心 の 居 場 所"
 * The chars themselves are correct (high-confidence transcription); only the
 * inter-char whitespace is bogus. This script removes any single-space gap
 * between two characters of the same script class (CJK ↔ CJK, or ASCII letter
 * ↔ ASCII letter) while preserving:
 *   - newlines (verse breaks emitted by 04b based on gap size)
 *   - spaces around language transitions (e.g. "残酷な世界 yeah")
 *   - multi-space gaps (deliberate beat gaps in the LRC layer)
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/04c-decorrupt-lyrics.ts
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/04c-decorrupt-lyrics.ts --slug=foo --dry-run
 *
 * Originals are backed up to data/lyrics-cache/{slug}.json.bak-04c.json on the
 * first run for the slug (existing backups are not overwritten).
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, copyFileSync } from "fs";
import { join, resolve } from "path";

const PROJECT_ROOT = resolve(process.cwd());
const LYRICS_DIR = join(PROJECT_ROOT, "data/lyrics-cache");
const CORRUPT_LIST = join(PROJECT_ROOT, "data/_corrupted-lyrics.json");

const CJK = "[\\u3040-\\u30FF\\u4E00-\\u9FFF]";
const STRIP_CJK = new RegExp("(" + CJK + ") (?=" + CJK + ")", "g");
// Strip "X Y" between two ASCII letters too — covers WhisperX char-spaced English.
const STRIP_ASCII = /([A-Za-z]) (?=[A-Za-z])/g;

interface LyricsCacheEntry {
  slug: string;
  title?: string;
  artist?: string;
  source?: string;
  raw_lyrics?: string;
  synced_lrc?: string | object;
  tokens?: unknown[];
}

function pairRatio(text: string): number {
  if (!text) return 0;
  const cjkChars = (text.match(/[぀-ヿ一-鿿]/g) || []).length;
  if (!cjkChars) return 0;
  const pairs = (text.match(/[぀-ヿ一-鿿] [぀-ヿ一-鿿]/g) || []).length;
  return pairs / cjkChars;
}

function decorrupt(text: string): string {
  // Repeated application: a triple "X X X" becomes "X X X" → first pass leaves
  // "XX X" because the regex uses lookahead non-consuming. Run twice to be safe
  // for odd-length runs.
  let out = text.replace(STRIP_CJK, "$1");
  out = out.replace(STRIP_CJK, "$1");
  out = out.replace(STRIP_ASCII, "$1");
  out = out.replace(STRIP_ASCII, "$1");
  return out;
}

function processSlug(slug: string, dryRun: boolean): { changed: boolean; before: number; after: number } {
  const path = join(LYRICS_DIR, slug + ".json");
  if (!existsSync(path)) return { changed: false, before: 0, after: 0 };
  const entry: LyricsCacheEntry = JSON.parse(readFileSync(path, "utf-8"));
  const before = entry.raw_lyrics || "";
  const beforeRatio = pairRatio(before);
  if (beforeRatio < 0.4) return { changed: false, before: beforeRatio, after: beforeRatio };
  const after = decorrupt(before);
  const afterRatio = pairRatio(after);
  if (!dryRun) {
    const backup = path + ".bak-04c.json";
    if (!existsSync(backup)) copyFileSync(path, backup);
    entry.raw_lyrics = after;
    writeFileSync(path, JSON.stringify(entry, null, 2));
  }
  return { changed: true, before: beforeRatio, after: afterRatio };
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const slugIdx = argv.findIndex((a) => a.startsWith("--slug"));
  const slug = slugIdx >= 0 ? (argv[slugIdx].includes("=") ? argv[slugIdx].split("=")[1] : argv[slugIdx + 1]) : null;
  const dryRun = argv.includes("--dry-run");
  return { slug, dryRun };
}

function main(): void {
  const { slug, dryRun } = parseArgs();
  const targets: string[] = slug
    ? [slug]
    : (JSON.parse(readFileSync(CORRUPT_LIST, "utf-8")).slugs as string[]);

  console.log(`04c-decorrupt: ${targets.length} target slug(s)${dryRun ? " (dry-run)" : ""}`);
  let cleaned = 0;
  let unchanged = 0;
  let noFile = 0;
  for (const s of targets) {
    const path = join(LYRICS_DIR, s + ".json");
    if (!existsSync(path)) {
      noFile++;
      continue;
    }
    const result = processSlug(s, dryRun);
    if (result.changed) {
      cleaned++;
      console.log(`  ${s}: ${result.before.toFixed(2)} → ${result.after.toFixed(2)}`);
    } else {
      unchanged++;
    }
  }
  console.log(`---`);
  console.log(`cleaned: ${cleaned}, unchanged: ${unchanged}, missing files: ${noFile}`);
}

main();
