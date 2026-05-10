/**
 * normalize-anime-names.ts — Consolidate franchise variants in the manifest + DB.
 *
 * Problem: the manifest's `anime` field carries season/arc suffixes
 * (e.g. "Attack on Titan Final Season") that make the same franchise appear
 * as many different shows in carousels. The `season_info` field already
 * captures exact season context, so `anime` should be the canonical
 * franchise name only.
 *
 * Usage:
 *   npx tsx scripts/seed/normalize-anime-names.ts          # dry-run (default)
 *   npx tsx scripts/seed/normalize-anime-names.ts --apply  # write manifest + update DB
 */

import { config } from "dotenv";
import { readFileSync, writeFileSync } from "fs";
import { resolve, join } from "path";
import { fileURLToPath } from "url";

config({ path: ".env.local" });

import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../../");
const MANIFEST_PATH = join(PROJECT_ROOT, "data/songs-manifest.json");

// Map: variant anime name → canonical franchise name
const NORMALIZATION_MAP: Record<string, string> = {
  // Attack on Titan
  "Attack on Titan Season 2": "Attack on Titan",
  "Attack on Titan Season 3": "Attack on Titan",
  "Attack on Titan Season 3 Part 2": "Attack on Titan",
  "Attack on Titan Final Season": "Attack on Titan",
  "Attack on Titan Final Season: The Final Chapters": "Attack on Titan",
  "Attack on Titan: Crimson Arrows": "Attack on Titan",
  "Attack on Titan: Junior High": "Attack on Titan",
  "Attack on Titan: Lost Girls": "Attack on Titan",
  "Attack on Titan: No Regrets": "Attack on Titan",
  "Attack on Titan: The Wings of Freedom": "Attack on Titan",

  // Sword Art Online
  "Sword Art Online II": "Sword Art Online",
  "Sword Art Online: Extra Edition": "Sword Art Online",
  "Sword Art Online the Movie: Ordinal Scale": "Sword Art Online",
  "Sword Art Online Alternative: Gun Gale Online": "Sword Art Online",
  "Sword Art Online: Alicization": "Sword Art Online",
  "Sword Art Online: Alicization - War of Underworld": "Sword Art Online",

  // Dragon Ball
  "Dragon Ball Z": "Dragon Ball",
  "Dragon Ball Z Kai": "Dragon Ball",
  "Dragon Ball GT": "Dragon Ball",
  "Dragon Ball Super": "Dragon Ball",
  "Dragon Ball Daima": "Dragon Ball",

  // Fullmetal Alchemist
  "Fullmetal Alchemist: Brotherhood": "Fullmetal Alchemist",
  "Fullmetal Alchemist: The Movie - Conqueror of Shamballa": "Fullmetal Alchemist",
  "Fullmetal Alchemist: Premium Collection": "Fullmetal Alchemist",
  "Fullmetal Alchemist: The Sacred Star of Milos": "Fullmetal Alchemist",

  // Bleach
  "Bleach: Thousand-Year Blood War": "Bleach",

  // Evangelion (Rebuild films → same franchise as the TV series)
  "Evangelion: 1.0 You Are (Not) Alone": "Neon Genesis Evangelion",
  "Evangelion: 3.0 You Can (Not) Redo": "Neon Genesis Evangelion",
  "Evangelion: 3.0+1.0 Thrice Upon a Time": "Neon Genesis Evangelion",

  // Hunter x Hunter (two adaptations, same story)
  "Hunter x Hunter (1999)": "Hunter x Hunter",
  "Hunter x Hunter (2011)": "Hunter x Hunter",

  // Kingdom Hearts
  "Kingdom Hearts II": "Kingdom Hearts",
  "Kingdom Hearts III": "Kingdom Hearts",

  // Rurouni Kenshin
  "Rurouni Kenshin (2023)": "Rurouni Kenshin",

  // Tokyo Ghoul
  "Tokyo Ghoul Root A": "Tokyo Ghoul",
  "Tokyo Ghoul:re": "Tokyo Ghoul",

  // One Piece
  "One Piece Film: Red": "One Piece",
};

type ManifestEntry = { slug: string; anime: string; [key: string]: unknown };

function normalize(name: string): string {
  return NORMALIZATION_MAP[name] ?? name;
}

async function main() {
  const apply = process.argv.includes("--apply");

  // --- Update manifest ---
  const manifest: ManifestEntry[] = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
  let manifestChanges = 0;
  const updated = manifest.map((entry) => {
    const canonical = normalize(entry.anime);
    if (canonical !== entry.anime) {
      console.log(`  manifest: "${entry.slug}" "${entry.anime}" → "${canonical}"`);
      manifestChanges++;
      return { ...entry, anime: canonical };
    }
    return entry;
  });

  console.log(`\nManifest: ${manifestChanges} entries to update`);

  // --- Compute DB updates: group by (from → to) ---
  const dbGroups: Record<string, { from: string; to: string; count: number }> = {};
  for (const [from, to] of Object.entries(NORMALIZATION_MAP)) {
    const key = `${from}|||${to}`;
    dbGroups[key] = { from, to, count: manifest.filter((e) => e.anime === from).length };
  }

  const activeGroups = Object.values(dbGroups).filter((g) => g.count > 0);
  console.log(`\nDB updates (${activeGroups.length} distinct renames, ${activeGroups.reduce((s, g) => s + g.count, 0)} rows):`);
  for (const g of activeGroups) {
    console.log(`  "${g.from}" → "${g.to}" (${g.count} rows)`);
  }

  if (!apply) {
    console.log("\nDry-run complete. Pass --apply to write changes.");
    return;
  }

  // --- Write manifest ---
  writeFileSync(MANIFEST_PATH, JSON.stringify(updated, null, 2) + "\n");
  console.log(`\nManifest updated (${manifestChanges} entries).`);

  // --- Update DB ---
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  let dbRows = 0;
  for (const g of activeGroups) {
    const result = await db.execute(
      sql`UPDATE songs SET anime = ${g.to} WHERE anime = ${g.from}`
    );
    const rowCount = (result as unknown as { rowCount: number }).rowCount ?? 0;
    console.log(`  DB: "${g.from}" → "${g.to}" (${rowCount} rows updated)`);
    dbRows += rowCount;
  }

  console.log(`\nDone. DB rows updated: ${dbRows}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
