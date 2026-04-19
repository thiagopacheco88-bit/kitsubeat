/**
 * auto-coverage-patch.ts — Batch-generate verse patches for lesson-coverage gaps.
 *
 * Input: .planning/verse-patches/_batch.tsv with tab-separated rows:
 *   <slug>\t<after_original>\t<line>
 *
 * For each row:
 *   - Tokenize <line> via kuroshiro (surface, reading, romaji, pos).
 *   - Map POS → grammar + grammar_color.
 *   - Default meaning = { en: surface } placeholder, jlpt_level = "unknown".
 *   - Append verse to .planning/verse-patches/<slug>.json (creating if missing).
 *
 * After running, invoke apply-verse-patch.ts --all and sync-lessons-to-song-versions.ts
 * per slug.
 *
 * Usage:
 *   npx tsx scripts/seed/auto-coverage-patch.ts [--input=path/to/batch.tsv]
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

import { initKuroshiro, tokenizeLyrics, type LyricsToken } from "../lib/kuroshiro-tokenizer.js";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const PATCHES_DIR = join(ROOT, ".planning/verse-patches");
const DEFAULT_INPUT = join(PATCHES_DIR, "_batch.tsv");

type Token = {
  surface: string;
  reading: string;
  romaji: string;
  grammar: string;
  grammar_color: string;
  meaning: { en: string; "pt-BR": string; es: string };
  jlpt_level: string;
};

type Verse = {
  start_time_ms: number;
  end_time_ms: number;
  tokens: Token[];
  translations: { en: string; "pt-BR": string; es: string };
  literal_meaning: { en: string };
};

type PatchFile = {
  patches: { after_original: number; verse: Verse }[];
};

function mapPos(pos: string, surface: string): { grammar: string; grammar_color: string } {
  if (pos === "名詞") return { grammar: "noun", grammar_color: "blue" };
  if (pos === "動詞") return { grammar: "verb", grammar_color: "red" };
  if (pos === "形容詞" || pos === "形容動詞")
    return { grammar: "adjective", grammar_color: "green" };
  if (pos === "副詞") return { grammar: "adverb", grammar_color: "orange" };
  if (pos === "助詞" || pos === "助動詞") return { grammar: "particle", grammar_color: "grey" };
  if (/^[A-Za-z0-9]+$/.test(surface)) return { grammar: "other", grammar_color: "none" };
  return { grammar: "other", grammar_color: "none" };
}

function toVerse(rawTokens: LyricsToken[], line: string): Verse {
  const tokens: Token[] = rawTokens.map((t) => {
    const { grammar, grammar_color } = mapPos(t.pos, t.surface);
    return {
      surface: t.surface,
      reading: t.reading || t.surface,
      romaji: t.romaji || "",
      grammar,
      grammar_color,
      meaning: {
        en: t.surface,
        "pt-BR": t.surface,
        es: t.surface,
      },
      jlpt_level: "unknown",
    };
  });

  // Placeholder translation — this is an auto-generated coverage verse.
  return {
    start_time_ms: 0,
    end_time_ms: 0,
    tokens,
    translations: {
      en: `(auto-coverage) ${line}`,
      "pt-BR": `(auto-coverage) ${line}`,
      es: `(auto-coverage) ${line}`,
    },
    literal_meaning: { en: tokens.map((t) => t.surface).join(" + ") },
  };
}

async function main(): Promise<void> {
  const inputArg = process.argv.find((a) => a.startsWith("--input="));
  const inputPath = inputArg ? inputArg.slice("--input=".length) : DEFAULT_INPUT;

  if (!existsSync(inputPath)) {
    console.error(`Input not found: ${inputPath}`);
    console.error('Expected TSV: <slug>\\t<after_original>\\t<line>');
    process.exit(1);
  }

  mkdirSync(PATCHES_DIR, { recursive: true });
  await initKuroshiro();
  console.log("[ok] kuroshiro initialized");

  const lines = readFileSync(inputPath, "utf-8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  // Group patches by slug so we write each file once
  const bySlug = new Map<string, { after_original: number; verse: Verse }[]>();

  for (const row of lines) {
    const parts = row.split("\t");
    if (parts.length < 3) {
      console.warn(`[skip] malformed row: ${row}`);
      continue;
    }
    const [slug, afterRaw, line] = parts;
    const after_original = Number.parseInt(afterRaw, 10);
    if (!Number.isFinite(after_original)) {
      console.warn(`[skip] bad after_original: ${row}`);
      continue;
    }

    const rawTokens = await tokenizeLyrics(line);
    if (rawTokens.length === 0) {
      console.warn(`[skip] empty tokenization: ${row}`);
      continue;
    }

    const verse = toVerse(rawTokens, line);
    if (!bySlug.has(slug)) bySlug.set(slug, []);
    bySlug.get(slug)!.push({ after_original, verse });
  }

  for (const [slug, patches] of bySlug) {
    const path = join(PATCHES_DIR, `${slug}.json`);
    let existing: PatchFile = { patches: [] };
    if (existsSync(path)) {
      existing = JSON.parse(readFileSync(path, "utf-8")) as PatchFile;
    }
    existing.patches.push(...patches);
    writeFileSync(path, JSON.stringify(existing, null, 2), "utf-8");
    console.log(`[ok] ${slug}: wrote ${patches.length} patch(es) (file now has ${existing.patches.length})`);
  }

  console.log(`\nDone. ${bySlug.size} slug(s), ${lines.length} line(s) processed.`);
  console.log(`Next: npx tsx scripts/seed/apply-verse-patch.ts --all`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
