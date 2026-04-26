/**
 * apply-migration-0012.ts — One-off runner for drizzle/0012_grammar_system.sql.
 *
 * The project has no drizzle-kit migrate step wired up; other migrations in
 * this tree are applied manually via psql or the pipeline's ad-hoc scripts.
 * This is the Phase 13 counterpart: it reads the SQL file, splits on the
 * `--> statement-breakpoint` marker (drizzle-kit convention used throughout
 * this repo), and executes each statement via the Neon HTTP client.
 *
 * Idempotent — each statement uses IF NOT EXISTS guards.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/apply-migration-0012.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "fs";
import { resolve } from "path";
import { Client } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const client = new Client(url);
  await client.connect();
  const path = resolve(process.cwd(), "drizzle/0012_grammar_system.sql");
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

  console.log(`applying ${statements.length} statements from 0012_grammar_system.sql`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const firstLine = stmt.split("\n")[0]?.slice(0, 80) ?? "";
    console.log(`  [${i + 1}/${statements.length}] ${firstLine}...`);
    try {
      await client.query(stmt);
    } catch (err) {
      console.error(`  failed at statement ${i + 1}:`, err);
      throw err;
    }
  }

  await client.end();
  console.log("migration 0012 applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
