import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb } from "../../src/lib/db/index.js";
import { songs, songVersions } from "../../src/lib/db/schema.js";
import { eq } from "drizzle-orm";

const slugs = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      "mezase-pokemon-master-rica-matsumoto",
      "guren-no-yumiya-linked-horizon",
    ];

const db = getDb();
for (const slug of slugs) {
  const rows = await db
    .select({ slug: songs.slug, verId: songVersions.id, type: songVersions.version_type, offset: songVersions.lyrics_offset_ms, lesson: songVersions.lesson, hasLrc: songVersions.synced_lrc })
    .from(songVersions)
    .innerJoin(songs, eq(songVersions.song_id, songs.id))
    .where(eq(songs.slug, slug));

  for (const r of rows) {
    console.log(`\n=== ${r.slug} (${r.type}) ===`);
    console.log(`  song_version_id: ${r.verId}`);
    console.log(`  lyrics_offset_ms: ${r.offset}`);
    console.log(`  synced_lrc: ${r.hasLrc ? "present (" + (r.hasLrc as unknown[]).length + " lines)" : "null"}`);
    const lesson = r.lesson as { verses?: Array<{ verse_number: number; start_time_ms?: number; tokens?: Array<{ surface: string }> }> } | null;
    if (!lesson?.verses) {
      console.log("  no verses");
      continue;
    }
    console.log(`  verses (${lesson.verses.length}):`);
    for (const v of lesson.verses) {
      const text = v.tokens?.map((t) => t.surface).join("") ?? "";
      const preview = text.slice(0, 30);
      console.log(`    v${String(v.verse_number).padStart(2)} start=${String(v.start_time_ms ?? "—").padStart(7)}ms  "${preview}${text.length > 30 ? "…" : ""}"`);
    }
  }
}
process.exit(0);
