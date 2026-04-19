import { resolve, join } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { Client } from "@neondatabase/serverless";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: join(resolve(__dirname, "..", ".."), ".env.local") });

const SLUGS = process.argv.slice(2);
if (SLUGS.length === 0) {
  console.error("Usage: inspect-romaji-suspects.ts <slug1> <slug2> ...");
  process.exit(1);
}

const JP_RE = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const { rows } = await client.query<{
    slug: string;
    version_type: string;
    lesson: { verses?: Array<{ verse_number: number; tokens?: Array<{ surface?: string; reading?: string }> }> } | null;
  }>(
    `SELECT s.slug, sv.version_type, sv.lesson
     FROM songs s JOIN song_versions sv ON sv.song_id = s.id
     WHERE s.slug = ANY($1)
     ORDER BY s.slug, sv.version_type`,
    [SLUGS]
  );

  for (const r of rows) {
    console.log(`\n=== ${r.slug} [${r.version_type}] ===`);
    const verses = r.lesson?.verses ?? [];
    for (const v of verses) {
      const flagged = (v.tokens ?? []).filter(
        (t) => t.surface && t.reading && t.surface !== t.reading && !JP_RE.test(t.surface) && JP_RE.test(t.reading)
      );
      if (flagged.length === 0) continue;
      console.log(`  v${v.verse_number} (flagged ${flagged.length}):`);
      for (const t of flagged) {
        console.log(`    surface="${t.surface}"  reading="${t.reading}"`);
      }
    }
  }

  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
