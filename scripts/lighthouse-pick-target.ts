/**
 * Phase 13 D-17: pick the catalog-median song by lesson JSONB byte size.
 *
 * Writes the chosen slug to lighthouse-baseline/target-song.txt so subsequent
 * `npm run lighthouse:baseline` runs (and Phase 19 re-runs) target the SAME
 * representative slug.
 *
 * Pre-condition: .env.local has DATABASE_URL set. dotenv MUST be called before
 * any DB-touching import (the db Proxy validates DATABASE_URL on first
 * access — see src/lib/db/index.ts).
 *
 * Median selection rule (D-17 LOCKED): pick by octet_length(v.lesson::text)
 * of the song_versions.lesson JSONB. Reject "heaviest song" (pessimistic) and
 * "hardcoded slug" (drifts with catalog growth).
 *
 * Usage:
 *   npm run lighthouse:pick-target
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { resolve, join } from "path";
import { fileURLToPath } from "url";
import { writeFileSync, mkdirSync } from "fs";
import { sql } from "drizzle-orm";
import { getDb } from "../src/lib/db/index.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const db = getDb();

const result = await db.execute(sql`
  SELECT s.slug, octet_length(v.lesson::text) AS bytes
    FROM songs s
    JOIN song_versions v ON v.song_id = s.id
   WHERE v.lesson IS NOT NULL
   ORDER BY bytes ASC
`);

// Drizzle/neon-http may return an array OR an object with .rows
const rows = (
  Array.isArray(result) ? result : (result as { rows?: unknown }).rows ?? []
) as Array<{ slug: string; bytes: number }>;

if (rows.length === 0) {
  console.error(
    "[pick-target] No seeded songs with lesson found. Run npm run seed:dev first."
  );
  process.exit(1);
}

const medianIndex = Math.floor(rows.length / 2);
const median = rows[medianIndex];

const outDir = resolve(
  __dirname,
  "..",
  ".planning",
  "phases",
  "13-performance-infrastructure",
  "lighthouse-baseline"
);
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "target-song.txt"), median.slug, "utf-8");

console.log(
  `[pick-target] median slug: ${median.slug} (${median.bytes} bytes; rank ${medianIndex + 1}/${rows.length})`
);

process.exit(0);
