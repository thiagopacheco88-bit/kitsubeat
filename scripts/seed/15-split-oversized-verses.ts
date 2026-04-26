/**
 * 15-split-oversized-verses.ts — Post-processor that breaks up verses which
 * clump multiple lyric lines into one object (the vivid-vice problem).
 *
 * The normal pipeline splits verses at ≥4-beat silence gaps during
 * 04b-backfill-whisper-lyrics.ts. Songs that skipped step 4b (inline-generated
 * lessons, pre-pipeline imports) end up with 20-30 token verses that span 3-5
 * lyric lines. This script walks every song_version.lesson, finds verses
 * above SPLIT_TOKEN_THRESHOLD, and splits them using timing_data.words
 * silence gaps — preserving the rest of the lesson data verbatim.
 *
 * Algorithm per oversized verse:
 *   1. Collect timing_data.words that fall within [verse.start_ms,
 *      verse.end_ms]. These are character-level Whisper timestamps in seconds.
 *   2. Compute per-word gaps (next.start - current.end). Mark any gap ≥
 *      MIN_SILENCE_S as a candidate line break.
 *   3. Choose N = ceil(tokens.length / TARGET_TOKENS) split points —
 *      take the N-1 largest eligible gaps, sorted chronologically.
 *   4. Walk verse tokens, estimating each token's start time by proportional
 *      character position within the verse's time span. Assign tokens to a
 *      segment based on whether their estimated time crosses the next split.
 *   5. Emit one new verse per segment. First sub-verse inherits
 *      translations + literal_meaning + cultural_context; subsequent
 *      sub-verses get null translation fields (the source lesson only had
 *      one paragraph to split across multiple lines).
 *   6. Renumber verse_number across the entire lesson at the end.
 *
 * Translation caveat:
 *   The original lesson had ONE literal_meaning / translations object for
 *   the whole clump. We can't regenerate per-line without AI, so we keep
 *   the parent's translation on the FIRST sub-verse only. UI will render
 *   subsequent sub-verses without a translation until a future AI pass
 *   re-translates them per-line.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/15-split-oversized-verses.ts
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/15-split-oversized-verses.ts --apply
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/15-split-oversized-verses.ts --slug vivid-vice-who-ya-extended --apply
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb } from "../../src/lib/db/index.js";
import { songVersions, songs } from "../../src/lib/db/schema.js";
import { and, eq, sql } from "drizzle-orm";
import type { Lesson, Verse, Token } from "../../src/lib/types/lesson.js";

const SPLIT_TOKEN_THRESHOLD = 15; // any verse above this gets considered
const TARGET_TOKENS = 8; // aim for sub-verses of this size
const MIN_SILENCE_S = 0.25; // Japanese songs rarely have >0.5s gaps mid-verse

const APPLY = process.argv.includes("--apply");
const slugArgIdx = process.argv.indexOf("--slug");
const SLUG = slugArgIdx >= 0 ? process.argv[slugArgIdx + 1] : null;

interface TimingWord {
  start: number;
  end: number;
  word: string;
  score?: number;
}

interface TimingData {
  words?: TimingWord[];
}

interface SplitPlan {
  oldVerseNumber: number;
  oldTokenCount: number;
  newVerses: Verse[];
}

/**
 * Partition an oversized verse into sub-verses using the timing_data silence
 * gaps that fall within the verse's time window.
 */
function splitVerse(verse: Verse, timing: TimingData): Verse[] | null {
  if (!Array.isArray(verse.tokens) || verse.tokens.length <= SPLIT_TOKEN_THRESHOLD) {
    return null;
  }
  const words = timing.words ?? [];
  const verseStartS = verse.start_time_ms / 1000;
  const verseEndS = verse.end_time_ms / 1000;
  if (verseEndS <= verseStartS) return null;

  const verseWords = words.filter(
    (w) => w.start >= verseStartS - 0.1 && w.end <= verseEndS + 0.1
  );
  if (verseWords.length < 2) return null;

  // Collect candidate split times — silence gaps ≥ MIN_SILENCE_S between
  // consecutive word ends and next starts.
  const gaps: Array<{ splitAtS: number; sizeS: number }> = [];
  for (let i = 1; i < verseWords.length; i++) {
    const gap = verseWords[i].start - verseWords[i - 1].end;
    if (gap >= MIN_SILENCE_S) {
      gaps.push({
        splitAtS: verseWords[i].start,
        sizeS: gap,
      });
    }
  }

  // How many splits do we want? Enough to bring each sub-verse under
  // TARGET_TOKENS.
  const desiredSplits = Math.max(
    1,
    Math.ceil(verse.tokens.length / TARGET_TOKENS) - 1
  );
  if (gaps.length === 0) {
    // No detected silence gaps — give up. Future enhancement: proportional
    // split anyway.
    return null;
  }
  const picked = gaps
    .slice()
    .sort((a, b) => b.sizeS - a.sizeS)
    .slice(0, Math.min(desiredSplits, gaps.length))
    .sort((a, b) => a.splitAtS - b.splitAtS);

  // Estimate each token's start time by proportional character offset across
  // the verse's span.
  const totalChars = verse.tokens.reduce(
    (n, t) => n + (t.surface?.length ?? 0),
    0
  );
  if (totalChars === 0) return null;
  const span = verseEndS - verseStartS;
  const tokenStartsS: number[] = [];
  let charCursor = 0;
  for (const tok of verse.tokens) {
    tokenStartsS.push(verseStartS + (span * charCursor) / totalChars);
    charCursor += tok.surface?.length ?? 0;
  }

  // Walk tokens, emitting a new segment whenever the next token crosses the
  // current split time.
  const segments: Token[][] = [[]];
  let splitIdx = 0;
  for (let i = 0; i < verse.tokens.length; i++) {
    if (splitIdx < picked.length && tokenStartsS[i] >= picked[splitIdx].splitAtS) {
      segments.push([verse.tokens[i]]);
      splitIdx++;
    } else {
      segments[segments.length - 1].push(verse.tokens[i]);
    }
  }
  // Clean up empty leading / trailing segments defensively.
  const nonEmpty = segments.filter((s) => s.length > 0);
  if (nonEmpty.length < 2) return null;

  // Build sub-verse objects. Time ranges snap to split boundaries.
  const subVerses: Verse[] = [];
  let segStartS = verseStartS;
  for (let j = 0; j < nonEmpty.length; j++) {
    const segTokens = nonEmpty[j];
    const segEndS =
      j < picked.length ? picked[j].splitAtS : verseEndS;
    const isFirst = j === 0;
    subVerses.push({
      verse_number: verse.verse_number, // renumbered later
      start_time_ms: Math.round(segStartS * 1000),
      end_time_ms: Math.round(segEndS * 1000),
      tokens: segTokens,
      translations: isFirst ? verse.translations : {},
      literal_meaning: isFirst ? verse.literal_meaning : "",
      cultural_context: isFirst ? verse.cultural_context : undefined,
      filler: verse.filler,
    });
    segStartS = segEndS;
  }
  return subVerses;
}

interface Row {
  song_version_id: string;
  slug: string;
  version_type: "tv" | "full";
  lesson: Lesson;
  timing_data: TimingData | null;
}

async function main() {
  const db = getDb();

  const rows = (await db
    .select({
      song_version_id: songVersions.id,
      slug: songs.slug,
      version_type: songVersions.version_type,
      lesson: songVersions.lesson,
      timing_data: songVersions.timing_data,
    })
    .from(songVersions)
    .innerJoin(songs, eq(songs.id, songVersions.song_id))
    .where(
      SLUG
        ? and(
            eq(songs.slug, SLUG),
            sql`${songVersions.lesson} IS NOT NULL`
          )
        : sql`${songVersions.lesson} IS NOT NULL`
    )) as Row[];

  console.log(`scanning ${rows.length} lessons (threshold: >${SPLIT_TOKEN_THRESHOLD} tokens; target: ${TARGET_TOKENS}; gap: ≥${MIN_SILENCE_S}s)`);
  console.log("");

  let totalScanned = 0;
  let totalOversized = 0;
  let totalSplit = 0;
  let totalSkippedNoTiming = 0;
  let totalSkippedFewGaps = 0;
  const planBySong: Array<{
    slug: string;
    version: string;
    oversized: number;
    splits: SplitPlan[];
    lesson: Lesson;
    song_version_id: string;
  }> = [];

  for (const row of rows) {
    totalScanned++;
    const lesson = row.lesson;
    if (!lesson || !Array.isArray(lesson.verses)) continue;

    const oversized = lesson.verses.filter(
      (v) => (v.tokens?.length ?? 0) > SPLIT_TOKEN_THRESHOLD
    );
    if (oversized.length === 0) continue;
    totalOversized += oversized.length;

    if (!row.timing_data || !Array.isArray(row.timing_data.words)) {
      totalSkippedNoTiming += oversized.length;
      continue;
    }

    const splits: SplitPlan[] = [];
    const updatedVerses: Verse[] = [];

    for (const verse of lesson.verses) {
      if ((verse.tokens?.length ?? 0) <= SPLIT_TOKEN_THRESHOLD) {
        updatedVerses.push(verse);
        continue;
      }
      const result = splitVerse(verse, row.timing_data);
      if (!result) {
        totalSkippedFewGaps++;
        updatedVerses.push(verse);
        continue;
      }
      totalSplit++;
      splits.push({
        oldVerseNumber: verse.verse_number,
        oldTokenCount: verse.tokens.length,
        newVerses: result,
      });
      updatedVerses.push(...result);
    }

    // Renumber
    updatedVerses.forEach((v, i) => {
      v.verse_number = i + 1;
    });

    if (splits.length === 0) continue;
    planBySong.push({
      slug: row.slug,
      version: row.version_type,
      oversized: oversized.length,
      splits,
      lesson: { ...lesson, verses: updatedVerses },
      song_version_id: row.song_version_id,
    });
  }

  // Summarise
  console.log(`scanned:                 ${totalScanned}`);
  console.log(`oversized verses total:  ${totalOversized}`);
  console.log(`split successfully:      ${totalSplit}`);
  console.log(`skipped (no timing):     ${totalSkippedNoTiming}`);
  console.log(`skipped (no gaps):       ${totalSkippedFewGaps}`);
  console.log(`songs affected:          ${planBySong.length}`);
  console.log("");

  planBySong.slice(0, 15).forEach((p) => {
    console.log(
      `  ${p.slug} (${p.version}): ${p.splits.length} verse splits`
    );
    p.splits.forEach((s) =>
      console.log(
        `    v${s.oldVerseNumber} (${s.oldTokenCount} tokens) → ${s.newVerses.length} sub-verses of [${s.newVerses.map((v) => v.tokens.length).join(", ")}]`
      )
    );
  });

  if (!APPLY) {
    console.log("\n(dry-run — pass --apply to persist)");
    return;
  }

  console.log(`\napplying to ${planBySong.length} songs...`);
  let written = 0;
  for (const plan of planBySong) {
    await db
      .update(songVersions)
      .set({ lesson: plan.lesson, updated_at: sql`NOW()` })
      .where(eq(songVersions.id, plan.song_version_id));
    written++;
  }
  console.log(`wrote ${written} song_version rows.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
