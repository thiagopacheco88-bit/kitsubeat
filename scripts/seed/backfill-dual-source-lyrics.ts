/**
 * backfill-dual-source-lyrics.ts — One-time backfill of canonical_lyrics and
 * whisper_lyrics columns added by drizzle/0013_dual_source_lyrics.sql.
 *
 * For every song_versions row where version_type='full', this script:
 *   1. Reconstructs canonical_lyrics from:
 *        a. data/lyrics-cache/_rejected/{slug}.json (original lrclib that was
 *           overwritten by a past validator REJECT — highest fidelity), OR
 *        b. data/lyrics-cache/{slug}.json IF its source is lrclib/genius/
 *           genius_canonical (the active cache is still canonical), OR
 *        c. null (song was always pending_whisper).
 *   2. Reconstructs whisper_lyrics from:
 *        a. data/timing-cache-stem/{slug}.json (Demucs+WhisperX stems —
 *           higher kCov), OR
 *        b. data/timing-cache/{slug}.json (original WhisperX), OR
 *        c. null (no transcription on disk yet).
 *
 * Both jsonb objects are immutable per-source records. The active rendered
 * lyrics_source / synced_lrc / raw_lyrics columns are NOT changed by this
 * script — it only fills the new dual-source columns.
 *
 * Idempotent: re-running just rewrites both columns from disk. No deletes.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/backfill-dual-source-lyrics.ts
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/backfill-dual-source-lyrics.ts --dry-run
 */

import { config } from "dotenv";
import { readFileSync, existsSync, statSync } from "fs";
import { resolve, join } from "path";
import { fileURLToPath } from "url";
import { eq, and } from "drizzle-orm";

config({ path: ".env.local" });

import { getDb } from "../../src/lib/db/index.js";
import { songs, songVersions } from "../../src/lib/db/schema.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../../");

const LYRICS_CACHE_DIR = join(PROJECT_ROOT, "data/lyrics-cache");
const REJECTED_DIR = join(LYRICS_CACHE_DIR, "_rejected");
const TIMING_CACHE_DIR = join(PROJECT_ROOT, "data/timing-cache");
const TIMING_STEM_DIR = join(PROJECT_ROOT, "data/timing-cache-stem");

const isDryRun = process.argv.includes("--dry-run");

type CanonicalSource = "lrclib" | "genius" | "genius_canonical";

interface LyricsCacheEntry {
  slug: string;
  title?: string;
  artist?: string;
  source: string;
  raw_lyrics?: string;
  synced_lrc?: Array<{ startMs: number; text: string }> | null;
}

interface TimingCacheEntry {
  slug: string;
  youtube_id?: string;
  words?: Array<{ word: string; start: number; end: number; score?: number }>;
  segments?: Array<{ start: number; end: number; text: string }>;
}

interface CanonicalLyricsJson {
  source: CanonicalSource;
  raw_lyrics: string;
  synced_lrc: Array<{ startMs: number; text: string }> | null;
  fetched_at: string | null;
}

interface WhisperLyricsJson {
  model: "whisperx-large-v3" | "demucs+whisperx-large-v3";
  raw_lyrics: string;
  words: Array<{ word: string; start: number; end: number; score?: number }>;
  kcov_against_canonical: number | null;
  transcribed_at: string | null;
}

const CANONICAL_SOURCES = new Set<string>([
  "lrclib",
  "genius",
  "genius_canonical",
]);

function fileMTime(path: string): string | null {
  try {
    return statSync(path).mtime.toISOString();
  } catch {
    return null;
  }
}

function readJsonOrNull<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return null;
  }
}

function buildCanonicalLyrics(slug: string): CanonicalLyricsJson | null {
  const rejectedPath = join(REJECTED_DIR, `${slug}.json`);
  const rejected = readJsonOrNull<LyricsCacheEntry>(rejectedPath);
  if (rejected && CANONICAL_SOURCES.has(rejected.source)) {
    return {
      source: rejected.source as CanonicalSource,
      raw_lyrics: rejected.raw_lyrics ?? "",
      synced_lrc: rejected.synced_lrc ?? null,
      fetched_at: fileMTime(rejectedPath),
    };
  }

  const activePath = join(LYRICS_CACHE_DIR, `${slug}.json`);
  const active = readJsonOrNull<LyricsCacheEntry>(activePath);
  if (active && CANONICAL_SOURCES.has(active.source)) {
    return {
      source: active.source as CanonicalSource,
      raw_lyrics: active.raw_lyrics ?? "",
      synced_lrc: active.synced_lrc ?? null,
      fetched_at: fileMTime(activePath),
    };
  }

  return null;
}

function buildWhisperLyrics(slug: string): WhisperLyricsJson | null {
  const stemPath = join(TIMING_STEM_DIR, `${slug}.json`);
  const stem = readJsonOrNull<TimingCacheEntry>(stemPath);
  if (stem && stem.words && stem.words.length > 0) {
    return {
      model: "demucs+whisperx-large-v3",
      raw_lyrics: stem.words.map((w) => w.word).join(""),
      words: stem.words,
      kcov_against_canonical: null,
      transcribed_at: fileMTime(stemPath),
    };
  }

  const origPath = join(TIMING_CACHE_DIR, `${slug}.json`);
  const orig = readJsonOrNull<TimingCacheEntry>(origPath);
  if (orig && orig.words && orig.words.length > 0) {
    return {
      model: "whisperx-large-v3",
      raw_lyrics: orig.words.map((w) => w.word).join(""),
      words: orig.words,
      kcov_against_canonical: null,
      transcribed_at: fileMTime(origPath),
    };
  }

  return null;
}

async function main(): Promise<void> {
  console.log(
    `=== backfill-dual-source-lyrics ${isDryRun ? "(DRY RUN)" : ""} ===\n`
  );

  const db = getDb();

  const rows = await db
    .select({
      version_id: songVersions.id,
      slug: songs.slug,
    })
    .from(songVersions)
    .innerJoin(songs, eq(songVersions.song_id, songs.id))
    .where(eq(songVersions.version_type, "full"));

  console.log(`  Loaded ${rows.length} full-version rows from DB\n`);

  const counts = {
    canonical_from_rejected: 0,
    canonical_from_active: 0,
    canonical_null: 0,
    whisper_from_stem: 0,
    whisper_from_orig: 0,
    whisper_null: 0,
    updated: 0,
    errors: 0,
  };

  for (const row of rows) {
    const canonical = buildCanonicalLyrics(row.slug);
    const whisper = buildWhisperLyrics(row.slug);

    // Tally provenance
    if (canonical === null) counts.canonical_null++;
    else if (existsSync(join(REJECTED_DIR, `${row.slug}.json`)))
      counts.canonical_from_rejected++;
    else counts.canonical_from_active++;

    if (whisper === null) counts.whisper_null++;
    else if (whisper.model === "demucs+whisperx-large-v3")
      counts.whisper_from_stem++;
    else counts.whisper_from_orig++;

    if (isDryRun) {
      const c = canonical ? canonical.source : "—";
      const w = whisper ? whisper.model : "—";
      console.log(`  [DRY] ${row.slug.padEnd(50)} canonical=${c.padEnd(18)} whisper=${w}`);
      continue;
    }

    try {
      await db
        .update(songVersions)
        .set({
          canonical_lyrics: canonical as unknown as Record<string, unknown> | null,
          whisper_lyrics: whisper as unknown as Record<string, unknown> | null,
          updated_at: new Date(),
        })
        .where(eq(songVersions.id, row.version_id));
      counts.updated++;
    } catch (err) {
      console.error(`  [ERROR] ${row.slug}: ${(err as Error).message}`);
      counts.errors++;
    }
  }

  console.log("\n=== Results ===");
  console.log(`  canonical_lyrics:  ${counts.canonical_from_rejected} from _rejected/, ${counts.canonical_from_active} from active cache, ${counts.canonical_null} null`);
  console.log(`  whisper_lyrics:    ${counts.whisper_from_stem} from Demucs stems, ${counts.whisper_from_orig} from original Whisper, ${counts.whisper_null} null`);
  if (!isDryRun) {
    console.log(`  Updated rows:      ${counts.updated}`);
    console.log(`  Errors:            ${counts.errors}`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
