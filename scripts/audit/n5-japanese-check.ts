import { resolve, join } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { Client } from "@neondatabase/serverless";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: join(resolve(__dirname, "..", ".."), ".env.local") });

// Matches any Hiragana, Katakana, or CJK Unified Ideograph (kanji).
const JP_REGEX = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;

interface VerseToken {
  surface?: string;
}
interface Verse {
  tokens?: VerseToken[];
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const { rows } = await client.query<{
    song_id: string;
    slug: string;
    title: string;
    artist: string;
    jlpt_level: string | null;
    version_type: string;
    lesson: { verses?: Verse[] } | null;
  }>(`
    SELECT s.id AS song_id, s.slug, s.title, s.artist, s.jlpt_level,
           sv.version_type, sv.lesson
    FROM songs s
    JOIN song_versions sv ON sv.song_id = s.id
    WHERE sv.lesson IS NOT NULL
    ORDER BY s.jlpt_level, s.popularity_rank NULLS LAST, s.slug, sv.version_type
  `);

  console.log(`Scanning ${rows.length} song_versions across all JLPT levels…\n`);

  const suspects: Array<{
    slug: string;
    title: string;
    artist: string;
    jlpt: string | null;
    version: string;
    totalVerses: number;
    jpVerses: number;
    jpPct: number;
    sampleEnglish: string[];
  }> = [];

  for (const r of rows) {
    const verses = r.lesson?.verses ?? [];
    const totalVerses = verses.length;
    if (totalVerses === 0) continue;

    let jpVerses = 0;
    const englishSurfaces: string[] = [];

    for (const v of verses) {
      const surfaces = (v.tokens ?? []).map((t) => t.surface ?? "").join("");
      if (JP_REGEX.test(surfaces)) {
        jpVerses++;
      } else if (surfaces.trim().length > 0 && englishSurfaces.length < 2) {
        englishSurfaces.push(surfaces.slice(0, 60));
      }
    }

    const jpPct = totalVerses === 0 ? 0 : (jpVerses / totalVerses) * 100;

    if (jpPct < 50) {
      suspects.push({
        slug: r.slug,
        title: r.title,
        artist: r.artist,
        jlpt: r.jlpt_level,
        version: r.version_type,
        totalVerses,
        jpVerses,
        jpPct,
        sampleEnglish: englishSurfaces,
      });
    }
  }

  if (suspects.length === 0) {
    console.log("All songs have ≥50% verses with Japanese characters.");
  } else {
    console.log(`Found ${suspects.length} suspect versions (< 50% JP verses):\n`);
    for (const s of suspects) {
      console.log(
        `  [${s.jlpt ?? "?"}] ${s.slug} [${s.version}] — ${s.title} (${s.artist})`
      );
      console.log(
        `    ${s.jpVerses}/${s.totalVerses} verses with JP (${s.jpPct.toFixed(
          0
        )}%)`
      );
      for (const sample of s.sampleEnglish) {
        console.log(`    e.g. "${sample}"`);
      }
    }
  }

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
