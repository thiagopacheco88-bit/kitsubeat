/**
 * 01b-enrich-youtube-ids.ts — Fill `youtube_id` for any manifest entry where it's null.
 *
 * Use case: after promoting `data/songs-candidates.json` entries into
 * `data/songs-manifest.json`, the new rows have `youtube_id: null`. This script
 * runs the same `searchYouTubeVideoId` query used by `01-build-manifest.ts` and
 * patches each null entry in place. It does NOT touch entries that already have
 * a youtube_id, and it checkpoints after every search so a quota-exceeded crash
 * doesn't lose progress.
 *
 * Cost: 100 YouTube quota units per song (default daily limit 10k = 100/day).
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/01b-enrich-youtube-ids.ts
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/01b-enrich-youtube-ids.ts --limit 5
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/01b-enrich-youtube-ids.ts --dry-run
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync, writeFileSync } from "fs";
import {
  searchYouTubeVideoId,
  YouTubeQuotaExceededError,
} from "../lib/youtube-search.ts";
import { SongManifestSchema, type SongManifestEntry } from "../types/manifest.ts";

const MANIFEST_PATH = "data/songs-manifest.json";
const CANDIDATES_PATH = "data/songs-candidates.json";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const fromCandidates = args.includes("--from-candidates");
  const limitFlag = args.indexOf("--limit");
  const limit =
    limitFlag !== -1 ? parseInt(args[limitFlag + 1], 10) : Infinity;

  const raw = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
  const manifest: SongManifestEntry[] = SongManifestSchema.parse(raw);

  // Optional slug filter from candidates file
  let allowedSlugs: Set<string> | null = null;
  if (fromCandidates) {
    const candidates = JSON.parse(readFileSync(CANDIDATES_PATH, "utf-8")) as Array<{ slug: string }>;
    allowedSlugs = new Set(candidates.map((c) => c.slug));
    console.log(`[01b] --from-candidates: restricting to ${allowedSlugs.size} slugs from ${CANDIDATES_PATH}`);
  }

  const pending = manifest.filter(
    (s) => s.youtube_id === null && (!allowedSlugs || allowedSlugs.has(s.slug))
  );
  console.log(
    `[01b] Manifest: ${manifest.length} total, ${pending.length} pending youtube_id (after filter)`
  );
  console.log(`[01b] Mode: ${dryRun ? "DRY RUN" : "LIVE"}, limit: ${limit === Infinity ? "none" : limit}`);

  if (pending.length === 0) {
    console.log("[01b] Nothing to do.");
    return;
  }

  let searched = 0;
  let found = 0;

  for (const song of pending) {
    if (searched >= limit) break;

    const query = `${song.title} ${song.artist} official`;
    if (dryRun) {
      console.log(`  [DRY] ${song.slug} -> "${query}"`);
      searched++;
      continue;
    }

    try {
      console.log(
        `  [${searched + 1}/${Math.min(limit, pending.length)}] ${song.slug}`
      );
      const id = await searchYouTubeVideoId(song.title, song.artist);
      if (id) {
        song.youtube_id = id;
        found++;
        console.log(`    -> https://www.youtube.com/watch?v=${id}`);
      } else {
        console.log(`    -> no result`);
      }
      searched++;

      // Checkpoint after every search so a crash doesn't lose progress
      writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");

      // Be polite
      await new Promise((r) => setTimeout(r, 250));
    } catch (err) {
      if (err instanceof YouTubeQuotaExceededError) {
        console.error(`\n[01b] QUOTA EXCEEDED after ${searched} searches.`);
        console.error(`[01b] Progress saved. Re-run tomorrow.`);
        return;
      }
      console.warn(
        `    -> error: ${err instanceof Error ? err.message : err}`
      );
      searched++;
    }
  }

  console.log(
    `\n[01b] Done. Searched: ${searched}, found: ${found}, est. quota used: ~${searched * 100}`
  );
}

main().catch((err) => {
  console.error("[01b] fatal:", err);
  process.exit(1);
});
