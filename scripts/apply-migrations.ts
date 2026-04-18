import { readFileSync, readdirSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { Client } from "@neondatabase/serverless";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");
config({ path: join(ROOT, ".env.local") });

const DIR = join(ROOT, "drizzle");
const args = process.argv.slice(2);
const onlyArg = args.find((a) => a.endsWith(".sql"));
const adoptArg = args.includes("--adopt");

const client = new Client(process.env.DATABASE_URL!);
await client.connect();

// Tracker table — records which migration files have already been applied
// against this database, so re-runs are true no-ops.
await client.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`);

const allFiles = readdirSync(DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const { rows } = await client.query<{ filename: string }>(
  `SELECT filename FROM schema_migrations`
);
const applied = new Set(rows.map((r) => r.filename));

// --adopt: mark every existing .sql as applied WITHOUT executing it. Used once
// per database to bootstrap the tracker on a DB that was manually migrated.
if (adoptArg) {
  let adopted = 0;
  for (const file of allFiles) {
    if (!applied.has(file)) {
      await client.query(
        `INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING`,
        [file]
      );
      console.log(`  ✓ adopted ${file}`);
      adopted++;
    }
  }
  await client.end();
  console.log(`\n✓ adoption complete (${adopted} file(s) recorded)`);
  process.exit(0);
}

const pending = allFiles
  .filter((f) => !applied.has(f))
  .filter((f) => (onlyArg ? f === onlyArg : true));

if (pending.length === 0) {
  console.log("✓ no pending migrations");
  await client.end();
  process.exit(0);
}

for (const file of pending) {
  const content = readFileSync(join(DIR, file), "utf-8");
  const statements = content
    .split(/--> statement-breakpoint/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !/^(--.*\n?)+$/.test(s));

  console.log(`\n▶ ${file} — ${statements.length} statements`);
  for (const [i, stmt] of statements.entries()) {
    const preview = stmt.replace(/\s+/g, " ").slice(0, 70);
    try {
      await client.query(stmt);
      console.log(`  ✓ [${i + 1}] ${preview}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ [${i + 1}] ${preview}\n    ${msg}`);
      await client.end();
      process.exit(1);
    }
  }

  await client.query(
    `INSERT INTO schema_migrations (filename) VALUES ($1)`,
    [file]
  );
  console.log(`  ✓ recorded ${file}`);
}

await client.end();
console.log(`\n✓ applied ${pending.length} migration(s)`);
