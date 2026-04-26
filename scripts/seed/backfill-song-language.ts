/**
 * backfill-song-language.ts — Classify each song's vocal language based on the
 * content of its lyrics-cache JSON, and persist the ISO 639-1 code to
 * songs.language. Non-"ja" rows are filtered out of the learning UI by
 * queries.getAllSongs (they remain browsable in admin for reference).
 *
 * Classification rule:
 *   1. If raw_lyrics contains ≥ 5% CJK characters (kana or kanji): "ja"
 *   2. Else detect by keyword / character hints:
 *      - ja_romaji: ≥ 3 Japanese particles or common words in Hepburn form —
 *                   these songs ARE Japanese but LRCLIB returned a romaji-only
 *                   transcription, so they're unusable for learning until the
 *                   kanji lyrics are recovered (manual paste or Genius re-run)
 *      - de: umlaut character OR ≥ 2 German-only keywords
 *      - la: classical Latin keywords
 *      - en: fallback — covers English and anything we cannot classify
 *            (Chinese/Korean would need additional rules but are absent from
 *            the current catalogue)
 *
 * The 5% CJK threshold is deliberately low — Japanese anime OP/EDs commonly
 * sprinkle English phrases throughout ("Come on!", "Shiny sword my diamond"),
 * and the ADAMAS fix landed at 38% CJK. Anything above 5% is unambiguously
 * a Japanese song.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/backfill-song-language.ts            # dry-run
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/backfill-song-language.ts --apply    # persist
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync, readdirSync, existsSync } from "fs";
import { resolve, join } from "path";
import { Client } from "@neondatabase/serverless";

const APPLY = process.argv.includes("--apply");

const PROJECT_ROOT = resolve(process.cwd());
const LYRICS_DIR = join(PROJECT_ROOT, "data/lyrics-cache");

const JP_RE = /[\u3040-\u30FF\u4E00-\u9FFF]/g;
const GERMAN_CHAR_RE = /[äöüÄÖÜß]/;
// Words that occur ONLY in German, not in English — "die"/"der"/"war" are
// excluded because they're ambiguous. Multiple hits required to avoid a
// single stray word matching (unless an umlaut is also present).
const GERMAN_WORD_RE = /\b(ich|und|nicht|haben|sind|kein|schließen|immer|Schwerter|über|Mauer|Vogel|Zweifel|daran|gewidmet|Herzen)\b/gi;
const LATIN_WORD_RE = /\b(dormite|dulci|pueri|caloria|comodus|lecti|osservo|semper|liberi)\b/i;
// Hepburn romaji words that are unambiguously Japanese — excludes short
// particles (wa, ga, no, ni, wo, to, ne) and words that collide with English
// (made, demo, koto, mono, hito, sono). These are content words or common
// phrases that don't occur as English words.
const ROMAJI_JP_RE = /\b(boku|kimi|watashi|ore|omae|anata|sumimasen|arigatou|konnichiwa|sayonara|ohayou|kokoro|yume|sakura|daijoubu|kirei|kanashii|kibou|shinjitsu|mirai|aishiteru|tamashii|itsumo|sugoi|hontou|kamisama|hotokesama|sugari|naiteru|kakera|yami|hikari|namida|kotoba|kibou|kanjou|yasashii|utsukushii|owari|hajimari|sekai|chikara|kimochi|arukou|hashirou|mamoru|tsudukeru|ganbaru|randebuu|yabureru)\b/gi;

function cjkPercent(text: string): number {
  const chars = text.replace(/\s/g, "");
  if (!chars.length) return 0;
  const cjk = (text.match(JP_RE) || []).length;
  return (cjk / chars.length) * 100;
}

function countMatches(text: string, re: RegExp): number {
  return (text.match(re) || []).length;
}

function classify(raw: string): {
  code: "ja" | "ja_romaji" | "de" | "la" | "en";
  cjk_pct: number;
} {
  const cjk_pct = cjkPercent(raw);
  if (cjk_pct >= 5) return { code: "ja", cjk_pct };

  const germanWords = countMatches(raw, GERMAN_WORD_RE);
  const hasUmlaut = GERMAN_CHAR_RE.test(raw);
  if (hasUmlaut || germanWords >= 2) return { code: "de", cjk_pct };
  if (LATIN_WORD_RE.test(raw)) return { code: "la", cjk_pct };
  const romajiHits = countMatches(raw, ROMAJI_JP_RE);
  if (romajiHits >= 3) return { code: "ja_romaji", cjk_pct };
  return { code: "en", cjk_pct };
}

async function main() {
  const client = new Client(process.env.DATABASE_URL!);
  await client.connect();

  try {
    const rows = (await client.query<{ slug: string; language: string }>(
      `SELECT slug, language FROM songs`
    )).rows;

    const buckets: Record<string, string[]> = {
      ja: [],
      ja_romaji: [],
      de: [],
      la: [],
      en: [],
      missing: [],
    };
    const changes: Array<{ slug: string; from: string; to: string; cjk: number }> = [];

    for (const row of rows) {
      const lyricsPath = join(LYRICS_DIR, `${row.slug}.json`);
      if (!existsSync(lyricsPath)) {
        buckets.missing.push(row.slug);
        continue;
      }
      const cache = JSON.parse(readFileSync(lyricsPath, "utf-8"));
      const raw: string = cache.raw_lyrics ?? "";
      const { code, cjk_pct } = classify(raw);
      buckets[code].push(row.slug);
      if (row.language !== code) {
        changes.push({ slug: row.slug, from: row.language, to: code, cjk: Math.round(cjk_pct) });
      }
    }

    console.log(`\n=== Classification summary (${rows.length} songs) ===`);
    for (const [code, slugs] of Object.entries(buckets)) {
      console.log(`  ${code.padEnd(8)} ${slugs.length}`);
    }
    console.log(`\n=== Changes (${changes.length}) ===`);
    for (const c of changes) {
      console.log(`  ${c.slug.padEnd(55)} ${c.from} → ${c.to}   (cjk=${c.cjk}%)`);
    }

    if (!APPLY) {
      console.log(`\n(dry-run — re-run with --apply to persist)`);
      return;
    }
    if (!changes.length) {
      console.log(`\nNo changes to apply.`);
      return;
    }

    // Batch update — one round trip per changed language bucket, not per row.
    const byTargetLang = new Map<string, string[]>();
    for (const c of changes) {
      if (!byTargetLang.has(c.to)) byTargetLang.set(c.to, []);
      byTargetLang.get(c.to)!.push(c.slug);
    }
    for (const [lang, slugs] of byTargetLang) {
      await client.query(`UPDATE songs SET language = $1 WHERE slug = ANY($2::text[])`, [lang, slugs]);
      console.log(`  [update] ${slugs.length} rows → language='${lang}'`);
    }
    console.log(`\nDone.`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("[fatal]", e);
  process.exit(1);
});
