/**
 * dump-vocab-candidates.ts — deterministic vocabulary candidate dump.
 *
 * Reads lyrics from data/lyrics-cache{,-tv}/<slug>.json, runs the tokenizer +
 * content-word extractor, and writes the full candidate list to
 * data/vocab-candidates{,-tv}/<slug>.json.
 *
 * No LLM calls. Runs in seconds. Output is then annotated inline per song.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/dump-vocab-candidates.ts
 *   npx tsx ... scripts/dump-vocab-candidates.ts --slug=blue-bird-ikimonogakari
 *   npx tsx ... scripts/dump-vocab-candidates.ts --version=tv
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";

import { initKuroshiro } from "./lib/kuroshiro-tokenizer.js";
import { extractVocabCandidates, type VocabCandidate } from "./lib/vocab-extractor.js";

interface Args {
  slug: string | null;
  version: "full" | "tv";
}

function parseArgs(): Args {
  const args: Args = { slug: null, version: "full" };
  for (const raw of process.argv.slice(2)) {
    if (raw.startsWith("--slug=")) args.slug = raw.slice("--slug=".length);
    else if (raw === "--version=tv") args.version = "tv";
    else if (raw === "--version=full") args.version = "full";
  }
  return args;
}

function cachePaths(version: "full" | "tv") {
  const suffix = version === "tv" ? "-tv" : "";
  return {
    lyricsDir: resolve(`data/lyrics-cache${suffix}`),
    lessonsDir: resolve(`data/lessons-cache${suffix}`),
    outDir: resolve(`data/vocab-candidates${suffix}`),
  };
}

interface LyricsCacheFile {
  slug: string;
  title: string;
  artist: string;
  raw_lyrics: string;
}

interface LessonVerse {
  tokens?: Array<{ surface?: string }>;
}
interface LessonFile {
  verses?: LessonVerse[];
}

// Any hiragana / katakana / kanji character
const HAS_JAPANESE = /[\u3040-\u30FF\u4E00-\u9FFF]/;

/**
 * When raw_lyrics are in romaji or a non-Japanese language (LRCLIB often has
 * no kana for anime songs), fall back to the already-generated lesson JSON's
 * verse tokens, which always contain the real Japanese surfaces.
 */
function extractJapaneseSource(
  rawLyrics: string,
  lessonPath: string
): string | null {
  if (HAS_JAPANESE.test(rawLyrics)) return rawLyrics;

  if (!existsSync(lessonPath)) return null;
  try {
    const lesson: LessonFile = JSON.parse(readFileSync(lessonPath, "utf8"));
    const surfaces: string[] = [];
    for (const verse of lesson.verses ?? []) {
      for (const tok of verse.tokens ?? []) {
        if (tok.surface && HAS_JAPANESE.test(tok.surface)) {
          surfaces.push(tok.surface);
        }
      }
    }
    if (surfaces.length === 0) return null;
    // Join with spaces so kuromoji treats each surface as a separate chunk.
    // Surfaces are already segmented Japanese, so this gives clean tokenization.
    return surfaces.join(" ");
  } catch {
    return null;
  }
}

interface CandidateFile {
  slug: string;
  title: string;
  artist: string;
  generated_at: string;
  total: number;
  candidates: VocabCandidate[];
}

async function main() {
  const args = parseArgs();
  const { lyricsDir, lessonsDir, outDir } = cachePaths(args.version);

  if (!existsSync(lyricsDir)) {
    console.error(`Lyrics cache missing: ${lyricsDir}`);
    process.exit(1);
  }
  mkdirSync(outDir, { recursive: true });

  const files = args.slug
    ? [`${args.slug}.json`]
    : readdirSync(lyricsDir).filter((f) => f.endsWith(".json"));

  if (files.length === 0) {
    console.error("No lyrics files to process.");
    process.exit(1);
  }

  console.log(`=== dump-vocab-candidates (${args.version}) ===`);
  console.log(`Input:  ${lyricsDir}`);
  console.log(`Output: ${outDir}`);
  console.log(`Files:  ${files.length}\n`);

  await initKuroshiro();

  let processed = 0;
  let failed = 0;
  const counts: number[] = [];

  for (const file of files) {
    const fullPath = join(lyricsDir, file);
    if (!existsSync(fullPath)) {
      console.warn(`[skip] ${file} (missing)`);
      failed++;
      continue;
    }

    let lyrics: LyricsCacheFile;
    try {
      lyrics = JSON.parse(readFileSync(fullPath, "utf8"));
    } catch (err) {
      console.warn(`[skip] ${file} (parse error: ${(err as Error).message})`);
      failed++;
      continue;
    }

    if (!lyrics.raw_lyrics || !lyrics.raw_lyrics.trim()) {
      console.warn(`[skip] ${file} (empty raw_lyrics)`);
      failed++;
      continue;
    }

    const japaneseSource = extractJapaneseSource(
      lyrics.raw_lyrics,
      join(lessonsDir, file)
    );

    if (!japaneseSource) {
      console.warn(`[skip] ${file} (no Japanese text in lyrics or lesson)`);
      failed++;
      continue;
    }

    const sourceKind = japaneseSource === lyrics.raw_lyrics ? "lyrics" : "lesson-verses";
    const candidates = await extractVocabCandidates(japaneseSource);

    const out: CandidateFile = {
      slug: lyrics.slug,
      title: lyrics.title,
      artist: lyrics.artist,
      generated_at: new Date().toISOString(),
      total: candidates.length,
      candidates,
    };

    writeFileSync(join(outDir, file), JSON.stringify(out, null, 2), "utf8");
    counts.push(candidates.length);
    processed++;
    console.log(`[ok] ${lyrics.slug} → ${candidates.length} candidates (${sourceKind})`);
  }

  counts.sort((a, b) => a - b);
  const median = counts[Math.floor(counts.length / 2)] ?? 0;
  const min = counts[0] ?? 0;
  const max = counts[counts.length - 1] ?? 0;
  const mean = counts.length
    ? Math.round(counts.reduce((s, n) => s + n, 0) / counts.length)
    : 0;

  console.log("\n=== Summary ===");
  console.log(`Processed: ${processed}`);
  console.log(`Failed:    ${failed}`);
  console.log(`Candidates per song — min: ${min}, median: ${median}, mean: ${mean}, max: ${max}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
