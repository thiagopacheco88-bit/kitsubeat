import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb } from "../../src/lib/db/index.js";
import { songs, songVersions } from "../../src/lib/db/schema.js";
import { eq } from "drizzle-orm";

const db = getDb();
const [song] = await db.select().from(songs).where(eq(songs.slug, "change-miwa"));
if (!song) { console.log("no song"); process.exit(0); }

const [v] = await db.select().from(songVersions).where(eq(songVersions.song_id, song.id));
const lesson = v.lesson as { verses: Array<{ verse_number: number; tokens: Array<{ surface: string }> }> };
const synced = (v.synced_lrc as Array<{ startMs: number; text: string }> | null) ?? null;

console.log("synced_lrc lines:", synced?.length ?? 0, "lyrics_offset_ms:", v.lyrics_offset_ms);
if (synced) {
  console.log("\n--- first 12 synced lines ---");
  synced.slice(0, 12).forEach((l, i) => console.log(i, (l.startMs / 1000).toFixed(2) + "s |", JSON.stringify(l.text).slice(0, 80)));
}

console.log("\n--- first 4 verses (token text) ---");
lesson.verses.slice(0, 4).forEach((vs) => {
  const txt = vs.tokens.map((t) => t.surface).join("");
  console.log("v" + vs.verse_number + ":", JSON.stringify(txt));
});

const normalize = (s: string) =>
  s.replace(/[\s　、。！？・「」『』（）\-,.!?()"']/g, "").toLowerCase();

if (synced) {
  console.log("\n--- normalized comparison ---");
  const verse1 = normalize(lesson.verses[0].tokens.map((t) => t.surface).join(""));
  console.log("verse1 normalized:", JSON.stringify(verse1));
  console.log("first 6 synced normalized:");
  synced.slice(0, 6).forEach((l, i) => console.log(" ", i, JSON.stringify(normalize(l.text))));
}
process.exit(0);
