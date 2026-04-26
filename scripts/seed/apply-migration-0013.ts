/**
 * apply-migration-0013.ts — One-off runner for drizzle/0013_dual_source_lyrics.sql.
 *
 * Adds canonical_lyrics + whisper_lyrics jsonb columns to song_versions so
 * future validator runs never overwrite trustworthy lrclib/genius data.
 *
 * Idempotent — each statement uses IF NOT EXISTS guards.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/apply-migration-0013.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "fs";
import { resolve } from "path";
import { Pool } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });
  const path = resolve(process.cwd(), "drizzle/0013_dual_source_lyrics.sql");
  const source = readFileSync(path, "utf8");

  // Strip SQL comments at line start and split on the drizzle breakpoint.
  const statements = source
    .split("--> statement-breakpoint")
    .map((chunk) =>
      chunk
        .split("\n")
        .filter((line) => !line.trimStart().startsWith("--"))
        .join("\n")
        .trim()
    )
    .filter((s) => s.length > 0);

  console.log(`applying ${statements.length} statements from 0013_dual_source_lyrics.sql`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const firstLine = stmt.split("\n")[0]?.slice(0, 80) ?? "";
    console.log(`  [${i + 1}/${statements.length}] ${firstLine}...`);
    try {
      await pool.query(stmt);
    } catch (err) {
      console.error(`  failed at statement ${i + 1}:`, err);
      throw err;
    }
  }

  await pool.end();
  console.log("migration 0013 applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
