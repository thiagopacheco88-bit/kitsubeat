import { config } from "dotenv";
config({ path: ".env.local" });
import { getDb } from "../src/lib/db/index.js";
import { songs, songVersions } from "../src/lib/db/schema.js";
import { eq } from "drizzle-orm";

const db = getDb();
const rows = await db
  .select({
    slug: songs.slug,
    type: songVersions.version_type,
    synced_lrc: songVersions.synced_lrc,
    lesson: songVersions.lesson,
  })
  .from(songVersions)
  .innerJoin(songs, eq(songs.id, songVersions.song_id));

type Row = { slug: string; type: "full" | "tv"; synced_lrc: unknown; lesson: unknown };
const bySlug = new Map<string, { full?: Row; tv?: Row }>();
for (const r of rows as Row[]) {
  const entry = bySlug.get(r.slug) ?? {};
  entry[r.type] = r;
  bySlug.set(r.slug, entry);
}

let tvNoSync = 0;
let tvThin = 0;
let examples: string[] = [];
for (const [slug, v] of bySlug) {
  if (!v.tv) continue;
  const tvSync = (v.tv.synced_lrc as unknown[] | null)?.length ?? 0;
  const tvVerses = ((v.tv.lesson as { verses?: unknown[] } | null)?.verses?.length) ?? 0;
  const fullVerses = ((v.full?.lesson as { verses?: unknown[] } | null)?.verses?.length) ?? 0;
  if (tvSync === 0) {
    tvNoSync++;
    if (examples.length < 10) examples.push(`  ${slug}: tv_sync=0 tv_verses=${tvVerses} full_verses=${fullVerses}`);
  }
  if (fullVerses > 0 && tvVerses < Math.max(3, fullVerses * 0.3)) {
    tvThin++;
  }
}
console.log(`TV versions total: ${[...bySlug.values()].filter((v) => v.tv).length}`);
console.log(`TV without synced_lrc: ${tvNoSync}`);
console.log(`TV with thin lesson (<30% of full verses): ${tvThin}`);
console.log("Examples of tv_sync=0:");
for (const e of examples) console.log(e);
process.exit(0);
