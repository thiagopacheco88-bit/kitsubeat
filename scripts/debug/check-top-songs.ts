import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb } from "../../src/lib/db/index.js";
import { songs } from "../../src/lib/db/schema.js";
import { eq, and, lte, asc, sql } from "drizzle-orm";

const db = getDb();

const rows = await db
  .select({
    slug: songs.slug,
    title: songs.title,
    popularity_rank: songs.popularity_rank,
    has_lesson: sql<boolean>`EXISTS (SELECT 1 FROM song_versions sv WHERE sv.song_id = "songs"."id" AND sv.lesson IS NOT NULL)`,
  })
  .from(songs)
  .where(and(eq(songs.language, "ja"), eq(songs.quality_status, "active"), lte(songs.popularity_rank, 10)))
  .orderBy(asc(songs.popularity_rank));

console.table(rows);
process.exit(0);
