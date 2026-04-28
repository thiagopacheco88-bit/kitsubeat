/**
 * snap-full-onsets.ts — Replace broken synced_lrc + per-song offset with
 * WhisperX-snapped per-verse timing for full-version lessons that fail
 * spot-check-full-onsets --player-path.
 *
 * Why: 12 full-version songs have synced_lrc whose line timestamps drift
 * up to 17s relative to the WhisperX-detected vocal entry. One
 * lyrics_offset_ms can't fix per-verse drift; auto-detect-lyrics-offset
 * already proposes the same offset that's stored, confirming the broken
 * data is in the LRC line timestamps themselves.
 *
 * Action per slug:
 *   1. Snapshot current row (lesson, synced_lrc, lyrics_offset_ms,
 *      lyrics_source) → .planning/snap-full-onsets-snapshot.json (committed)
 *   2. Compute new verse.start_time_ms via word-span methodology:
 *        - For verses passing spot-check: keep current player-resolved onset
 *          (LRC line + offset, baked into start_time_ms).
 *        - For verses failing spot-check: use the WhisperX word.start
 *          containing the failing onset.
 *      Set verse.end_time_ms = next verse's start_time_ms (last verse +5s).
 *   3. UPDATE song_versions SET
 *        synced_lrc = NULL
 *        lyrics_offset_ms = 0
 *        lyrics_source = 'whisper_transcription'  // honest about the source
 *        lesson = updated_lesson_jsonb
 *
 * Reversibility: restore-snap-full-onsets.ts (sibling script) reads the
 * snapshot and writes the row back. synced_lrc stays in lyrics-cache JSON
 * on disk so re-fetching from LRCLIB is also possible if needed.
 *
 * Usage:
 *   npx tsx scripts/seed/snap-full-onsets.ts                     # dry-run
 *   npx tsx scripts/seed/snap-full-onsets.ts --apply             # write to DB
 *   npx tsx scripts/seed/snap-full-onsets.ts --slugs s1,s2 --apply
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../../");
const STEM_DIR = join(PROJECT_ROOT, "data/timing-cache-stem");
const RAW_DIR = join(PROJECT_ROOT, "data/timing-cache");
const DEFAULT_SNAPSHOT_PATH = join(PROJECT_ROOT, ".planning/snap-full-onsets-snapshot.json");
const TOLERANCE_MS = 500;
const LAST_VERSE_TAIL_MS = 5_000;

interface Verse {
  verse_number: number;
  start_time_ms: number;
  end_time_ms: number;
  tokens?: Array<{ surface: string }>;
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

interface WhisperWord {
  word: string;
  start: number;
  end: number;
  score?: number;
}

interface TimingCache {
  words: WhisperWord[];
}

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const slugIdx = args.indexOf("--slugs");
const slugFilter =
  slugIdx !== -1 && args[slugIdx + 1]
    ? args[slugIdx + 1].split(",").map((s) => s.trim()).filter(Boolean)
    : null;
const snapshotIdx = args.indexOf("--snapshot");
const SNAPSHOT_PATH =
  snapshotIdx !== -1 && args[snapshotIdx + 1]
    ? resolve(args[snapshotIdx + 1])
    : DEFAULT_SNAPSHOT_PATH;

// Default cohort: the 12 player-path FAIL slugs from
// data/full-onset-report-playerpath.json. Keeping these explicit avoids
// accidental writes when the report file changes.
const DEFAULT_COHORT = [
  "tobira-no-mukou-e-yellow-generation",
  "vogel-im-kafig-cyua",
  "stars-w-o-d",
  "under-the-tree-sim",
  "hikari-hikaru-utada",
  "harukaze-scandal",
  "tk-0n-ttn-mika-kobayashi",
  "just-awake-fear-and-loathing-in-las-vegas",
  "chikai-hikaru-utada",
  "hope-namie-amuro",
  "brand-new-world-d-51",
  "the-rumbling-sim",
];

const targets = slugFilter ?? DEFAULT_COHORT;

// ---------------------------------------------------------------------------
// Load player-path resolver (same code path the LyricsPanel uses)
// ---------------------------------------------------------------------------
const { buildVerseTiming } = await import("../../src/lib/verse-timing.js");

function resolvePlayerOnset(
  verses: Verse[],
  syncedLrc: SyncedLine[] | null,
  offsetMs: number
): Map<number, number> {
  // Returns the runtime startMs the player would render for each verse,
  // already including lyrics_offset_ms. Mirrors LyricsPanel.tsx union strategy.
  const out = new Map<number, number>();
  const matched = syncedLrc
    ? buildVerseTiming(verses as unknown as Parameters<typeof buildVerseTiming>[0], syncedLrc)
    : new Map();
  for (const v of verses) {
    const m = matched.get(v.verse_number);
    const baseStart = m ? m.startMs : (v.start_time_ms ?? 0) > 0 ? v.start_time_ms : null;
    if (baseStart != null) out.set(v.verse_number, Math.max(0, baseStart + offsetMs));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Word-span snap (same rule as spot-check-full-onsets)
// ---------------------------------------------------------------------------
function snapOnset(onsetMs: number, words: WhisperWord[]): { snapped: number; needed: boolean } {
  for (const w of words) {
    if (!w.word || !w.word.trim()) continue;
    const sMs = Math.round(w.start * 1000);
    const eMs = Math.round(w.end * 1000);
    if (onsetMs > sMs && onsetMs < eMs) {
      const delta = onsetMs - sMs;
      if (Math.abs(delta) > TOLERANCE_MS) return { snapped: sMs, needed: true };
      return { snapped: onsetMs, needed: false };
    }
  }
  return { snapped: onsetMs, needed: false };
}

// ---------------------------------------------------------------------------
// Load timing cache (prefer stem; fall back to raw)
// ---------------------------------------------------------------------------
function loadTiming(slug: string): { words: WhisperWord[]; source: "stem" | "raw" } | null {
  const stem = join(STEM_DIR, `${slug}.json`);
  const raw = join(RAW_DIR, `${slug}.json`);
  if (existsSync(stem)) {
    return { words: (JSON.parse(readFileSync(stem, "utf-8")) as TimingCache).words ?? [], source: "stem" };
  }
  if (existsSync(raw)) {
    return { words: (JSON.parse(readFileSync(raw, "utf-8")) as TimingCache).words ?? [], source: "raw" };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Per-slug snap planning
// ---------------------------------------------------------------------------
interface VersePlan {
  verse_number: number;
  old_start_ms: number;
  new_start_ms: number;
  new_end_ms: number;
  source: "lrc-resolved" | "snap" | "kept-from-pass";
}

interface SlugPlan {
  slug: string;
  song_version_id: string;
  had_lrc: boolean;
  old_offset_ms: number;
  whisper_source: "stem" | "raw";
  verses_total: number;
  verses_snapped: number;
  plan: VersePlan[];
  snapshot: {
    synced_lrc: unknown;
    lyrics_offset_ms: number;
    lyrics_source: string | null;
    lesson: unknown;
  };
}

function planSlug(
  slug: string,
  songVersionId: string,
  lesson: Lesson,
  syncedLrc: SyncedLine[] | null,
  oldOffset: number,
  oldLyricsSource: string | null,
  words: WhisperWord[],
  whisperSource: "stem" | "raw"
): SlugPlan {
  const playerOnsets = resolvePlayerOnset(lesson.verses, syncedLrc, oldOffset);
  const plan: VersePlan[] = [];

  for (const v of lesson.verses) {
    const playerOnset = playerOnsets.get(v.verse_number);
    if (playerOnset == null) {
      // Player wouldn't render this verse — keep zero, will be ignored.
      plan.push({
        verse_number: v.verse_number,
        old_start_ms: v.start_time_ms,
        new_start_ms: 0,
        new_end_ms: 0,
        source: "kept-from-pass",
      });
      continue;
    }
    const { snapped, needed } = snapOnset(playerOnset, words);
    plan.push({
      verse_number: v.verse_number,
      old_start_ms: v.start_time_ms,
      new_start_ms: snapped,
      new_end_ms: 0, // filled below
      source: needed ? "snap" : "lrc-resolved",
    });
  }

  // Fill end_time_ms = next verse's start. Last verse gets +LAST_VERSE_TAIL_MS.
  for (let i = 0; i < plan.length; i++) {
    if (i + 1 < plan.length) {
      plan[i].new_end_ms = plan[i + 1].new_start_ms;
    } else {
      plan[i].new_end_ms = plan[i].new_start_ms + LAST_VERSE_TAIL_MS;
    }
  }

  return {
    slug,
    song_version_id: songVersionId,
    had_lrc: !!syncedLrc?.length,
    old_offset_ms: oldOffset,
    whisper_source: whisperSource,
    verses_total: plan.length,
    verses_snapped: plan.filter((p) => p.source === "snap").length,
    plan,
    snapshot: {
      synced_lrc: syncedLrc,
      lyrics_offset_ms: oldOffset,
      lyrics_source: oldLyricsSource,
      lesson,
    },
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const { getDb } = await import("../../src/lib/db/index.js");
const { songs, songVersions } = await import("../../src/lib/db/schema.js");
const { and, eq, inArray } = await import("drizzle-orm");

const db = getDb();

console.log(`[snap] mode=${apply ? "APPLY" : "DRY-RUN"}  cohort=${targets.length} slugs`);
console.log(`[snap] querying DB...`);

const tStart = Date.now();
const rows = await db
  .select({
    sv_id: songVersions.id,
    slug: songs.slug,
    lesson: songVersions.lesson,
    synced_lrc: songVersions.synced_lrc,
    lyrics_offset_ms: songVersions.lyrics_offset_ms,
    lyrics_source: songVersions.lyrics_source,
  })
  .from(songVersions)
  .innerJoin(songs, eq(songs.id, songVersions.song_id))
  .where(and(eq(songVersions.version_type, "full"), inArray(songs.slug, targets)));

console.log(`[snap] DB returned ${rows.length} rows in ${Date.now() - tStart}ms`);

const plans: SlugPlan[] = [];
const skipped: Array<{ slug: string; reason: string }> = [];

for (const row of rows) {
  if (!row.lesson) {
    skipped.push({ slug: row.slug, reason: "lesson is null" });
    continue;
  }
  const timing = loadTiming(row.slug);
  if (!timing) {
    skipped.push({ slug: row.slug, reason: "no timing-cache file" });
    continue;
  }
  const lesson = row.lesson as Lesson;
  const syncedLrc = (row.synced_lrc as SyncedLine[] | null) ?? null;
  plans.push(
    planSlug(
      row.slug,
      row.sv_id,
      lesson,
      syncedLrc,
      row.lyrics_offset_ms ?? 0,
      row.lyrics_source ?? null,
      timing.words,
      timing.source
    )
  );
}

console.log(`\n## Snap plan (${plans.length} slugs, ${skipped.length} skipped)\n`);
console.log(`| Slug | Verses | Snapped | LRC | Offset | Whisper |`);
console.log(`|------|--------|---------|-----|--------|---------|`);
for (const p of plans) {
  console.log(
    `| ${p.slug} | ${p.verses_total} | ${p.verses_snapped} | ${p.had_lrc ? "yes" : "no"} | ${p.old_offset_ms} | ${p.whisper_source} |`
  );
}
if (skipped.length) {
  console.log(`\nSkipped:`);
  for (const s of skipped) console.log(`  ${s.slug}: ${s.reason}`);
}

// Write snapshot before any DB write
const snapshot = {
  generated_at: new Date().toISOString(),
  scope: targets,
  rows: plans.map((p) => ({
    slug: p.slug,
    song_version_id: p.song_version_id,
    snapshot: p.snapshot,
  })),
};
mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), "utf-8");
console.log(`\nSnapshot written: ${SNAPSHOT_PATH} (${(JSON.stringify(snapshot).length / 1024).toFixed(0)}KB)`);

if (!apply) {
  console.log(`\n(dry-run — re-run with --apply to write to DB)`);
  process.exit(0);
}

// APPLY phase
console.log(`\n[snap] applying ${plans.length} updates...`);
let applied = 0;
const failed: string[] = [];

for (const p of plans) {
  try {
    const newLesson = {
      ...((p.snapshot.lesson as Lesson) ?? {}),
      verses: ((p.snapshot.lesson as Lesson).verses ?? []).map((v) => {
        const planEntry = p.plan.find((x) => x.verse_number === v.verse_number);
        if (!planEntry) return v;
        return {
          ...v,
          start_time_ms: planEntry.new_start_ms,
          end_time_ms: planEntry.new_end_ms,
        };
      }),
    };
    await db
      .update(songVersions)
      .set({
        synced_lrc: null,
        lyrics_offset_ms: 0,
        lyrics_source: "whisper_transcription",
        lesson: newLesson,
      })
      .where(eq(songVersions.id, p.song_version_id));
    applied++;
    process.stdout.write(`\r  ${applied}/${plans.length} applied`);
  } catch (err) {
    failed.push(`${p.slug}: ${(err as Error).message}`);
  }
}
console.log();
if (failed.length) {
  console.log(`\nfailed:`);
  for (const f of failed) console.log(`  ${f}`);
}
console.log(`\n[snap] complete. Restore with: scripts/seed/restore-snap-full-onsets.ts`);
process.exit(failed.length ? 1 : 0);
