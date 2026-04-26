/**
 * One-off: null-out a broken TV-version lesson so SongContent falls back
 * to the full version. Reversible — re-run 10c-load-tv-lessons.ts to restore
 * once the TV derivation is fixed for the slug.
 *
 * Usage: npx tsx scripts/debug/null-tv-lesson.ts --slug=<slug>
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { and, eq } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";
import { songs, songVersions } from "../../src/lib/db/schema.js";

const slugArg = process.argv.find((a) => a.startsWith("--slug="));
if (!slugArg) {
  console.error("usage: --slug=<slug>");
  process.exit(1);
}
const slug = slugArg.slice("--slug=".length);

const db = getDb();
const [song] = await db.select().from(songs).where(eq(songs.slug, slug));
if (!song) {
  console.error(`no song with slug=${slug}`);
  process.exit(1);
}

const result = await db
  .update(songVersions)
  .set({ lesson: null, updated_at: new Date() })
  .where(and(eq(songVersions.song_id, song.id), eq(songVersions.version_type, "tv")))
  .returning({ id: songVersions.id });

console.log(`nulled lesson on ${result.length} TV row(s) for ${slug}`);
process.exit(0);
