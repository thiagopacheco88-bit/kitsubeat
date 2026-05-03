import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb } from "../../src/lib/db/index.js";
import { songVersions, songs } from "../../src/lib/db/schema.js";
import { ne, eq } from "drizzle-orm";

const db = getDb();
const rows = await db
  .select({ slug: songs.slug, offset: songVersions.lyrics_offset_ms })
  .from(songVersions)
  .innerJoin(songs, eq(songVersions.song_id, songs.id))
  .where(ne(songVersions.lyrics_offset_ms, 0));

console.log(`${rows.length} song_versions have lyrics_offset_ms != 0`);
rows.sort((a, b) => Math.abs(b.offset) - Math.abs(a.offset));
for (const r of rows.slice(0, 50)) console.log("  ", r.slug.padEnd(50), r.offset, "ms");
process.exit(0);
