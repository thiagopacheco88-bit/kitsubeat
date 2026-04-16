import { readFileSync, readdirSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { Client } from "@neondatabase/serverless";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");
config({ path: join(ROOT, ".env.local") });

const DIR = join(ROOT, "drizzle");
const onlyArg = process.argv.slice(2).find((a) => a.endsWith(".sql"));

const client = new Client(process.env.DATABASE_URL!);
await client.connect();

const files = readdirSync(DIR)
  .filter((f) => f.endsWith(".sql"))
  .filter((f) => (onlyArg ? f === onlyArg : true))
  .sort();

for (const file of files) {
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
      if (/already exists|duplicate_object/i.test(msg)) {
        console.log(`  · [${i + 1}] skip (exists) — ${preview}`);
      } else {
        console.error(`  ✗ [${i + 1}] ${preview}\n    ${msg}`);
        process.exit(1);
      }
    }
  }
}

await client.end();
console.log("\n✓ migrations applied");
