/**
 * 10-prepare-tv.ts — Prepare the TV-cut content pipeline from existing DB rows.
 *
 * Precondition:
 *   09-find-tv-size.ts has run and populated song_versions rows with
 *   version_type='tv' and a youtube_id. Those rows still have lesson=NULL.
 *
 * This script does NOT call any external APIs. It only reads the DB and
 * writes local files needed by the downstream TV pipeline steps:
 *
 *   1. data/songs-manifest-tv.json — [{slug, youtube_id}] consumable by
 *      04-extract-timing.py --batch (WhisperX timing extraction).
 *   2. data/lyrics-cache-tv/{slug}.json — pending_whisper stubs so that
 *      04b-backfill-whisper-lyrics.ts --version tv can later fill raw_lyrics
 *      and tokens from the WhisperX output.
 *
 * Idempotent: re-running overwrites the manifest and leaves existing
 * lyrics-cache-tv entries alone (stubs are only created when missing).
 *
 * Full TV pipeline (ordered):
 *   1. npx tsx scripts/seed/09-find-tv-size.ts
 *   2. npx tsx scripts/seed/10-prepare-tv.ts                              <-- this script
 *   3. python scripts/seed/04-extract-timing.py \
 *        --batch data/songs-manifest-tv.json \
 *        --output-dir data/timing-cache-tv
 *   4. npx tsx scripts/seed/04b-backfill-whisper-lyrics.ts --version tv
 *   5. npx tsx scripts/seed/03-generate-content.ts --version tv
 *   6. npx tsx scripts/seed/05-insert-db.ts --version tv
 *
 * Usage:
 *   npx tsx scripts/seed/10-prepare-tv.ts
 */

import { config } from "dotenv";

// Load .env.local FIRST — must happen before getDb() is called
config({ path: ".env.local" });

import { mkdirSync, writeFileSync, existsSync } from "fs";
import { resolve, join } from "path";
import { fileURLToPath } from "url";
import { eq } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";
import { songs, songVersions } from "../../src/lib/db/schema.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../../");

const TV_MANIFEST_PATH = join(PROJECT_ROOT, "data/songs-manifest-tv.json");
const LYRICS_CACHE_TV_DIR = join(PROJECT_ROOT, "data/lyrics-cache-tv");

interface TvManifestEntry {
  slug: string;
  youtube_id: string;
}

interface PendingWhisperStub {
  slug: string;
  title: string;
  artist: string;
  source: "pending_whisper";
  raw_lyrics: "";
  synced_lrc: null;
  tokens: [];
}

async function main(): Promise<void> {
  console.log("=== 10-prepare-tv: Build TV manifest + pending_whisper stubs ===\n");

  const db = getDb();

  const rows = await db
    .select({
      slug: songs.slug,
      title: songs.title,
      artist: songs.artist,
      youtube_id: songVersions.youtube_id,
    })
    .from(songVersions)
    .innerJoin(songs, eq(songs.id, songVersions.song_id))
    .where(eq(songVersions.version_type, "tv"));

  console.log(`  Found ${rows.length} TV version rows in DB`);

  const manifestEntries: TvManifestEntry[] = [];
  const missingYoutubeId: string[] = [];

  for (const row of rows) {
    if (!row.youtube_id) {
      missingYoutubeId.push(row.slug);
      continue;
    }
    manifestEntries.push({ slug: row.slug, youtube_id: row.youtube_id });
  }

  if (missingYoutubeId.length > 0) {
    console.warn(
      `  [WARN] ${missingYoutubeId.length} TV rows have NULL youtube_id — skipping: ${missingYoutubeId
        .slice(0, 5)
        .join(", ")}${missingYoutubeId.length > 5 ? " …" : ""}`
    );
  }

  // 1. Write TV manifest
  writeFileSync(
    TV_MANIFEST_PATH,
    JSON.stringify(manifestEntries, null, 2),
    "utf-8"
  );
  console.log(
    `  [OK] Wrote TV manifest: ${TV_MANIFEST_PATH} (${manifestEntries.length} songs)`
  );

  // 2. Write pending_whisper stubs for each TV song (if not present)
  mkdirSync(LYRICS_CACHE_TV_DIR, { recursive: true });

  let stubsCreated = 0;
  let stubsSkipped = 0;

  for (const row of rows) {
    if (!row.youtube_id) continue;
    const stubPath = join(LYRICS_CACHE_TV_DIR, `${row.slug}.json`);
    if (existsSync(stubPath)) {
      stubsSkipped++;
      continue;
    }
    const stub: PendingWhisperStub = {
      slug: row.slug,
      title: row.title,
      artist: row.artist,
      source: "pending_whisper",
      raw_lyrics: "",
      synced_lrc: null,
      tokens: [],
    };
    writeFileSync(stubPath, JSON.stringify(stub, null, 2), "utf-8");
    stubsCreated++;
  }

  console.log(
    `  [OK] Pending-whisper stubs: ${stubsCreated} created, ${stubsSkipped} already existed`
  );

  console.log("\n=== Next steps ===");
  console.log(
    "  python scripts/seed/04-extract-timing.py --batch data/songs-manifest-tv.json --output-dir data/timing-cache-tv"
  );
  console.log(
    "  npx tsx scripts/seed/04b-backfill-whisper-lyrics.ts --version tv"
  );
  console.log("  npx tsx scripts/seed/03-generate-content.ts --version tv");
  console.log("  npx tsx scripts/seed/05-insert-db.ts --version tv");
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
