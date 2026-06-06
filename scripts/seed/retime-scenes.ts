/**
 * retime-scenes.ts — Apply WhisperX word-level timing to scene lesson verses.
 *
 * Rebuilds synced_lrc for each scene: one entry per lesson verse, with the
 * verse text and the start time of its first matching WhisperX word.
 * This is what LyricsPanel.buildVerseTiming needs to auto-scroll dialogue.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/retime-scenes.ts
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/retime-scenes.ts --slug=erwin-final-charge-aot
 */

import { config } from "dotenv";
import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";

config({ path: ".env.local" });

import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { eq } from "drizzle-orm";
import { songs, songVersions } from "../../src/lib/db/schema.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../../");
const TIMING_DIR = join(ROOT, "data/timing-cache");
const LESSONS_DIR = join(ROOT, "data/lessons-cache");

interface Word {
  word: string;
  start: number;
  end: number;
  score: number;
}

interface Verse {
  verse_number: number;
  tokens: Array<{ surface: string }>;
}

function normalize(s: string): string {
  return s.replace(/[\s　、。！？・「」『』（）\-,.!?()"'…]/g, "").toLowerCase();
}

/**
 * Given WhisperX word-level data and a list of verses, build synced_lrc
 * with one entry per verse at the correct timestamp.
 */
function buildSyncedLrcFromVerses(words: Word[], verses: Verse[]): { startMs: number; text: string }[] {
  if (!words.length || !verses.length) return [];

  // Build a single concatenated string of all word surfaces + their positions
  const allChars: Array<{ char: string; wordIdx: number }> = [];
  for (let wi = 0; wi < words.length; wi++) {
    for (const ch of words[wi].word) {
      allChars.push({ char: ch, wordIdx: wi });
    }
  }

  const allText = normalize(allChars.map((c) => c.char).join(""));
  const result: { startMs: number; text: string }[] = [];
  let searchPos = 0;

  for (const verse of verses) {
    const verseText = normalize(verse.tokens.map((t) => t.surface).join(""));
    if (!verseText) continue;

    // Find verseText in allText starting from searchPos
    // Use the 70% threshold (same as LyricsPanel) — find position of first 70% match
    let matchPos = -1;
    for (let i = searchPos; i < allText.length; i++) {
      if (allText.startsWith(verseText.slice(0, Math.ceil(verseText.length * 0.5)), i)) {
        matchPos = i;
        break;
      }
    }

    if (matchPos === -1) {
      // Fallback: try from beginning if we're running out of text
      for (let i = 0; i < allText.length; i++) {
        if (allText.startsWith(verseText.slice(0, Math.min(3, verseText.length)), i)) {
          matchPos = i;
          break;
        }
      }
    }

    if (matchPos !== -1) {
      // Find the wordIdx at matchPos
      const charEntry = allChars[matchPos];
      if (charEntry) {
        const wordIdx = charEntry.wordIdx;
        const startMs = Math.round(words[wordIdx].start * 1000);
        const verseRawText = verse.tokens.map((t) => t.surface).join("");
        result.push({ startMs, text: verseRawText });
        // Advance search past this match
        searchPos = matchPos + Math.floor(verseText.length * 0.8);
      }
    } else {
      // No match found — use a rough position estimate based on previous entry
      const lastMs = result.length > 0 ? result[result.length - 1].startMs + 3000 : 0;
      const verseRawText = verse.tokens.map((t) => t.surface).join("");
      result.push({ startMs: lastMs, text: verseRawText });
    }
  }

  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const slugArg = args.find((a) => a.startsWith("--slug="))?.split("=")[1];

  const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  const db = drizzle({ client: pool });

  // Get all scene slugs that have timing data
  const sceneRows = await db
    .select({ id: songs.id, slug: songs.slug })
    .from(songs)
    .where(eq(songs.content_type, "scene"));

  const targets = slugArg
    ? sceneRows.filter((r) => slugArg.split(",").includes(r.slug))
    : sceneRows;

  let updated = 0;
  let skipped = 0;

  for (const scene of targets) {
    const timingPath = join(TIMING_DIR, `${scene.slug}.json`);
    const lessonPath = join(LESSONS_DIR, `${scene.slug}.json`);

    if (!existsSync(timingPath)) {
      console.log(`[SKIP] ${scene.slug} — no timing cache`);
      skipped++;
      continue;
    }

    if (!existsSync(lessonPath)) {
      console.log(`[SKIP] ${scene.slug} — no lesson cache`);
      skipped++;
      continue;
    }

    const timing = JSON.parse(readFileSync(timingPath, "utf-8"));
    const lesson = JSON.parse(readFileSync(lessonPath, "utf-8"));

    if (!timing.words?.length) {
      console.log(`[SKIP] ${scene.slug} — timing has no word-level data`);
      skipped++;
      continue;
    }

    const verses: Verse[] = lesson.verses ?? [];
    if (!verses.length) {
      console.log(`[SKIP] ${scene.slug} — lesson has no verses`);
      skipped++;
      continue;
    }

    const syncedLrc = buildSyncedLrcFromVerses(timing.words, verses);

    if (!syncedLrc.length) {
      console.log(`[SKIP] ${scene.slug} — could not build timing`);
      skipped++;
      continue;
    }

    // Update the song_versions row for this scene
    const versionsForScene = await db
      .select({ id: songVersions.id })
      .from(songVersions)
      .where(eq(songVersions.song_id, scene.id));

    for (const v of versionsForScene) {
      await db
        .update(songVersions)
        .set({ synced_lrc: syncedLrc })
        .where(eq(songVersions.id, v.id));
    }

    console.log(`[OK] ${scene.slug} — ${syncedLrc.length} timed verses (from ${verses.length} verse lesson)`);
    updated++;
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped.`);
  await pool.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
