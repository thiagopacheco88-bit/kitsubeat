/**
 * 06-qa-geo-check.ts — Catalog-wide YouTube geo-availability audit (QA)
 *
 * Probes every `song_versions.youtube_id` against the YouTube Data API v3
 * (videos.list, batched up to 50 IDs per request) and classifies each as:
 *   - OK   : globally available + embeddable + public
 *   - GEO  : embeddable but blocked in (or not allowed in) target regions
 *   - GONE : video deleted, private, non-embeddable, or otherwise unavailable
 *
 * Single source of truth: this script reuses `fetchVideosMetadata` and
 * `classifyAvailability` from scripts/lib/youtube-search.ts — the same probe
 * helpers already used by scripts/backfill-geo-check.ts. We deliberately did
 * NOT create a third location (scripts/lib/youtube-availability.ts) because
 * that would be a third copy; the helpers are already exported from one place.
 *
 * Concurrency: probes run in batches of 50 IDs per HTTP call (videos.list is
 * batchable up to 50). With p-limit at 8 concurrent batches, the entire
 * ~700-video catalog completes in well under 5 minutes (typically <30s).
 *
 * Exit semantics:
 *   - 0 if all videos are OK (no GEO, no GONE)
 *   - 1 if any GEO or GONE rows exist
 *   - --allow-geo downgrades GEO to a warning (still exits 0 unless any GONE)
 *
 * Includes TV-pack rows: geo availability is orthogonal to lesson state — a
 * TV row with lesson=NULL still has a youtube_id that may be geo-blocked.
 *
 * Flags:
 *   --allow-geo  Operator escape hatch — GEO rows print as warnings, exit 0
 *   --json       Output structured per-video results as JSON to stdout
 *   --verbose    Print per-row OK lines (default: only GEO/GONE)
 *
 * Usage:
 *   npm run test:qa:geo
 *   npm run test:qa:geo -- --allow-geo
 *   npm run test:qa:geo -- --json
 */

import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";

// Load .env.local FIRST — before any DB imports
const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../../.env.local") });

import pLimit from "p-limit";
import { getDb } from "../../src/lib/db/index.js";
import { songs, songVersions } from "../../src/lib/db/schema.js";
import { eq } from "drizzle-orm";
import {
  fetchVideosMetadata,
  classifyAvailability,
  AMERICAS_REGIONS,
  YouTubeQuotaExceededError,
  type VideoMetadata,
} from "../lib/youtube-search.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GeoStatus = "ok" | "geo" | "gone";

interface GeoResult {
  slug: string;
  version_type: "tv" | "full";
  youtube_id: string;
  status: GeoStatus;
  blocked_regions?: string[];
  allowed_regions?: string[];
  embeddable?: boolean;
  reason?: string;
}

interface GeoReport {
  total: number;
  ok: number;
  geo: number;
  gone: number;
  results: GeoResult[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BATCH_SIZE = 50; // YouTube videos.list maximum
const CONCURRENCY = 8;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Map a single row + (possibly missing) metadata payload to a GeoResult.
 * If meta is undefined the YouTube API didn't return the ID at all → GONE.
 */
function classifyRow(
  row: { slug: string; version_type: "tv" | "full"; youtube_id: string },
  meta: VideoMetadata | undefined,
): GeoResult {
  if (!meta) {
    return {
      slug: row.slug,
      version_type: row.version_type,
      youtube_id: row.youtube_id,
      status: "gone",
      reason: "VIDEO_DELETED_OR_PRIVATE",
    };
  }

  const tier = classifyAvailability(meta, AMERICAS_REGIONS);
  const base = {
    slug: row.slug,
    version_type: row.version_type,
    youtube_id: row.youtube_id,
    blocked_regions: meta.regionRestriction?.blocked,
    allowed_regions: meta.regionRestriction?.allowed,
    embeddable: meta.embeddable,
  };

  if (!meta.embeddable || meta.privacyStatus !== "public") {
    return {
      ...base,
      status: "gone",
      reason:
        meta.privacyStatus !== "public"
          ? `PRIVACY=${meta.privacyStatus}`
          : "NOT_EMBEDDABLE",
    };
  }

  if (tier === "global" || tier === "americas") {
    // "americas" still means embeddable + not blocked in our target regions —
    // we report it as OK because target users can watch it. (CI runs from any
    // region; per-region blocks outside AMERICAS_REGIONS aren't user-facing.)
    return { ...base, status: "ok" };
  }

  return { ...base, status: "geo" };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function runGeoCheck(): Promise<void> {
  const args = process.argv.slice(2);
  const allowGeo = args.includes("--allow-geo");
  const isJson = args.includes("--json");
  const isVerbose = args.includes("--verbose");

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error(
      "Missing YOUTUBE_API_KEY in .env.local — required for YouTube videos.list probe.",
    );
    process.exit(1);
  }

  if (!isJson) {
    console.log("=== Catalog Geo-Availability Audit ===\n");
    console.log(
      `  Target regions: ${AMERICAS_REGIONS.join(", ")}  |  Concurrency: ${CONCURRENCY}\n`,
    );
  }

  const db = getDb();
  const rows = await db
    .select({
      slug: songs.slug,
      version_type: songVersions.version_type,
      youtube_id: songVersions.youtube_id,
    })
    .from(songVersions)
    .innerJoin(songs, eq(songs.id, songVersions.song_id));

  const withIds = rows.filter(
    (r): r is typeof r & { youtube_id: string } => r.youtube_id !== null,
  );

  if (!isJson) {
    console.log(`  Probing ${withIds.length} youtube_id(s)...\n`);
  }

  const batches = chunk(withIds, BATCH_SIZE);
  const limit = pLimit(CONCURRENCY);
  const results: GeoResult[] = [];

  // Each call to videos.list is 1 quota unit and accepts up to 50 IDs.
  // p-limit keeps at most CONCURRENCY HTTP calls in flight simultaneously.
  await Promise.all(
    batches.map((batch) =>
      limit(async () => {
        const ids = batch.map((r) => r.youtube_id);
        let metas: VideoMetadata[] = [];
        try {
          metas = await fetchVideosMetadata(ids, apiKey);
        } catch (err) {
          if (err instanceof YouTubeQuotaExceededError) {
            console.error(
              "[Quota exceeded] YouTube API daily quota hit. Try again tomorrow or set a new key.",
            );
            // Mark every row in this batch as unknown/GONE so we don't silently pass.
            for (const row of batch) {
              results.push({
                slug: row.slug,
                version_type: row.version_type,
                youtube_id: row.youtube_id,
                status: "gone",
                reason: "QUOTA_EXCEEDED",
              });
            }
            return;
          }
          throw err;
        }
        const metaById = new Map(metas.map((m) => [m.id, m]));
        for (const row of batch) {
          const result = classifyRow(row, metaById.get(row.youtube_id));
          results.push(result);
          if (!isJson) {
            const label = `${row.slug} — ${row.youtube_id}`;
            if (result.status === "ok") {
              if (isVerbose) console.log(`  OK   ${label}`);
            } else if (result.status === "geo") {
              const blocked = result.blocked_regions?.join(",") ?? "(allowlist)";
              console.log(`  GEO  ${label}  blocked=${blocked}`);
            } else {
              console.log(`  GONE ${label}  reason=${result.reason ?? "?"}`);
            }
          }
        }
      }),
    ),
  );

  // Stable order in the report — by slug then version_type — for deterministic JSON.
  results.sort((a, b) => {
    if (a.slug !== b.slug) return a.slug.localeCompare(b.slug);
    return a.version_type.localeCompare(b.version_type);
  });

  const counts = { ok: 0, geo: 0, gone: 0 };
  for (const r of results) counts[r.status]++;

  const report: GeoReport = {
    total: results.length,
    ok: counts.ok,
    geo: counts.geo,
    gone: counts.gone,
    results,
  };

  if (isJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log("\n=== Geo-Audit Summary ===");
    console.log(
      `  Total: ${report.total} | Available: ${report.ok} | Geo-restricted: ${report.geo} | Gone: ${report.gone}`,
    );
    if (allowGeo && report.geo > 0) {
      console.log(
        `  WARN: ${report.geo} GEO row(s) ignored due to --allow-geo flag.`,
      );
    }
    if (report.gone > 0) {
      console.log(
        `  FAIL: ${report.gone} video(s) are deleted, private, non-embeddable, or quota-exceeded.`,
      );
    }
    if (report.geo === 0 && report.gone === 0) {
      console.log("\n  RESULT: All catalog videos are available.");
    }
  }

  // Exit semantics:
  //   - any GONE → always exit 1 (videos are dead, no flag covers this)
  //   - any GEO without --allow-geo → exit 1
  //   - --allow-geo → exit 0 even if some are GEO (operator's regional escape)
  const hasFailures = report.gone > 0 || (!allowGeo && report.geo > 0);
  process.exit(hasFailures ? 1 : 0);
}

runGeoCheck().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
