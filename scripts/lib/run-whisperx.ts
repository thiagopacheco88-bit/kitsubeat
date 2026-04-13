/**
 * run-whisperx.ts — TypeScript wrapper for invoking the Python WhisperX
 * timing extraction script from the Kitsubeat seeding pipeline.
 *
 * Usage (per-song):
 *   const result = await runWhisperXForSong("naruto-op1", "dQw4w9WgXcQ");
 *   if (result) console.log(result.words[0]);
 *
 * Usage (batch):
 *   await runWhisperXBatch("data/songs-manifest.json");
 *
 * The wrapper shells out to:
 *   python scripts/seed/04-extract-timing.py <slug> <youtube_id> --output-dir data/timing-cache
 *
 * On success it reads and returns the parsed timing JSON from
 *   data/timing-cache/{slug}.json
 *
 * On Python failure (non-zero exit) it logs the error and returns null
 * so the pipeline can continue processing other songs.
 */

import { execSync, exec } from "child_process";
import { promisify } from "util";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const execAsync = promisify(exec);

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** A single word with WhisperX word-level timing data. */
export interface WordTiming {
  /** The word as transcribed (Japanese surface form) */
  word: string;
  /** Start time in seconds */
  start: number;
  /** End time in seconds */
  end: number;
  /** Alignment confidence score (0.0–1.0) */
  score: number;
  /** Present and true when score < 0.6 — flagged for timing editor review */
  low_confidence?: boolean;
}

/** Full timing result for one song as written to data/timing-cache/{slug}.json */
export interface TimingResult {
  song_slug: string;
  youtube_id: string;
  /** Word-level timestamps with confidence scores */
  words: WordTiming[];
  /** Count of words with score < 0.6 */
  low_confidence_count: number;
  /** Total number of aligned words */
  total_words: number;
  /** Mean confidence score across all words */
  avg_confidence_score: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TIMING_CACHE_DIR = "data/timing-cache";
const PYTHON_SCRIPT = "scripts/seed/04-extract-timing.py";

// ─────────────────────────────────────────────────────────────────────────────
// Core helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read and parse the timing cache JSON for a song.
 * Returns null if the file does not exist or cannot be parsed.
 */
function readTimingCache(slug: string): TimingResult | null {
  const cachePath = join(TIMING_CACHE_DIR, `${slug}.json`);
  if (!existsSync(cachePath)) return null;
  try {
    const raw = readFileSync(cachePath, "utf-8");
    return JSON.parse(raw) as TimingResult;
  } catch (err) {
    console.error(`[run-whisperx] Failed to parse timing cache for ${slug}:`, err);
    return null;
  }
}

/**
 * Build the Python command for a single song.
 */
function buildSingleSongCmd(slug: string, youtubeId: string): string {
  return `python ${PYTHON_SCRIPT} ${slug} ${youtubeId} --output-dir ${TIMING_CACHE_DIR}`;
}

/**
 * Build the Python batch command.
 */
function buildBatchCmd(manifestPath: string): string {
  return `python ${PYTHON_SCRIPT} --batch ${manifestPath} --output-dir ${TIMING_CACHE_DIR}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run WhisperX for a single song and return the timing result.
 *
 * Shells out to the Python extraction script synchronously.
 * If the script fails (non-zero exit), logs the error and returns null
 * so the caller can continue processing other songs.
 *
 * If the timing cache already exists (checkpoint/resume), the Python
 * script will skip the song and this function reads the cached result.
 *
 * @param slug       Song slug matching songs-manifest.json
 * @param youtubeId  YouTube video ID (11-character string)
 * @returns          Parsed TimingResult, or null on failure
 */
export function runWhisperXForSong(
  slug: string,
  youtubeId: string
): TimingResult | null {
  const cmd = buildSingleSongCmd(slug, youtubeId);
  console.log(`[run-whisperx] Running: ${cmd}`);

  try {
    execSync(cmd, { stdio: "inherit" });
  } catch (err) {
    console.error(
      `[run-whisperx] Python script failed for song "${slug}" (youtube_id=${youtubeId}):`,
      err instanceof Error ? err.message : err
    );
    return null;
  }

  const result = readTimingCache(slug);
  if (!result) {
    console.error(
      `[run-whisperx] Timing cache not found after extraction for slug: ${slug}`
    );
    return null;
  }

  console.log(
    `[run-whisperx] ${slug}: ${result.total_words} words, ` +
      `${result.low_confidence_count} low-confidence, ` +
      `avg score=${result.avg_confidence_score}`
  );
  return result;
}

/**
 * Run WhisperX for all songs in a manifest file (batch mode).
 *
 * Shells out to the Python batch runner which processes songs sequentially
 * with checkpoint/resume (skips already-cached songs).
 *
 * This call blocks until all songs are processed. For 200 songs on CPU
 * this may take several hours — prefer GPU execution in production.
 *
 * @param manifestPath  Path to songs-manifest.json
 */
export async function runWhisperXBatch(manifestPath: string): Promise<void> {
  const cmd = buildBatchCmd(manifestPath);
  console.log(`[run-whisperx] Starting batch: ${cmd}`);

  try {
    const { stdout, stderr } = await execAsync(cmd, {
      // Extend timeout to 12 hours for large batches
      timeout: 12 * 60 * 60 * 1000,
      maxBuffer: 100 * 1024 * 1024,
    });
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
    console.log("[run-whisperx] Batch complete.");
  } catch (err) {
    console.error("[run-whisperx] Batch run failed:", err instanceof Error ? err.message : err);
    throw err;
  }
}

/**
 * Read a timing cache entry without triggering extraction.
 * Useful for downstream scripts that only need to consume already-generated data.
 *
 * @param slug  Song slug
 * @returns     Parsed TimingResult or null if cache does not exist
 */
export function readTimingCacheForSong(slug: string): TimingResult | null {
  return readTimingCache(slug);
}
