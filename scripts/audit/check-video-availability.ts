/**
 * scripts/audit/check-video-availability.ts
 *
 * Scans all songs with YouTube videos and marks any blocked/removed/private
 * videos by setting songs.is_available = false.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/audit/check-video-availability.ts
 *
 * Options:
 *   --dry-run   Print findings without writing to the DB
 *   --fix       Write is_available = false/true to DB (default: dry-run)
 *
 * Rate-limiting: 300ms between requests to avoid triggering YouTube's limit.
 */

import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { songs, songVersions } from "@/lib/db/schema";
import {
  checkVideoAvailability,
  isAvailable,
  type VideoAvailabilityResult,
} from "@/lib/youtube/check-availability";

const DRY_RUN = !process.argv.includes("--fix");
const DELAY_MS = 300;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log(`\n🎬 KitsuBeat — Video Availability Audit`);
  console.log(`   Mode: ${DRY_RUN ? "DRY RUN (pass --fix to write)" : "WRITE"}\n`);

  // Fetch all songs with at least one youtube_id
  const rows = await db
    .select({
      id: songs.id,
      slug: songs.slug,
      title: songs.title,
      is_available: songs.is_available,
      youtube_ids: sql<string[]>`
        ARRAY(
          SELECT sv.youtube_id
          FROM song_versions sv
          WHERE sv.song_id = songs.id AND sv.youtube_id IS NOT NULL
        )
      `,
    })
    .from(songs)
    .orderBy(songs.slug);

  const songsWithVideos = rows.filter((r) => r.youtube_ids.length > 0);
  console.log(`Found ${songsWithVideos.length} songs with YouTube videos.\n`);

  const blocked: Array<{ slug: string; title: string; results: VideoAvailabilityResult[] }> = [];
  const nowAvailable: Array<{ slug: string; title: string }> = [];
  let checked = 0;

  for (const song of songsWithVideos) {
    const results: VideoAvailabilityResult[] = [];
    for (const youtubeId of song.youtube_ids) {
      const result = await checkVideoAvailability(youtubeId);
      results.push(result);
      await sleep(DELAY_MS);
    }

    // Song is considered available if ANY video version is playable
    const songAvailable = results.some(isAvailable);
    checked++;
    process.stdout.write(`\r  Checked ${checked}/${songsWithVideos.length}...`);

    if (!songAvailable) {
      blocked.push({ slug: song.slug, title: song.title, results });
      if (!DRY_RUN && song.is_available) {
        await db
          .update(songs)
          .set({ is_available: false })
          .where(eq(songs.id, song.id));
      }
    } else if (!song.is_available) {
      // Previously blocked but now available — restore
      nowAvailable.push({ slug: song.slug, title: song.title });
      if (!DRY_RUN) {
        await db
          .update(songs)
          .set({ is_available: true })
          .where(eq(songs.id, song.id));
      }
    }
  }

  console.log(`\n\n✅ Checked ${checked} songs.\n`);

  if (blocked.length === 0 && nowAvailable.length === 0) {
    console.log("All videos are available. No changes needed.");
    return;
  }

  if (blocked.length > 0) {
    console.log(`❌ BLOCKED / REMOVED (${blocked.length}):\n`);
    for (const { slug, title, results } of blocked) {
      console.log(`  • ${title} (${slug})`);
      for (const r of results) {
        console.log(`    ${r.youtubeId} → ${r.status} (HTTP ${r.httpStatus ?? "timeout"})`);
      }
    }
    console.log();
  }

  if (nowAvailable.length > 0) {
    console.log(`🔄 RESTORED (was blocked, now available) (${nowAvailable.length}):\n`);
    for (const { slug, title } of nowAvailable) {
      console.log(`  • ${title} (${slug})`);
    }
    console.log();
  }

  if (DRY_RUN) {
    console.log("⚠️  DRY RUN — no DB changes made. Pass --fix to apply.\n");
  } else {
    console.log(`✅ DB updated: ${blocked.length} marked unavailable, ${nowAvailable.length} restored.\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
