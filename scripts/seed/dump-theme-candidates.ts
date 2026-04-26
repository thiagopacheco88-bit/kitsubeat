/**
 * dump-theme-candidates.ts — one-shot helper for the inline-classification
 * workflow. Dumps every song whose season_info lacks an OP/ED/Insert/OST/Theme
 * marker into data/theme-candidates.json so Claude can classify them inline
 * (no Anthropic API spend) and produce theme-classifications.json for the apply
 * step.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { getDb } from "../../src/lib/db/index.js";
import { songs } from "../../src/lib/db/schema.js";

const CLASSIFIED_RE =
  /\b(OP|ED|Opening|Ending|Insert|OST|Movie Theme|Character Theme|Theme)\b/i;
const OUT_PATH = resolve(process.cwd(), "data/theme-candidates.json");

async function main() {
  const db = getDb();
  const rows = await db
    .select({
      id: songs.id,
      slug: songs.slug,
      title: songs.title,
      artist: songs.artist,
      anime: songs.anime,
      year_launched: songs.year_launched,
      season_info: songs.season_info,
    })
    .from(songs);

  const pending = rows.filter(
    (r) => !r.season_info || !CLASSIFIED_RE.test(r.season_info)
  );

  pending.sort((a, b) => a.slug.localeCompare(b.slug));

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(
    OUT_PATH,
    JSON.stringify(
      { total_in_db: rows.length, pending_count: pending.length, rows: pending },
      null,
      2
    )
  );

  console.log(
    `[dump] ${pending.length} pending / ${rows.length} total → ${OUT_PATH}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
