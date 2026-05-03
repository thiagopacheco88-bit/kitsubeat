/**
 * Walks every song_versions row that has synced_lrc, runs the same
 * buildVerseTiming the UI uses, and reports any verse_numbers that came back
 * without a timing entry — those are silently skipped at play time.
 *
 * Usage:
 *   npx tsx scripts/debug/audit-verse-timing.ts          # summary
 *   npx tsx scripts/debug/audit-verse-timing.ts --csv    # csv to stdout
 *   npx tsx scripts/debug/audit-verse-timing.ts --slug change-miwa
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb } from "../../src/lib/db/index.js";
import { songs, songVersions } from "../../src/lib/db/schema.js";
import { eq } from "drizzle-orm";
import { buildVerseTiming as buildVerseTimingFixed, type SyncedLine, normalizeForMatch } from "../../src/lib/verse-timing.js";
import type { Verse } from "../../src/lib/types/lesson.js";

interface Lesson { verses: Verse[] }

/** Pre-fix matcher (bidirectional startsWith only) — kept here to size the bug's blast radius. */
function buildVerseTimingLegacy(
  verses: Verse[],
  syncedLrc: SyncedLine[]
): Map<number, { startMs: number; endMs: number }> {
  const result = new Map<number, { startMs: number; endMs: number }>();
  if (!syncedLrc.length || !verses.length) return result;
  let lrcIdx = 0;
  for (const verse of verses) {
    const verseText = normalizeForMatch(verse.tokens.map((t) => t.surface).join(""));
    if (!verseText) continue;
    let verseStartMs = -1;
    let verseEndMs = -1;
    let accumulated = "";
    const searchStart = Math.max(0, lrcIdx - 1);
    for (let i = searchStart; i < syncedLrc.length; i++) {
      const lineText = normalizeForMatch(syncedLrc[i].text);
      if (!lineText) continue;
      const testAccumulated = accumulated + lineText;
      if (verseText.startsWith(testAccumulated) || testAccumulated.startsWith(verseText.slice(0, testAccumulated.length))) {
        if (verseStartMs === -1) verseStartMs = syncedLrc[i].startMs;
        accumulated = testAccumulated;
        lrcIdx = i + 1;
        if (accumulated.length >= verseText.length * 0.7) {
          verseEndMs = i + 1 < syncedLrc.length ? syncedLrc[i + 1].startMs : syncedLrc[i].startMs + 5000;
          break;
        }
      }
    }
    if (verseStartMs >= 0) {
      if (verseEndMs < 0) verseEndMs = verseStartMs + 10000;
      result.set(verse.verse_number, { startMs: verseStartMs, endMs: verseEndMs });
    }
  }
  return result;
}

interface Finding {
  slug: string;
  song_id: string;
  version_type: string;
  total_verses: number;
  matched: number;
  dropped: number[];
  first_dropped_text: string;
  example_lrc: string | null;
}

const args = process.argv.slice(2);
const csvMode = args.includes("--csv");
const useLegacy = args.includes("--legacy");
const slugFilter = args.includes("--slug") ? args[args.indexOf("--slug") + 1] : null;
const buildVerseTiming = useLegacy ? buildVerseTimingLegacy : buildVerseTimingFixed;

const db = getDb();

const rows = slugFilter
  ? await db.select({ song: songs, ver: songVersions })
      .from(songVersions)
      .innerJoin(songs, eq(songVersions.song_id, songs.id))
      .where(eq(songs.slug, slugFilter))
  : await db.select({ song: songs, ver: songVersions })
      .from(songVersions)
      .innerJoin(songs, eq(songVersions.song_id, songs.id));

const findings: Finding[] = [];
let scanned = 0;
let skippedNoSync = 0;

for (const r of rows) {
  scanned++;
  const lesson = r.ver.lesson as Lesson | null;
  const synced = (r.ver.synced_lrc as SyncedLine[] | null) ?? null;
  if (!lesson?.verses?.length) continue;
  if (!synced?.length) { skippedNoSync++; continue; }

  const timing = buildVerseTiming(lesson.verses, synced);
  const dropped: number[] = [];
  for (const v of lesson.verses) {
    if (!timing.has(v.verse_number)) dropped.push(v.verse_number);
  }
  if (!dropped.length) continue;

  const firstDroppedVerse = lesson.verses.find((v) => v.verse_number === dropped[0])!;
  const firstDroppedText = firstDroppedVerse.tokens.map((t) => t.surface).join("");
  // Find a likely matching LRC line (contains some chars of the verse) to
  // help the human eyeball the mismatch.
  const probe = firstDroppedText.replace(/\s+/g, "").slice(0, 5);
  const exampleLrc = probe
    ? synced.find((l) => l.text.includes(probe))?.text ?? null
    : null;

  findings.push({
    slug: r.song.slug,
    song_id: r.song.id,
    version_type: r.ver.version_type,
    total_verses: lesson.verses.length,
    matched: timing.size,
    dropped,
    first_dropped_text: firstDroppedText,
    example_lrc: exampleLrc,
  });
}

if (csvMode) {
  console.log("slug,version_type,total_verses,matched,dropped_count,dropped_verses,first_dropped_text,example_lrc_line");
  for (const f of findings) {
    const csv = [
      f.slug,
      f.version_type,
      f.total_verses,
      f.matched,
      f.dropped.length,
      `"${f.dropped.join(";")}"`,
      `"${f.first_dropped_text.replace(/"/g, '""')}"`,
      f.example_lrc ? `"${f.example_lrc.replace(/"/g, '""')}"` : "",
    ];
    console.log(csv.join(","));
  }
} else {
  findings.sort((a, b) => b.dropped.length - a.dropped.length);
  console.log(`scanned ${scanned} rows | ${skippedNoSync} skipped (no synced_lrc) | ${findings.length} have ≥1 dropped verse`);
  console.log("");
  console.log("worst offenders (top 30):");
  for (const f of findings.slice(0, 30)) {
    console.log(
      `  ${f.slug.padEnd(50)} ${f.version_type.padEnd(8)} ` +
      `${f.dropped.length}/${f.total_verses} dropped | first: "${f.first_dropped_text.slice(0, 30)}" ↔ "${(f.example_lrc ?? "").slice(0, 40)}"`
    );
  }
  const totalDroppedVerses = findings.reduce((sum, f) => sum + f.dropped.length, 0);
  console.log(`\ntotals: ${findings.length} broken songs, ${totalDroppedVerses} dropped verses across catalog`);
}

process.exit(0);
