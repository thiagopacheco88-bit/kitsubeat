/**
 * seed-scenes.ts — Insert/upsert scenes from data/scenes-manifest.json into Neon.
 *
 * Unlike songs, scenes:
 *   - Use content_type = 'scene' on the songs row
 *   - Have a single version (version_type = 'full')
 *   - Use raw WhisperX timing — no Demucs stem separation
 *   - Store character name in the `artist` field
 *
 * Prerequisites per scene:
 *   - data/timing-cache/{slug}.json     WhisperX output (required for synced_lrc)
 *   - data/lessons-cache/{slug}.json    Claude-generated lesson (required for lesson JSONB)
 *
 * Usage:
 *   npx tsx scripts/seed/seed-scenes.ts             # all scenes in manifest
 *   npx tsx scripts/seed/seed-scenes.ts --slug=erwin-final-charge-aot
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync, existsSync } from "fs";
import { resolve, join } from "path";
import { fileURLToPath } from "url";
import { Pool } from "@neondatabase/serverless";
import { drizzle as drizzlePool } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import { songs, songVersions } from "../../src/lib/db/schema.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../../");

const MANIFEST_PATH = join(ROOT, "data/scenes-manifest.json");
const LESSONS_DIR = join(ROOT, "data/lessons-cache");
const TIMING_DIR = join(ROOT, "data/timing-cache");

interface SceneManifestEntry {
  slug: string;
  added_at: string;
  title: string;
  character: string;
  anime: string;
  season_info: string;
  youtube_id: string;
  genre_tags: string[];
  mood_tags: string[];
}

interface TimingWord {
  word: string;
  start: number;
  end: number;
  score: number;
}

interface TimingCache {
  slug: string;
  youtube_id?: string;
  words?: TimingWord[];
  segments?: Array<{ start: number; end: number; text: string }>;
}

function buildSyncedLrc(timing: TimingCache): { startMs: number; text: string }[] | null {
  // Prefer segments (line-level) over word-level aggregation
  if (timing.segments?.length) {
    return timing.segments.map((seg) => ({
      startMs: Math.round(seg.start * 1000),
      text: seg.text.trim(),
    }));
  }
  if (!timing.words?.length) return null;
  // Group words into lines with ~5s gaps as natural breaks
  const lines: { startMs: number; text: string }[] = [];
  let lineWords: string[] = [];
  let lineStart = timing.words[0].start;
  let prevEnd = timing.words[0].end;

  for (const word of timing.words) {
    const gap = word.start - prevEnd;
    if (gap > 1.5 && lineWords.length > 0) {
      lines.push({ startMs: Math.round(lineStart * 1000), text: lineWords.join(" ").trim() });
      lineWords = [];
      lineStart = word.start;
    }
    lineWords.push(word.word);
    prevEnd = word.end;
  }
  if (lineWords.length > 0) {
    lines.push({ startMs: Math.round(lineStart * 1000), text: lineWords.join(" ").trim() });
  }
  return lines;
}

async function main() {
  const args = process.argv.slice(2);
  const slugArg = args.find((a) => a.startsWith("--slug="))?.split("=")[1];
  const slugFilter = slugArg ? new Set(slugArg.split(",")) : null;

  const manifest: SceneManifestEntry[] = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
  const entries = slugFilter ? manifest.filter((e) => slugFilter.has(e.slug)) : manifest;

  if (entries.length === 0) {
    console.error("No matching entries found.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzlePool({ client: pool });

  let inserted = 0;
  let skipped = 0;

  for (const entry of entries) {
    const lessonPath = join(LESSONS_DIR, `${entry.slug}.json`);
    const timingPath = join(TIMING_DIR, `${entry.slug}.json`);

    if (!existsSync(lessonPath)) {
      console.warn(`[SKIP] ${entry.slug} — no lesson cache (run lesson generation first)`);
      skipped++;
      continue;
    }

    const lesson = JSON.parse(readFileSync(lessonPath, "utf-8"));

    let syncedLrc: { startMs: number; text: string }[] | null = null;
    if (existsSync(timingPath)) {
      const timing: TimingCache = JSON.parse(readFileSync(timingPath, "utf-8"));
      syncedLrc = buildSyncedLrc(timing);
    }

    // Upsert the songs row
    const [songRow] = await db
      .insert(songs)
      .values({
        slug: entry.slug,
        title: entry.title,
        artist: entry.character,
        anime: entry.anime,
        season_info: entry.season_info,
        language: "ja",
        content_type: "scene",
        genre_tags: entry.genre_tags,
        mood_tags: entry.mood_tags,
        jlpt_level: lesson.jlpt_level ?? null,
        difficulty_tier: lesson.difficulty_tier ?? null,
        quality_status: "active",
        is_available: true,
      })
      .onConflictDoUpdate({
        target: songs.slug,
        set: {
          title: entry.title,
          artist: entry.character,
          anime: entry.anime,
          season_info: entry.season_info,
          content_type: "scene",
          genre_tags: entry.genre_tags,
          mood_tags: entry.mood_tags,
          jlpt_level: lesson.jlpt_level ?? null,
          difficulty_tier: lesson.difficulty_tier ?? null,
          updated_at: sql`now()`,
        },
      })
      .returning({ id: songs.id });

    const songId = songRow.id;

    // Upsert the song_versions row (single 'full' version per scene)
    await db
      .insert(songVersions)
      .values({
        song_id: songId,
        version_type: "full",
        youtube_id: entry.youtube_id,
        lesson: lesson,
        synced_lrc: syncedLrc,
        lyrics_offset_ms: 0,
        lyrics_source: "whisper_transcription",
        pipeline_status: "idle",
      })
      .onConflictDoUpdate({
        target: [songVersions.song_id, songVersions.version_type],
        set: {
          youtube_id: entry.youtube_id,
          lesson: lesson,
          synced_lrc: syncedLrc,
          pipeline_status: "idle",
        },
      });

    console.log(`[OK] ${entry.slug} — ${entry.title}`);
    inserted++;
  }

  console.log(`\nDone: ${inserted} upserted, ${skipped} skipped (no lesson cache).`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
