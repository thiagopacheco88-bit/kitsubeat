import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb } from "../../src/lib/db/index.js";
import { songs, songVersions } from "../../src/lib/db/schema.js";
import { eq } from "drizzle-orm";

const OFFSET_MS = 12588;

const db = getDb();
const [song] = await db.select().from(songs).where(eq(songs.slug, "change-miwa"));
if (!song) { console.log("no song"); process.exit(1); }

const before = await db.select({ id: songVersions.id, offset: songVersions.lyrics_offset_ms })
  .from(songVersions).where(eq(songVersions.song_id, song.id));
console.log("BEFORE:", before);

await db.update(songVersions)
  .set({ lyrics_offset_ms: OFFSET_MS })
  .where(eq(songVersions.song_id, song.id));

const after = await db.select({ id: songVersions.id, offset: songVersions.lyrics_offset_ms })
  .from(songVersions).where(eq(songVersions.song_id, song.id));
console.log("AFTER:", after);
process.exit(0);
