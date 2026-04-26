import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb } from "../../src/lib/db/index.js";
import { songs, songVersions } from "../../src/lib/db/schema.js";
import { eq, and } from "drizzle-orm";

const db = getDb();
const rows = await db.select().from(songs).where(eq(songs.slug, "sign-flow"));
if (!rows.length) {
  console.log("NO SONG ROW for sign-flow");
  process.exit(0);
}
const song = rows[0];
console.log("song.id =", song.id, "updated_at =", song.updated_at);

const vers = await db
  .select()
  .from(songVersions)
  .where(eq(songVersions.song_id, song.id));
console.log(`found ${vers.length} versions`);
for (const v of vers) {
  const lesson = v.lesson as { verses?: Array<{ verse_number: number; start_time_ms: number; end_time_ms: number; tokens?: Array<{ surface: string }> }> } | null;
  console.log(`\n=== version_type=${v.version_type} youtube_id=${v.youtube_id} timing_youtube_id=${v.timing_youtube_id} updated_at=${v.updated_at} ===`);
  console.log("verses count =", lesson?.verses?.length ?? 0);
  (lesson?.verses || []).forEach((verse) => {
    const tokens = (verse.tokens || []).map((t) => t.surface).join("");
    console.log(
      "#" + verse.verse_number,
      (verse.start_time_ms / 1000).toFixed(2) + "s -> " + (verse.end_time_ms / 1000).toFixed(2) + "s",
      tokens.slice(0, 80)
    );
  });
}
process.exit(0);
