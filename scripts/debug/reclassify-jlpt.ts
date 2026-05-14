/**
 * Reclassify songs.jlpt_level from vocabulary data in lesson JSONB.
 *
 * Algorithm (same as original lesson-prompt.ts spec):
 *   1. Extract all vocabulary[].jlpt_level from the best available lesson
 *      (tv preferred, then full)
 *   2. Sort by difficulty (N5→N4→N3→N2→N1) and find the 80th-percentile level
 *      (the level at which 80% of words are AT OR BELOW)
 *   3. That becomes the new songs.jlpt_level
 *   4. Also update difficulty_tier: N5/N4→basic, N3→intermediate, N2/N1→advanced
 *
 * Skips:
 *   - Songs where language != 'ja'
 *   - Songs with no lesson or no vocabulary
 *
 * Run: npx tsx --env-file=.env.local scripts/debug/reclassify-jlpt.ts
 * Add --apply to write changes to DB (default is dry-run).
 */

import { db } from "../../src/lib/db";
import { songs, songVersions } from "../../src/lib/db/schema";
import { eq, sql } from "drizzle-orm";

const APPLY = process.argv.includes("--apply");

const JLPT_ORDER = ["N5", "N4", "N3", "N2", "N1"] as const;
type JlptLevel = (typeof JLPT_ORDER)[number];
type DiffTier = "basic" | "intermediate" | "advanced";

function jlptToDifficulty(level: JlptLevel): DiffTier {
  if (level === "N5" || level === "N4") return "basic";
  if (level === "N3") return "intermediate";
  return "advanced";
}

function percentile80(levels: JlptLevel[]): JlptLevel | null {
  if (levels.length === 0) return null;
  const sorted = levels
    .map((l) => JLPT_ORDER.indexOf(l))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  // 80th percentile index (0-based, round up)
  const idx = Math.ceil(sorted.length * 0.8) - 1;
  return JLPT_ORDER[sorted[Math.min(idx, sorted.length - 1)]];
}

// Fetch all songs with their best lesson
const allSongs = await db
  .select({
    id: songs.id,
    slug: songs.slug,
    title: songs.title,
    language: songs.language,
    current_jlpt: songs.jlpt_level,
    current_tier: songs.difficulty_tier,
    popularity_rank: songs.popularity_rank,
    lesson: sql<unknown>`(
      SELECT sv.lesson
      FROM song_versions sv
      WHERE sv.song_id = songs.id
        AND sv.lesson IS NOT NULL
      ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
      LIMIT 1
    )`,
  })
  .from(songs);

const changes: Array<{
  slug: string;
  title: string;
  old_jlpt: string | null;
  new_jlpt: JlptLevel;
  old_tier: string | null;
  new_tier: DiffTier;
  vocab_count: number;
  popularity_rank: number | null;
}> = [];

const skipped = { no_lesson: 0, non_ja: 0, no_vocab: 0, no_jlpt_in_vocab: 0 };

for (const song of allSongs) {
  if (song.language !== "ja") { skipped.non_ja++; continue; }
  if (!song.lesson) { skipped.no_lesson++; continue; }

  // Extract vocabulary JLPT levels from lesson JSONB
  const lesson = song.lesson as Record<string, unknown>;
  const vocab = lesson.vocabulary as Array<Record<string, unknown>> | undefined;
  if (!vocab || vocab.length === 0) { skipped.no_vocab++; continue; }

  const levels = vocab
    .map((v) => v.jlpt_level as string | null)
    .filter((l): l is JlptLevel => !!l && JLPT_ORDER.includes(l as JlptLevel));

  if (levels.length === 0) { skipped.no_jlpt_in_vocab++; continue; }

  const new_jlpt = percentile80(levels)!;
  const new_tier = jlptToDifficulty(new_jlpt);

  changes.push({
    slug: song.slug,
    title: song.title,
    old_jlpt: song.current_jlpt,
    new_jlpt,
    old_tier: song.current_tier,
    new_tier,
    vocab_count: levels.length,
    popularity_rank: song.popularity_rank,
  });
}

// Summary
const moved = changes.filter((c) => c.old_jlpt !== c.new_jlpt);
const dist: Record<string, number> = {};
for (const c of changes) dist[c.new_jlpt] = (dist[c.new_jlpt] ?? 0) + 1;

console.log(`\n=== JLPT Reclassification ${APPLY ? "[APPLY]" : "[DRY-RUN]"} ===`);
console.log(`Total songs processed: ${changes.length}`);
console.log(`Skipped: non_ja=${skipped.non_ja} no_lesson=${skipped.no_lesson} no_vocab=${skipped.no_vocab} no_jlpt_in_vocab=${skipped.no_jlpt_in_vocab}`);
console.log(`Songs changing level: ${moved.length}`);
console.log(`\nNew distribution:`);
for (const level of JLPT_ORDER) {
  if (dist[level]) console.log(`  ${level}: ${dist[level]}`);
}

console.log(`\nSongs changing level (${moved.length}):`);
for (const c of moved.sort((a, b) => JLPT_ORDER.indexOf(a.new_jlpt) - JLPT_ORDER.indexOf(b.new_jlpt))) {
  console.log(`  [${c.old_jlpt ?? "null"} → ${c.new_jlpt}] ${c.title} (vocab=${c.vocab_count}, rank=${c.popularity_rank ?? "unranked"})`);
}

// Show top N4/N5 candidates after reclassification (ja only, with lesson)
const n45 = changes
  .filter((c) => c.new_jlpt === "N4" || c.new_jlpt === "N5")
  .sort((a, b) => {
    // N5 before N4 (easier first)
    const lvl = JLPT_ORDER.indexOf(a.new_jlpt) - JLPT_ORDER.indexOf(b.new_jlpt);
    if (lvl !== 0) return lvl;
    // Then by popularity (lower rank = more popular, null last)
    const ar = a.popularity_rank ?? 99999;
    const br = b.popularity_rank ?? 99999;
    return ar - br;
  });

console.log(`\n=== N4/N5 candidates after reclassification (${n45.length} songs) ===`);
for (const c of n45) {
  console.log(`  [${c.new_jlpt}] rank=${c.popularity_rank ?? "unranked"} "${c.title}" slug=${c.slug}`);
}

if (APPLY && moved.length > 0) {
  console.log(`\nApplying ${moved.length} updates...`);
  let done = 0;
  for (const c of moved) {
    await db
      .update(songs)
      .set({ jlpt_level: c.new_jlpt, difficulty_tier: c.new_tier })
      .where(eq(songs.slug, c.slug));
    done++;
    if (done % 50 === 0) console.log(`  ${done}/${moved.length}...`);
  }
  console.log(`Done. ${done} songs updated.`);
} else if (!APPLY) {
  console.log(`\nDry-run complete. Re-run with --apply to write changes.`);
}

process.exit(0);
