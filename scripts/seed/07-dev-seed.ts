/**
 * 07-dev-seed.ts — Dev Seed Script for Phase 2 Player Development
 *
 * Selects 10-20 representative songs from the full catalog so Phase 2 player
 * development has a working data set from day one.
 *
 * Selection criteria:
 *   - Spread across JLPT levels (at least 2 per level: N5, N4, N3, N2, N1)
 *   - Spread across difficulty tiers (basic, intermediate, advanced)
 *   - Prefer popular anime (earlier in DB = inserted first from manifest)
 *   - Include at least one song with many grammar points
 *   - Include at least one song with rich cultural context annotations
 *
 * Output:
 *   - Prints a table of selected songs (slug, title, anime, JLPT, tier)
 *   - If same database, verifies songs exist and prints the list
 *   - Exports the selected song slugs as JSON if --json flag is passed
 *
 * Usage:
 *   npx tsx scripts/seed/07-dev-seed.ts
 *   npx tsx scripts/seed/07-dev-seed.ts --json
 */

import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";

// Load .env.local FIRST — before any DB imports
const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../../.env.local") });

import { getDb } from "../../src/lib/db/index.js";
import { songs } from "../../src/lib/db/schema.js";
import { asc } from "drizzle-orm";
import type { Song } from "../../src/lib/db/schema.js";
import type { Lesson } from "../types/lesson.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type JlptLevel = "N5" | "N4" | "N3" | "N2" | "N1";
type DifficultyTier = "basic" | "intermediate" | "advanced";

interface DevSong {
  slug: string;
  title: string;
  anime: string;
  jlpt_level: JlptLevel | null;
  difficulty_tier: DifficultyTier | null;
  grammar_points_count: number;
  has_cultural_context: boolean;
}

// ---------------------------------------------------------------------------
// Selection logic
// ---------------------------------------------------------------------------

const JLPT_LEVELS: JlptLevel[] = ["N5", "N4", "N3", "N2", "N1"];
const DIFFICULTY_TIERS: DifficultyTier[] = ["basic", "intermediate", "advanced"];
const MIN_SONGS = 10;
const MAX_SONGS = 20;
const MIN_PER_JLPT = 2;

function extractDevSongInfo(song: Song): DevSong {
  const lesson = song.lesson as Lesson | null;
  let grammarPointsCount = 0;
  let hasCulturalContext = false;

  if (lesson) {
    grammarPointsCount = lesson.grammar_points?.length ?? 0;

    // Check if any verse has cultural context
    hasCulturalContext = lesson.verses?.some(
      (v) => v.cultural_context && v.cultural_context.trim().length > 0
    ) ?? false;
  }

  return {
    slug: song.slug,
    title: song.title,
    anime: song.anime,
    jlpt_level: song.jlpt_level as JlptLevel | null,
    difficulty_tier: song.difficulty_tier as DifficultyTier | null,
    grammar_points_count: grammarPointsCount,
    has_cultural_context: hasCulturalContext,
  };
}

function selectDevSongs(allSongs: DevSong[]): DevSong[] {
  const selected: DevSong[] = [];
  const selectedSlugs = new Set<string>();

  function addSong(song: DevSong): boolean {
    if (selectedSlugs.has(song.slug)) return false;
    if (selected.length >= MAX_SONGS) return false;
    selected.push(song);
    selectedSlugs.add(song.slug);
    return true;
  }

  // Pass 1: Ensure at least MIN_PER_JLPT songs per JLPT level
  for (const level of JLPT_LEVELS) {
    const levelSongs = allSongs.filter((s) => s.jlpt_level === level);
    let addedForLevel = 0;
    for (const song of levelSongs) {
      if (addedForLevel >= MIN_PER_JLPT) break;
      if (addSong(song)) addedForLevel++;
    }
  }

  // Pass 2: Ensure coverage across difficulty tiers
  for (const tier of DIFFICULTY_TIERS) {
    const hasTier = selected.some((s) => s.difficulty_tier === tier);
    if (!hasTier) {
      const tierSong = allSongs.find(
        (s) => s.difficulty_tier === tier && !selectedSlugs.has(s.slug)
      );
      if (tierSong) addSong(tierSong);
    }
  }

  // Pass 3: Add song with most grammar points (for grammar testing)
  if (selected.length < MAX_SONGS) {
    const richGrammar = allSongs
      .filter((s) => !selectedSlugs.has(s.slug))
      .sort((a, b) => b.grammar_points_count - a.grammar_points_count)[0];
    if (richGrammar && richGrammar.grammar_points_count > 0) {
      addSong(richGrammar);
    }
  }

  // Pass 4: Add song with cultural context (for context annotation testing)
  if (selected.length < MAX_SONGS) {
    const culturalSong = allSongs.find(
      (s) => s.has_cultural_context && !selectedSlugs.has(s.slug)
    );
    if (culturalSong) addSong(culturalSong);
  }

  // Pass 5: Fill remaining slots up to MAX_SONGS with earliest-inserted popular songs
  for (const song of allSongs) {
    if (selected.length >= MAX_SONGS) break;
    addSong(song);
  }

  // Ensure minimum
  if (selected.length < MIN_SONGS) {
    for (const song of allSongs) {
      if (selected.length >= MIN_SONGS) break;
      addSong(song);
    }
  }

  return selected;
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

function padEnd(str: string, len: number): string {
  return str.slice(0, len).padEnd(len);
}

function printTable(devSongs: DevSong[]): void {
  const COL_SLUG = 35;
  const COL_TITLE = 30;
  const COL_ANIME = 30;
  const COL_JLPT = 6;
  const COL_TIER = 14;

  const header =
    `${"SLUG".padEnd(COL_SLUG)}  ` +
    `${"TITLE".padEnd(COL_TITLE)}  ` +
    `${"ANIME".padEnd(COL_ANIME)}  ` +
    `${"JLPT".padEnd(COL_JLPT)}  ` +
    `${"TIER".padEnd(COL_TIER)}`;

  const divider = "-".repeat(header.length);

  console.log(header);
  console.log(divider);

  for (const song of devSongs) {
    const row =
      `${padEnd(song.slug, COL_SLUG)}  ` +
      `${padEnd(song.title, COL_TITLE)}  ` +
      `${padEnd(song.anime, COL_ANIME)}  ` +
      `${padEnd(song.jlpt_level ?? "—", COL_JLPT)}  ` +
      `${padEnd(song.difficulty_tier ?? "—", COL_TIER)}`;
    console.log(row);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function devSeed(): Promise<void> {
  const args = process.argv.slice(2);
  const isJson = args.includes("--json");

  if (!isJson) {
    console.log("=== Dev Seed: Select Representative Songs for Phase 2 ===\n");
  }

  const db = getDb();
  // Order by created_at asc so "popular" (first-inserted from manifest) songs come first
  const allSongs = await db.select().from(songs).orderBy(asc(songs.created_at));

  if (!isJson) {
    console.log(`  Total songs in database: ${allSongs.length}`);
  }

  if (allSongs.length === 0) {
    if (isJson) {
      console.log(JSON.stringify({ selected_slugs: [], total_available: 0 }, null, 2));
    } else {
      console.log("\n  No songs in database. Run the content pipeline first:");
      console.log("  npx tsx scripts/seed/01-build-manifest.ts");
      console.log("  ... (through 05-insert-db.ts)");
    }
    process.exit(0);
  }

  const devSongInfos = allSongs.map(extractDevSongInfo);
  const selected = selectDevSongs(devSongInfos);

  if (isJson) {
    console.log(
      JSON.stringify(
        {
          selected_slugs: selected.map((s) => s.slug),
          total_available: allSongs.length,
          selected_count: selected.length,
          coverage: {
            jlpt_levels: Object.fromEntries(
              JLPT_LEVELS.map((level) => [
                level,
                selected.filter((s) => s.jlpt_level === level).length,
              ])
            ),
            difficulty_tiers: Object.fromEntries(
              DIFFICULTY_TIERS.map((tier) => [
                tier,
                selected.filter((s) => s.difficulty_tier === tier).length,
              ])
            ),
          },
        },
        null,
        2
      )
    );
    return;
  }

  console.log(
    `  Selected ${selected.length} songs for Phase 2 development (target: ${MIN_SONGS}–${MAX_SONGS})\n`
  );

  printTable(selected);

  // Coverage summary
  console.log("\n  Coverage summary:");
  for (const level of JLPT_LEVELS) {
    const count = selected.filter((s) => s.jlpt_level === level).length;
    console.log(`    ${level}: ${count} song(s)`);
  }
  for (const tier of DIFFICULTY_TIERS) {
    const count = selected.filter((s) => s.difficulty_tier === tier).length;
    console.log(`    ${tier}: ${count} song(s)`);
  }

  const richGrammar = selected.sort((a, b) => b.grammar_points_count - a.grammar_points_count)[0];
  if (richGrammar && richGrammar.grammar_points_count > 0) {
    console.log(
      `\n  Most grammar points: ${richGrammar.slug} (${richGrammar.grammar_points_count} grammar points)`
    );
  }

  const culturalSongs = selected.filter((s) => s.has_cultural_context);
  if (culturalSongs.length > 0) {
    console.log(
      `  Songs with cultural context: ${culturalSongs.map((s) => s.slug).join(", ")}`
    );
  }

  console.log(`\n  Done. ${selected.length} songs ready for Phase 2 player development.`);
}

devSeed().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
