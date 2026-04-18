/**
 * backfill-geo-check.ts — Audit existing youtube_id values for geo-restrictions.
 *
 * Fetches contentDetails + status for every stored youtube_id in song_versions,
 * classifies each as global / americas / restricted, and writes a CSV report.
 *
 * This is a READ-ONLY audit by default. Use --replace to attempt to find
 * alternative videos for restricted ones (uses extra search quota: ~101/replacement).
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/backfill-geo-check.ts
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/backfill-geo-check.ts --replace
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/backfill-geo-check.ts --limit 10
 *
 * Quota:
 * - Audit only: 1 unit per 50 videos = ~4 units for 200 songs
 * - With --replace: +101 units per restricted video that gets replaced
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { writeFileSync } from "fs";
import { getDb } from "../src/lib/db/index.js";
import { songs, songVersions } from "../src/lib/db/schema.js";
import { eq, and } from "drizzle-orm";
import {
  fetchVideosMetadata,
  classifyAvailability,
  searchYouTubeVideoId,
  AMERICAS_REGIONS,
  YouTubeQuotaExceededError,
} from "./lib/youtube-search.ts";

const BATCH_SIZE = 50;
const REPORT_PATH = "data/geo-audit-report.csv";

interface AuditRow {
  slug: string;
  title: string;
  artist: string;
  version_type: "tv" | "full";
  youtube_id: string;
  tier: "global" | "americas" | "restricted";
  blocked: string;
  allowed: string;
  embeddable: boolean;
  replacement_id?: string;
  replacement_tier?: string;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function csvEscape(v: string | number | boolean | undefined): string {
  if (v === undefined || v === null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
    return `"${s.replace(/"/g, "\"\"")}"`;
  }
  return s;
}

async function main() {
  const args = process.argv.slice(2);
  const replace = args.includes("--replace");
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : Infinity;

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error("Missing YOUTUBE_API_KEY in .env.local");
    process.exit(1);
  }

  console.log("=".repeat(60));
  console.log("Geo-Block Audit for stored YouTube IDs");
  console.log(`Mode: ${replace ? "AUDIT + REPLACE" : "AUDIT ONLY"}`);
  console.log(`Target regions: ${AMERICAS_REGIONS.join(", ")}`);
  console.log("=".repeat(60));

  const db = getDb();

  // 1. Fetch all rows with a youtube_id
  const rows = await db
    .select({
      slug: songs.slug,
      title: songs.title,
      artist: songs.artist,
      song_id: songs.id,
      version_type: songVersions.version_type,
      youtube_id: songVersions.youtube_id,
    })
    .from(songVersions)
    .innerJoin(songs, eq(songs.id, songVersions.song_id));

  const withIds = rows.filter(
    (r): r is typeof r & { youtube_id: string } => r.youtube_id !== null
  );
  console.log(`\nFound ${withIds.length} version rows with a youtube_id.`);

  // 2. Batch-check availability
  const audit: AuditRow[] = [];
  for (const batch of chunk(withIds, BATCH_SIZE)) {
    const ids = batch.map((r) => r.youtube_id);
    const metas = await fetchVideosMetadata(ids, apiKey);
    const metaById = new Map(metas.map((m) => [m.id, m]));

    for (const row of batch) {
      const meta = metaById.get(row.youtube_id);
      if (!meta) {
        audit.push({
          slug: row.slug,
          title: row.title,
          artist: row.artist,
          version_type: row.version_type,
          youtube_id: row.youtube_id,
          tier: "restricted",
          blocked: "VIDEO_DELETED_OR_PRIVATE",
          allowed: "",
          embeddable: false,
        });
        continue;
      }
      const tier = classifyAvailability(meta, AMERICAS_REGIONS);
      audit.push({
        slug: row.slug,
        title: row.title,
        artist: row.artist,
        version_type: row.version_type,
        youtube_id: row.youtube_id,
        tier,
        blocked: meta.regionRestriction?.blocked?.join("|") ?? "",
        allowed: meta.regionRestriction?.allowed?.join("|") ?? "",
        embeddable: meta.embeddable,
      });
    }
  }

  // 3. Summary
  const counts = { global: 0, americas: 0, restricted: 0 };
  for (const r of audit) counts[r.tier]++;
  const total = audit.length;
  console.log(`\n=== Audit Summary ===`);
  console.log(`  Global:     ${counts.global.toString().padStart(4)} (${Math.round((counts.global / total) * 100)}%)`);
  console.log(`  Americas:   ${counts.americas.toString().padStart(4)} (${Math.round((counts.americas / total) * 100)}%)`);
  console.log(`  Restricted: ${counts.restricted.toString().padStart(4)} (${Math.round((counts.restricted / total) * 100)}%)`);

  // 4. Optionally replace restricted videos
  if (replace) {
    const restricted = audit.filter((r) => r.tier === "restricted");
    const toReplace = restricted.slice(0, limit === Infinity ? restricted.length : limit);
    console.log(`\n=== Replacing ${toReplace.length} restricted videos ===`);
    console.log(`Estimated quota: ${toReplace.length * 101} units\n`);

    let replaced = 0;
    for (const row of toReplace) {
      console.log(`[${replaced + 1}/${toReplace.length}] ${row.slug} (${row.version_type})`);
      try {
        const result = await searchYouTubeVideoId(row.title, row.artist);
        if (result.videoId && result.videoId !== row.youtube_id && result.availability !== "restricted") {
          // Find song_id for this slug
          const [songRow] = await db
            .select({ id: songs.id })
            .from(songs)
            .where(eq(songs.slug, row.slug))
            .limit(1);

          if (songRow) {
            await db
              .update(songVersions)
              .set({ youtube_id: result.videoId, updated_at: new Date() })
              .where(
                and(
                  eq(songVersions.song_id, songRow.id),
                  eq(songVersions.version_type, row.version_type)
                )
              );
            console.log(`  → Replaced: ${row.youtube_id} → ${result.videoId} [${result.availability}]`);
            row.replacement_id = result.videoId;
            row.replacement_tier = result.availability;
            replaced++;
          }
        } else {
          console.log(`  → No better alternative found (best: ${result.videoId ?? "none"} [${result.availability}])`);
          row.replacement_id = "";
          row.replacement_tier = result.availability;
        }
      } catch (err) {
        if (err instanceof YouTubeQuotaExceededError) {
          console.error(`\n[Quota exceeded] Stopping. Replaced ${replaced} videos.`);
          break;
        }
        console.warn(`  → Error: ${err instanceof Error ? err.message : err}`);
      }
    }
    console.log(`\nReplaced ${replaced}/${toReplace.length} videos.`);
  }

  // 5. Write CSV report
  const headers = [
    "slug",
    "title",
    "artist",
    "version_type",
    "youtube_id",
    "tier",
    "blocked",
    "allowed",
    "embeddable",
    "replacement_id",
    "replacement_tier",
  ];
  const csv = [
    headers.join(","),
    ...audit.map((r) =>
      [
        r.slug,
        r.title,
        r.artist,
        r.version_type,
        r.youtube_id,
        r.tier,
        r.blocked,
        r.allowed,
        r.embeddable,
        r.replacement_id,
        r.replacement_tier,
      ]
        .map(csvEscape)
        .join(",")
    ),
  ].join("\n");

  writeFileSync(REPORT_PATH, csv, "utf-8");
  console.log(`\nReport written to ${REPORT_PATH}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
