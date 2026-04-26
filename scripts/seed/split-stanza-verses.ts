/**
 * split-stanza-verses.ts — Re-segment stanza-level verses into line-level verses.
 *
 * Problem: lessons generated with the pre-2026-04-24 prompt emit multi-line
 * "stanzas" as single verses (8-22s duration). LyricsPanel highlights one verse
 * at a time, so the highlight sticks on a stanza for the whole duration,
 * feeling broken.
 *
 * Solution: walk the song's synced_lrc line-by-line, greedy-matching token
 * concatenations against each line (testing both surface signatures: kanji+kana
 * and romaji — whichever the LRC is written in). Emit one verse per matched line.
 *
 * Tokens are redistributed; translations, literal_meaning, and cultural_context
 * are COPIED verbatim from the parent stanza onto every line-verse it produced
 * (transient state — per-line translations require content regeneration, which
 * is a separate quality concern from the highlight architecture).
 *
 * After splitting, `restore-verse-order.ts` populates start_time_ms/end_time_ms
 * from synced_lrc. Run 05-insert-db.ts to push to Postgres.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/split-stanza-verses.ts --slug=adamas-lisa
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/split-stanza-verses.ts --slug=adamas-lisa --dry-run
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../..");
const LESSONS_DIR = join(ROOT, "data/lessons-cache");
const LYRICS_DIR = join(ROOT, "data/lyrics-cache");

interface Token {
  surface: string;
  romaji?: string;
  reading?: string;
  [k: string]: unknown;
}

interface Verse {
  verse_number: number;
  start_time_ms: number;
  end_time_ms: number;
  tokens: Token[];
  translations?: Record<string, string>;
  literal_meaning?: unknown;
  cultural_context?: unknown;
  filler?: boolean;
  [k: string]: unknown;
}

interface Lesson {
  verses: Verse[];
  [k: string]: unknown;
}

interface SyncedLine {
  startMs: number;
  text: string;
}

const normalizeSurface = (s: string): string =>
  s.replace(/[\s\u3000、。！？・「」『』（）〈〉《》\-,.!?()"'…‥]/g, "").toLowerCase();

const normalizeRomaji = (s: string): string =>
  s.replace(/[^a-z]/gi, "").toLowerCase();

interface Sigs {
  surface: string;
  romaji: string;
}

function tokenSigs(tokens: Token[]): Sigs {
  return {
    surface: normalizeSurface(tokens.map((t) => t.surface).join("")),
    romaji: normalizeRomaji(tokens.map((t) => t.romaji ?? "").join("")),
  };
}

function lineSigs(line: string): Sigs {
  return { surface: normalizeSurface(line), romaji: normalizeRomaji(line) };
}

/**
 * Try to consume tokens[start..] to match `line` using whichever signature form
 * produces a match. Returns the index *after* the last consumed token, or null.
 *
 * Accepts either exact match OR "accumulated matches line's full content plus
 * short trailing content" (tolerates mid-line tokens that the LRC folded in).
 */
function matchTokensToLine(
  tokens: Token[],
  start: number,
  line: string
): number | null {
  const target = lineSigs(line);
  const forms: { key: "surface" | "romaji"; target: string }[] = [];
  if (target.surface) forms.push({ key: "surface", target: target.surface });
  if (target.romaji) forms.push({ key: "romaji", target: target.romaji });
  if (forms.length === 0) return start;

  for (const { key, target: t } of forms) {
    let acc = "";
    for (let i = start; i < tokens.length; i++) {
      const chunk =
        key === "surface"
          ? normalizeSurface(tokens[i].surface)
          : normalizeRomaji(tokens[i].romaji ?? "");
      if (!chunk) continue;
      acc += chunk;
      if (acc === t) return i + 1;
      if (acc.length > t.length) {
        if (acc.startsWith(t)) return i + 1;
        break; // overshot with no prefix match — try next form
      }
    }
  }
  return null;
}

function splitOneLesson(slug: string): { before: number; after: number; lesson: Lesson; unsplit: number } {
  const lessonPath = join(LESSONS_DIR, `${slug}.json`);
  const lyricsPath = join(LYRICS_DIR, `${slug}.json`);
  if (!existsSync(lessonPath)) throw new Error(`No lesson cache at ${lessonPath}`);
  if (!existsSync(lyricsPath)) throw new Error(`No lyrics cache at ${lyricsPath}`);
  const lesson = JSON.parse(readFileSync(lessonPath, "utf-8")) as Lesson;
  const lyrics = JSON.parse(readFileSync(lyricsPath, "utf-8")) as { synced_lrc?: SyncedLine[] };
  const synced = lyrics.synced_lrc ?? [];
  if (!synced.length) throw new Error(`No synced_lrc — splitter requires line boundaries`);

  const before = lesson.verses.length;
  const newVerses: Verse[] = [];
  let unsplit = 0;

  // Build a pool of unique stanzas keyed by signature (first occurrence wins)
  // so chorus repeats in the original lesson don't re-split twice.
  const uniq: { verse: Verse; sigs: Sigs }[] = [];
  const seen = new Set<string>();
  for (const v of lesson.verses) {
    const s = tokenSigs(v.tokens);
    if (!s.surface && !s.romaji) continue;
    const key = s.surface || s.romaji;
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push({ verse: v, sigs: s });
  }

  // For each unique stanza, walk synced_lrc looking for the starting line that
  // matches its first token; then greedy-split along consecutive lines.
  for (const { verse: stanza, sigs: stanzaSig } of uniq) {
    // Find the first synced line whose prefix appears at the start of the stanza
    let startLineIdx = -1;
    for (let li = 0; li < synced.length; li++) {
      const ls = lineSigs(synced[li].text);
      if (!ls.surface && !ls.romaji) continue;
      if (
        (stanzaSig.surface && ls.surface && stanzaSig.surface.startsWith(ls.surface.slice(0, Math.min(6, ls.surface.length)))) ||
        (stanzaSig.romaji && ls.romaji && stanzaSig.romaji.startsWith(ls.romaji.slice(0, Math.min(6, ls.romaji.length))))
      ) {
        startLineIdx = li;
        break;
      }
    }

    if (startLineIdx < 0) {
      // Could not anchor this stanza to any synced line — emit as-is; the
      // highlight will still be stanza-level for this one, but nothing is lost.
      unsplit++;
      newVerses.push({ ...stanza, verse_number: 0 });
      continue;
    }

    let tokenPos = 0;
    let li = startLineIdx;
    let emittedThisStanza = 0;
    while (tokenPos < stanza.tokens.length && li < synced.length) {
      const line = synced[li].text;
      const ls = lineSigs(line);
      if (!ls.surface && !ls.romaji) {
        li++;
        continue;
      }
      const end = matchTokensToLine(stanza.tokens, tokenPos, line);
      if (end === null) {
        // This synced line doesn't extend the stanza — stanza exhausted here
        break;
      }
      const lineTokens = stanza.tokens.slice(tokenPos, end);
      if (lineTokens.length > 0) {
        newVerses.push({
          ...stanza,
          tokens: lineTokens,
          verse_number: 0,
        });
        emittedThisStanza++;
      }
      tokenPos = end;
      li++;
    }

    // Residual tokens — emit as fallback so nothing is lost
    if (tokenPos < stanza.tokens.length) {
      const rem = stanza.tokens.slice(tokenPos);
      if (normalizeSurface(rem.map((t) => t.surface).join("")) || normalizeRomaji(rem.map((t) => t.romaji ?? "").join(""))) {
        newVerses.push({ ...stanza, tokens: rem, verse_number: 0 });
        emittedThisStanza++;
      }
    }

    if (emittedThisStanza === 0) {
      unsplit++;
      newVerses.push({ ...stanza, verse_number: 0 });
    }
  }

  for (let i = 0; i < newVerses.length; i++) newVerses[i].verse_number = i + 1;
  lesson.verses = newVerses;
  return { before, after: newVerses.length, lesson, unsplit };
}

const args = process.argv.slice(2);
const slugArg = args.find((a) => a.startsWith("--slug="))?.split("=")[1];
const dryRun = args.includes("--dry-run");

if (!slugArg) {
  console.error("Usage: --slug=<slug> [--dry-run]");
  process.exit(1);
}

const { before, after, lesson, unsplit } = splitOneLesson(slugArg);
console.log(`${slugArg}: ${before} stanza-verses → ${after} line-verses (${unsplit} stanzas unsplit)`);

if (!dryRun) {
  const outPath = join(LESSONS_DIR, `${slugArg}.json`);
  const bakPath = join(LESSONS_DIR, `${slugArg}.json.presplit.bak`);
  if (!existsSync(bakPath)) {
    writeFileSync(bakPath, readFileSync(outPath));
    console.log(`  backup: ${bakPath}`);
  }
  writeFileSync(outPath, JSON.stringify(lesson, null, 2));
  console.log(`  wrote: ${outPath}`);
}
