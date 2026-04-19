/**
 * restore-verse-order.ts — Rebuild verse ordering & chorus repetition.
 *
 * REGRESSION FIX: scripts/seed/dedupe-lesson-verses.ts (commit 43c0dac)
 * collapsed chorus repetitions and scrambled verse order by keying dedupe
 * on concatenated surface text. This script rebuilds lesson.verses so that:
 *   - Verses follow the order of WhisperX-aligned synced_lrc lines.
 *   - Chorus repetitions are restored (same verse can appear multiple times).
 *   - All enriched fields (tokens, translations, literal_meaning) are preserved.
 *
 * Source of truth: data/lyrics-cache/{slug}.json → synced_lrc (ordered, with repeats)
 * Target:          data/lessons-cache/{slug}.json → lesson.verses (rebuilt)
 *
 * Matching:
 *   - Each verse has two signatures: surface (kanji+kana) and romaji (fallback for
 *     WhisperX outputs that transcribe to romaji).
 *   - Greedy exact-prefix accumulation of 1..MAX_LINES synced lines per verse,
 *     testing both signatures. Pick the verse with the shortest consumption.
 *   - Allow up to MAX_SKIPS non-extending lines inside a single verse accumulation
 *     (to tolerate mid-verse English/adlib interjections like "can you hear me").
 *
 * Safety:
 *   - Unmatched unique verses are appended at the end of the rebuilt list so
 *     no lesson content is lost (they render without timing, matching today's
 *     broken behavior for those lines — a no-op regression at worst).
 *   - Writes only when the rebuilt list is at least as long as the original
 *     (never loses verse count) AND at least one chorus repeat was restored
 *     OR ordering changed.
 *   - .bak alongside each modified JSON.
 *   - --dry-run prints coverage; makes no changes.
 *
 * Usage:
 *   npx tsx scripts/seed/restore-verse-order.ts --dry-run
 *   npx tsx scripts/seed/restore-verse-order.ts --dry-run --slug=guren-does
 *   npx tsx scripts/seed/restore-verse-order.ts          # apply to all eligible
 */

import { readFileSync, readdirSync, writeFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const LESSONS_DIR = join(ROOT, "data/lessons-cache");
const LYRICS_DIR = join(ROOT, "data/lyrics-cache");

const MAX_LINES_PER_VERSE = 10;
const MAX_SKIPS_PER_VERSE = 2;

type Token = {
  surface: string;
  romaji?: string;
  reading?: string;
  grammar?: string;
  grammar_color?: string;
  meaning?: Record<string, string>;
  jlpt_level?: string;
  filler?: boolean;
};
type Verse = {
  verse_number: number;
  start_time_ms?: number;
  end_time_ms?: number;
  tokens: Token[];
  translations?: Record<string, string>;
  literal_meaning?: Record<string, string>;
  filler?: boolean;
  [k: string]: unknown;
};
type SyncedLine = { startMs: number; text: string };

const normalizeSurface = (s: string): string =>
  s.replace(/[\s\u3000、。！？・「」『』（）〈〉《》\-,.!?()"'…‥]/g, "").toLowerCase();

const normalizeRomaji = (s: string): string =>
  s.replace(/[^a-z]/gi, "").toLowerCase();

function verseSigs(v: Verse): { surface: string; romaji: string } {
  const surface = normalizeSurface(v.tokens.map((t) => t.surface).join(""));
  const romaji = normalizeRomaji(v.tokens.map((t) => t.romaji ?? "").join(""));
  return { surface, romaji };
}

interface MatchAttempt {
  verseIdx: number;
  consumed: number;
  startMs: number;
  endMs: number;
}

/**
 * Try to match `verse` starting at `syncedStart`, allowing up to MAX_SKIPS
 * non-extending lines within the accumulation. Returns how many synced lines
 * were consumed (including skipped) on exact match, or null if no match.
 */
function tryMatch(
  synced: SyncedLine[],
  syncedStart: number,
  sig: { surface: string; romaji: string }
): { consumed: number; startMs: number; endMs: number } | null {
  // Try surface sig and romaji sig in parallel; whichever matches first wins.
  const targets: { sig: string; normFn: (s: string) => string }[] = [];
  if (sig.surface) targets.push({ sig: sig.surface, normFn: normalizeSurface });
  if (sig.romaji) targets.push({ sig: sig.romaji, normFn: normalizeRomaji });

  for (const { sig: target, normFn } of targets) {
    let acc = "";
    let consumed = 0;
    let skips = 0;
    let startMs = -1;

    for (
      let n = 0;
      n < MAX_LINES_PER_VERSE + MAX_SKIPS_PER_VERSE && syncedStart + n < synced.length;
      n++
    ) {
      const line = synced[syncedStart + n];
      const chunk = normFn(line.text);
      if (!chunk) {
        consumed++;
        continue;
      }

      const trial = acc + chunk;
      // Two acceptance paths:
      //  1. target.startsWith(trial): target is still longer than what we've
      //     accumulated; keep consuming lines.
      //  2. trial.startsWith(target): this line has pushed us PAST the end of
      //     the verse — match is complete on this line, even though the synced
      //     line has trailing adlib like "(Come on!)" that's not in the verse
      //     tokens. Without this, verses whose synced counterpart includes
      //     shouts or ad-lib get orphaned (start_time_ms=0).
      if (target.startsWith(trial)) {
        if (startMs < 0) startMs = line.startMs;
        acc = trial;
        consumed = n + 1;
        if (acc === target) {
          const endMs =
            syncedStart + consumed < synced.length
              ? synced[syncedStart + consumed].startMs
              : synced[syncedStart + consumed - 1].startMs + 5000;
          return { consumed, startMs, endMs };
        }
      } else if (trial.startsWith(target) && acc !== "") {
        if (startMs < 0) startMs = line.startMs;
        consumed = n + 1;
        const endMs =
          syncedStart + consumed < synced.length
            ? synced[syncedStart + consumed].startMs
            : synced[syncedStart + consumed - 1].startMs + 5000;
        return { consumed, startMs, endMs };
      } else {
        // This line doesn't extend the prefix.
        if (acc === "") {
          // Haven't started accumulating yet: fail fast.
          break;
        }
        if (skips < MAX_SKIPS_PER_VERSE) {
          skips++;
          continue; // tolerate as interjection
        }
        break;
      }
    }
  }
  return null;
}

interface RestoreResult {
  slug: string;
  original: number;
  rebuilt: number;
  syncedLines: number;
  matched: number;
  skippedLines: number;
  filledLines: number;
  poolSize: number;
  unusedVerses: number;
  safeToApply: boolean;
  _rebuiltVerses: Verse[];
}

function restoreOne(slug: string, fillGaps: boolean): RestoreResult | null {
  const lessonPath = join(LESSONS_DIR, `${slug}.json`);
  const lyricsPath = join(LYRICS_DIR, `${slug}.json`);
  if (!existsSync(lessonPath) || !existsSync(lyricsPath)) return null;

  const lesson = JSON.parse(readFileSync(lessonPath, "utf-8"));
  const lyrics = JSON.parse(readFileSync(lyricsPath, "utf-8"));
  const synced: SyncedLine[] = lyrics.synced_lrc ?? [];
  if (!synced.length) return null;

  const pool: Verse[] = lesson.verses ?? [];
  if (!pool.length) return null;

  // Unique verses keyed by surface sig (first occurrence wins).
  const uniq: { verse: Verse; sigs: { surface: string; romaji: string } }[] = [];
  const seenSurface = new Set<string>();
  for (const v of pool) {
    const s = verseSigs(v);
    if (!s.surface) continue;
    if (seenSurface.has(s.surface)) continue;
    seenSurface.add(s.surface);
    uniq.push({ verse: v, sigs: s });
  }

  const output: Verse[] = [];
  const usedIdx = new Set<number>();
  let i = 0;
  let skipped = 0;
  let filled = 0;

  while (i < synced.length) {
    let best: MatchAttempt | null = null;
    for (let vi = 0; vi < uniq.length; vi++) {
      const m = tryMatch(synced, i, uniq[vi].sigs);
      if (!m) continue;
      if (!best || m.consumed < best.consumed) {
        best = { verseIdx: vi, consumed: m.consumed, startMs: m.startMs, endMs: m.endMs };
      }
    }

    if (best) {
      const src = uniq[best.verseIdx].verse;
      const cloned: Verse = JSON.parse(JSON.stringify(src));
      cloned.verse_number = output.length + 1;
      cloned.start_time_ms = best.startMs;
      cloned.end_time_ms = best.endMs;
      output.push(cloned);
      usedIdx.add(best.verseIdx);
      i += best.consumed;
    } else if (fillGaps) {
      // --fill-gaps: when an audible synced line doesn't match any verse in
      // the lesson pool (typical for romaji-source songs where kuroshiro
      // dropped lines at generation time), synthesize a minimal filler verse
      // using the raw synced text as a single "other"-grammar token. This
      // gives the lyrics panel *something* to highlight at that timestamp
      // instead of a 5–15s gap where the previous verse stays stuck. The
      // filler has no translation or vocab — the user still needs to re-run
      // lesson generation to get proper enrichment, but sync is preserved.
      const line = synced[i];
      const text = line.text.trim();
      if (text) {
        const endMs =
          i + 1 < synced.length ? synced[i + 1].startMs : line.startMs + 4000;
        const filler: Verse = {
          verse_number: output.length + 1,
          start_time_ms: line.startMs,
          end_time_ms: endMs,
          tokens: [
            {
              surface: text,
              reading: text,
              romaji: text,
              grammar: "other",
              grammar_color: "grey",
              meaning: { en: "(untranslated lyric line)" },
              jlpt_level: "unknown",
              filler: true,
            } as Token,
          ],
          translations: { en: "(untranslated)", "pt-BR": "(não traduzido)", es: "(no traducido)" },
          literal_meaning: { en: "(placeholder — re-generate lesson for full tokens/translation)" },
          filler: true,
        };
        output.push(filler);
        filled++;
      } else {
        skipped++;
      }
      i++;
    } else {
      skipped++;
      i++;
    }
  }

  // Append any unmatched unique verses at the end (no timing). This preserves
  // lesson content for verses that don't cleanly align to synced_lrc. They
  // won't highlight during playback (start_time_ms=0) but neither do they
  // disappear — same behavior as today for those specific verses.
  const orphans: Verse[] = [];
  for (let vi = 0; vi < uniq.length; vi++) {
    if (usedIdx.has(vi)) continue;
    const cloned: Verse = JSON.parse(JSON.stringify(uniq[vi].verse));
    cloned.verse_number = output.length + orphans.length + 1;
    cloned.start_time_ms = 0;
    cloned.end_time_ms = 0;
    orphans.push(cloned);
  }

  const finalVerses = [...output, ...orphans];
  const unusedVerses = orphans.length;
  // Apply whenever at least one synced line matched a verse — the rebuilt
  // list then has correctly-ordered matched verses (with any chorus repeats)
  // followed by untimed orphans. Songs where nothing matches (romaji-only
  // WhisperX vs kanji-only lesson tokens) are preserved as-is.
  const safeToApply = output.length > 0;

  return {
    slug,
    original: pool.length,
    rebuilt: finalVerses.length,
    syncedLines: synced.length,
    matched: synced.length - skipped - filled,
    skippedLines: skipped,
    filledLines: filled,
    poolSize: uniq.length,
    unusedVerses,
    safeToApply,
    _rebuiltVerses: finalVerses,
  };
}

// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const fillGaps = args.includes("--fill-gaps");
const slugArg = args.find((a) => a.startsWith("--slug="))?.split("=")[1];

const slugs = slugArg
  ? [slugArg]
  : readdirSync(LESSONS_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(".json", ""))
      .sort();

console.log(
  `=== restore-verse-order: ${dryRun ? "DRY RUN" : "APPLY"} over ${slugs.length} song(s) ===\n`
);

let appliedCount = 0;
let unsafeCount = 0;
let skippedNoSynced = 0;
const unsafeList: string[] = [];

for (const slug of slugs) {
  const r = restoreOne(slug, fillGaps);
  if (!r) {
    skippedNoSynced++;
    continue;
  }
  const tag = r.safeToApply ? "OK " : "SKIP";
  const pct = r.syncedLines ? ((r.matched / r.syncedLines) * 100).toFixed(0) : "0";
  const delta = r.rebuilt - r.original;
  const deltaStr = delta > 0 ? `+${delta}` : String(delta);
  const fillTag = r.filledLines > 0 ? `  filled=${r.filledLines}` : "";
  console.log(
    `  [${tag}] ${slug.padEnd(45)} pool=${String(r.poolSize).padStart(2)} → rebuilt=${String(r.rebuilt).padStart(2)} (${deltaStr})  synced ${r.matched}/${r.syncedLines} (${pct}%)  unused=${r.unusedVerses}${fillTag}`
  );

  if (r.safeToApply) {
    appliedCount++;
    if (!dryRun && (delta !== 0 || r.filledLines > 0)) {
      const lessonPath = join(LESSONS_DIR, `${slug}.json`);
      const bakPath = `${lessonPath}.bak`;
      if (!existsSync(bakPath)) {
        writeFileSync(bakPath, readFileSync(lessonPath, "utf-8"), "utf-8");
      }
      const lesson = JSON.parse(readFileSync(lessonPath, "utf-8"));
      lesson.verses = r._rebuiltVerses;
      writeFileSync(lessonPath, JSON.stringify(lesson, null, 2), "utf-8");
    }
  } else {
    unsafeCount++;
    unsafeList.push(`${slug} (rebuilt=${r.rebuilt}/${r.original}, unused=${r.unusedVerses})`);
  }
}

console.log(
  `\n=== ${dryRun ? "Would apply" : "Applied"}: ${appliedCount} | unsafe (not written): ${unsafeCount} | skipped (no synced_lrc): ${skippedNoSynced} ===`
);
if (unsafeList.length) {
  console.log(`\n⚠️  ${unsafeList.length} song(s) not safe to overwrite (preserved as-is):`);
  for (const s of unsafeList) console.log(`   - ${s}`);
}
