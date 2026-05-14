import { db } from "../../src/lib/db";
import { songs, songVersions } from "../../src/lib/db/schema";
import { sql } from "drizzle-orm";

// JLPT level distribution
const dist = await db
  .select({ jlpt_level: songs.jlpt_level, count: sql<number>`count(*)` })
  .from(songs)
  .groupBy(songs.jlpt_level)
  .orderBy(songs.jlpt_level);

console.log("=== JLPT distribution ===");
for (const r of dist) console.log(`  ${r.jlpt_level ?? "null"}: ${r.count}`);

// N4/N5 songs with lessons
const n45 = await db
  .select({
    slug: songs.slug,
    title: songs.title,
    anime: songs.anime,
    jlpt_level: songs.jlpt_level,
    has_lesson: sql<number>`(SELECT 1 FROM song_versions sv WHERE sv.song_id = songs.id AND sv.lesson IS NOT NULL LIMIT 1)`,
    has_yt: sql<number>`(SELECT 1 FROM song_versions sv WHERE sv.song_id = songs.id AND sv.youtube_id IS NOT NULL LIMIT 1)`,
  })
  .from(songs)
  .where(sql`songs.jlpt_level IN ('N4','N5')`);

const withLesson = n45.filter((r) => r.has_lesson);
console.log(
  `\n=== N4/N5 total: ${n45.length}, with lesson: ${withLesson.length} ===`
);
for (const r of withLesson) {
  console.log(
    `  [${r.jlpt_level}] ${r.title} (${r.anime}) slug=${r.slug} yt=${r.has_yt ? "yes" : "NO"}`
  );
}

process.exit(0);
