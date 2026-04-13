/**
 * 03-generate-content.ts — Submit all songs to Claude Batch API for lesson generation.
 *
 * Pipeline:
 * 1. Read data/songs-manifest.json
 * 2. Read all lyrics cache files from data/lyrics-cache/
 * 3. Skip songs that already have a lesson in data/lessons-cache/{slug}.json
 * 4. Build batch requests and submit to Claude Batch API
 * 5. Poll until complete, stream results
 * 6. Validate each result against LessonSchema (Zod)
 * 7. Write validated lessons to data/lessons-cache/{slug}.json
 *
 * Supports checkpoint/resume: re-running will skip already-cached lessons.
 * Supports --limit N flag: process only first N un-cached songs (useful for testing).
 *
 * Usage:
 *   npx tsx scripts/seed/03-generate-content.ts
 *   npx tsx scripts/seed/03-generate-content.ts --limit 5
 */

import { config } from "dotenv";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { readdirSync } from "fs";
import { resolve, join } from "path";
import { fileURLToPath } from "url";

// Load .env.local — must run before ANTHROPIC_API_KEY is accessed
// (getClient() in batch-claude.ts reads process.env.ANTHROPIC_API_KEY lazily)
config({ path: ".env.local" });

import { SongManifestSchema, type SongManifestEntry } from "../types/manifest.js";
import { LessonSchema } from "../types/lesson.js";
import {
  buildBatchRequests,
  submitBatch,
  pollBatch,
  streamResults,
  type LyricsCacheEntry,
} from "../lib/batch-claude.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../../");

const MANIFEST_PATH = join(PROJECT_ROOT, "data/songs-manifest.json");
const LYRICS_CACHE_DIR = join(PROJECT_ROOT, "data/lyrics-cache");
const LESSONS_CACHE_DIR = join(PROJECT_ROOT, "data/lessons-cache");

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const startTime = Date.now();
  console.log("=== 03-generate-content: Claude Batch API Lesson Generation ===\n");

  // Parse --limit flag
  const limitFlag = process.argv.indexOf("--limit");
  const limit = limitFlag !== -1 ? parseInt(process.argv[limitFlag + 1], 10) : null;
  if (limit !== null) {
    console.log(`  Mode: limited run (first ${limit} un-cached songs)\n`);
  }

  // Ensure output directory exists
  mkdirSync(LESSONS_CACHE_DIR, { recursive: true });

  // 1. Load manifest
  if (!existsSync(MANIFEST_PATH)) {
    console.error(`ERROR: songs-manifest.json not found at ${MANIFEST_PATH}`);
    console.error("Run scripts/seed/01-build-manifest.ts first.");
    process.exit(1);
  }
  const manifestRaw = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
  const manifest = SongManifestSchema.parse(manifestRaw);
  console.log(`  Loaded manifest: ${manifest.length} songs`);

  // 2. Load lyrics cache
  if (!existsSync(LYRICS_CACHE_DIR)) {
    console.error(`ERROR: lyrics-cache directory not found at ${LYRICS_CACHE_DIR}`);
    console.error("Run scripts/seed/02-fetch-lyrics.ts first.");
    process.exit(1);
  }
  const lyricsCache = loadLyricsCache(LYRICS_CACHE_DIR);
  console.log(`  Loaded lyrics cache: ${lyricsCache.size} entries`);

  // 3. Filter to un-cached songs
  let uncachedSongs: SongManifestEntry[] = manifest.filter(
    (song) => !existsSync(join(LESSONS_CACHE_DIR, `${song.slug}.json`))
  );
  const skippedCount = manifest.length - uncachedSongs.length;
  console.log(
    `  Already cached: ${skippedCount} songs — skipping`
  );
  console.log(`  To generate: ${uncachedSongs.length} songs`);

  if (limit !== null) {
    uncachedSongs = uncachedSongs.slice(0, limit);
    console.log(`  Applying --limit: processing ${uncachedSongs.length} songs`);
  }

  if (uncachedSongs.length === 0) {
    console.log("\nAll songs already generated. Nothing to do.");
    printCostEstimate(0, 0, startTime);
    return;
  }

  // 4. Build batch requests
  console.log("\n  Building batch requests...");
  const requests = buildBatchRequests(uncachedSongs, lyricsCache);
  console.log(`  Built ${requests.length} requests (${uncachedSongs.length - requests.length} skipped — no lyrics cache)`);

  if (requests.length === 0) {
    console.log("\nNo requests to submit — all songs missing lyrics cache.");
    return;
  }

  // 5. Submit batch
  console.log("\n  Submitting batch...");
  const batch = await submitBatch(requests);

  // 6. Poll until complete
  console.log("\n  Polling for completion (30s interval)...");
  const completedBatch = await pollBatch(batch.id);

  if (completedBatch.processing_status === "canceling") {
    console.error("\nBatch was canceled. Exiting.");
    process.exit(1);
  }

  // processing_status === "ended" is the success terminal state

  // 7. Stream and validate results
  console.log("\n  Streaming and validating results...");
  let succeededCount = 0;
  let failedValidationCount = 0;
  let failedResultCount = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for await (const result of streamResults(batch.id)) {
    const { custom_id, lesson } = result;

    // Validate against Zod schema
    const parsed = LessonSchema.safeParse(lesson);
    if (!parsed.success) {
      console.warn(
        `  [INVALID] ${custom_id} — validation failed: ${parsed.error.errors
          .slice(0, 3)
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join("; ")}`
      );
      failedValidationCount++;

      // Still write the raw output for manual inspection
      const rawPath = join(LESSONS_CACHE_DIR, `${custom_id}.invalid.json`);
      writeFileSync(rawPath, JSON.stringify(lesson, null, 2), "utf-8");
      continue;
    }

    // Write validated lesson to cache
    const cachePath = join(LESSONS_CACHE_DIR, `${custom_id}.json`);
    writeFileSync(cachePath, JSON.stringify(parsed.data, null, 2), "utf-8");
    succeededCount++;

    // Approximate token count from lesson size (rough estimate: 4 chars ≈ 1 token)
    const lessonStr = JSON.stringify(parsed.data);
    totalOutputTokens += Math.ceil(lessonStr.length / 4);
    totalInputTokens += 4000; // rough estimate per request
  }

  // Summary
  console.log("\n=== Results ===");
  console.log(`  Succeeded + cached: ${succeededCount}`);
  console.log(`  Failed validation: ${failedValidationCount}`);
  console.log(`  Failed (API errors): ${failedResultCount}`);
  console.log(`  Skipped (already cached): ${skippedCount}`);

  printCostEstimate(totalInputTokens, totalOutputTokens, startTime);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadLyricsCache(dir: string): Map<string, LyricsCacheEntry> {
  const cache = new Map<string, LyricsCacheEntry>();

  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    try {
      const raw = JSON.parse(readFileSync(join(dir, file), "utf-8")) as LyricsCacheEntry;
      if (raw.slug) {
        cache.set(raw.slug, raw);
      }
    } catch {
      console.warn(`  [WARN] Failed to parse lyrics cache file: ${file}`);
    }
  }

  return cache;
}

function printCostEstimate(
  totalInputTokens: number,
  totalOutputTokens: number,
  startTime: number
): void {
  const durationMs = Date.now() - startTime;
  const durationMin = (durationMs / 60_000).toFixed(1);

  // Batch API pricing: $1.50/$7.50 per MTok (50% discount from standard)
  const inputCost = (totalInputTokens / 1_000_000) * 1.5;
  const outputCost = (totalOutputTokens / 1_000_000) * 7.5;
  const totalCost = inputCost + outputCost;

  console.log("\n=== Cost Estimate ===");
  console.log(`  Input tokens (approx):  ${totalInputTokens.toLocaleString()}`);
  console.log(`  Output tokens (approx): ${totalOutputTokens.toLocaleString()}`);
  console.log(
    `  Estimated cost: $${totalCost.toFixed(4)} (batch pricing: $1.50/$7.50 per MTok)`
  );
  console.log(`\n  Duration: ${durationMin} min`);
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
