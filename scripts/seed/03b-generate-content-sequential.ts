/**
 * 03b-generate-content-sequential.ts — Generate lessons one song at a time
 * via the Claude Messages API (not Batch API).
 *
 * Drop-in replacement for 03-generate-content.ts when the Batch API key has
 * no credits. Uses the same prompt, schema validation, and cache structure.
 *
 * Features:
 *   - Checkpoint/resume: skips songs already in data/lessons-cache/{slug}.json
 *   - Rate limiting: configurable delay between requests (default 1s)
 *   - --limit N: process only first N un-cached songs
 *   - --delay MS: milliseconds to wait between API calls (default 1000)
 *   - Validates each result against LessonSchema (Zod)
 *   - Writes .invalid.json for failed validations (manual inspection)
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/03b-generate-content-sequential.ts
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/03b-generate-content-sequential.ts --limit 5
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/03b-generate-content-sequential.ts --delay 2000
 */

import { config } from "dotenv";
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync } from "fs";
import { resolve, join } from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";

config({ path: ".env.local" });

import { SongManifestSchema, type SongManifestEntry } from "../types/manifest.js";
import { LessonSchema, LESSON_JSON_SCHEMA } from "../types/lesson.js";
import { buildLessonPrompt } from "../lib/lesson-prompt.js";
import type { LyricsCacheEntry } from "../lib/batch-claude.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../../");

const MANIFEST_PATH = join(PROJECT_ROOT, "data/songs-manifest.json");
const LYRICS_CACHE_DIR = join(PROJECT_ROOT, "data/lyrics-cache");
const LESSONS_CACHE_DIR = join(PROJECT_ROOT, "data/lessons-cache");

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 8192;

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf("--limit");
  const delayIdx = args.indexOf("--delay");

  return {
    limit: limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : null,
    delayMs: delayIdx !== -1 ? parseInt(args[delayIdx + 1], 10) : 1000,
  };
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const startTime = Date.now();
  const { limit, delayMs } = parseArgs();

  console.log("=== 03b-generate-content-sequential: Claude Messages API ===\n");
  if (limit !== null) console.log(`  Mode: limited run (first ${limit} un-cached songs)`);
  console.log(`  Delay between requests: ${delayMs}ms`);
  console.log(`  Model: ${MODEL}\n`);

  // Validate API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ERROR: ANTHROPIC_API_KEY not set in .env.local");
    process.exit(1);
  }

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    maxRetries: 3,
  });

  mkdirSync(LESSONS_CACHE_DIR, { recursive: true });

  // 1. Load manifest
  if (!existsSync(MANIFEST_PATH)) {
    console.error(`ERROR: songs-manifest.json not found at ${MANIFEST_PATH}`);
    process.exit(1);
  }
  const manifest = SongManifestSchema.parse(
    JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"))
  );
  console.log(`  Loaded manifest: ${manifest.length} songs`);

  // 2. Load lyrics cache
  if (!existsSync(LYRICS_CACHE_DIR)) {
    console.error(`ERROR: lyrics-cache directory not found at ${LYRICS_CACHE_DIR}`);
    process.exit(1);
  }
  const lyricsCache = loadLyricsCache(LYRICS_CACHE_DIR);
  console.log(`  Loaded lyrics cache: ${lyricsCache.size} entries`);

  // 3. Filter to un-cached songs that have lyrics
  let songs = manifest.filter((song) => {
    if (existsSync(join(LESSONS_CACHE_DIR, `${song.slug}.json`))) return false;
    const cached = lyricsCache.get(song.slug);
    if (!cached) return false;
    // Skip pending_whisper entries that have no real lyrics
    if (cached.source === "pending_whisper" && (!cached.raw_lyrics || cached.raw_lyrics.trim() === "")) return false;
    return true;
  });

  const skippedCount = manifest.length - songs.length;
  console.log(`  Already cached / no lyrics: ${skippedCount} songs — skipping`);
  console.log(`  To generate: ${songs.length} songs`);

  if (limit !== null) {
    songs = songs.slice(0, limit);
    console.log(`  Applying --limit: processing ${songs.length} songs`);
  }

  if (songs.length === 0) {
    console.log("\nNothing to generate. Done.");
    return;
  }

  // 4. Process one song at a time
  let succeeded = 0;
  let failedValidation = 0;
  let failedApi = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    const cached = lyricsCache.get(song.slug)!;
    const prompt = buildLessonPrompt(song, cached.raw_lyrics, cached.tokens);

    const progress = `[${i + 1}/${songs.length}]`;
    process.stdout.write(`${progress} ${song.slug} ... `);

    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: "user", content: prompt }],
      });

      // Track tokens
      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;

      // Extract text content
      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        console.log("FAIL (no text in response)");
        failedApi++;
        continue;
      }

      // Parse JSON from response
      let lesson: unknown;
      try {
        // The response might be wrapped in ```json ... ``` or just raw JSON
        let jsonStr = textBlock.text.trim();
        if (jsonStr.startsWith("```")) {
          jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        }
        lesson = JSON.parse(jsonStr);
      } catch {
        console.log("FAIL (invalid JSON)");
        const rawPath = join(LESSONS_CACHE_DIR, `${song.slug}.raw.txt`);
        writeFileSync(rawPath, textBlock.text, "utf-8");
        failedApi++;
        continue;
      }

      // Validate against Zod schema
      const parsed = LessonSchema.safeParse(lesson);
      if (!parsed.success) {
        const errors = parsed.error.errors
          .slice(0, 3)
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join("; ");
        console.log(`INVALID (${errors})`);
        const invalidPath = join(LESSONS_CACHE_DIR, `${song.slug}.invalid.json`);
        writeFileSync(invalidPath, JSON.stringify(lesson, null, 2), "utf-8");
        failedValidation++;
        continue;
      }

      // Write validated lesson
      const cachePath = join(LESSONS_CACHE_DIR, `${song.slug}.json`);
      writeFileSync(cachePath, JSON.stringify(parsed.data, null, 2), "utf-8");
      console.log(`OK (${response.usage.output_tokens} tokens)`);
      succeeded++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`FAIL (${msg.slice(0, 100)})`);
      failedApi++;
    }

    // Rate limit delay (skip after last request)
    if (i < songs.length - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  // Summary
  const durationMs = Date.now() - startTime;
  const durationMin = (durationMs / 60_000).toFixed(1);

  // Messages API pricing: Sonnet $3/$15 per MTok
  const inputCost = (totalInputTokens / 1_000_000) * 3;
  const outputCost = (totalOutputTokens / 1_000_000) * 15;
  const totalCost = inputCost + outputCost;

  console.log("\n" + "=".repeat(60));
  console.log("Results");
  console.log("=".repeat(60));
  console.log(`  Succeeded:          ${succeeded}`);
  console.log(`  Failed validation:  ${failedValidation}`);
  console.log(`  Failed (API error): ${failedApi}`);
  console.log(`  Skipped (cached):   ${skippedCount}`);
  console.log();
  console.log(`  Input tokens:  ${totalInputTokens.toLocaleString()}`);
  console.log(`  Output tokens: ${totalOutputTokens.toLocaleString()}`);
  console.log(`  Estimated cost: $${totalCost.toFixed(4)} (Messages API: $3/$15 per MTok)`);
  console.log(`  Duration: ${durationMin} min`);
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
