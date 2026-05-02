/**
 * Phase 14 plan 14-00 task 4 — verify users.theme_preference column.
 *
 * Confirms the migration 0016 landed and the CHECK constraint is active.
 * Pattern adopted from scripts/debug/verify-image-url-column.ts (Phase 11.4).
 */
import { Client } from "@neondatabase/serverless";
import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "..", "..", ".env.local") });

const c = new Client(process.env.DATABASE_URL!);
await c.connect();

const colRes = await c.query(
  `SELECT column_name, data_type, is_nullable, column_default
     FROM information_schema.columns
    WHERE table_name='users' AND column_name='theme_preference'`,
);
console.log("Column:", JSON.stringify(colRes.rows));

const conRes = await c.query(
  `SELECT conname, pg_get_constraintdef(oid) AS def
     FROM pg_constraint WHERE conname='users_theme_preference_check'`,
);
console.log("Constraint:", JSON.stringify(conRes.rows));

const mig = await c.query(
  `SELECT filename FROM schema_migrations WHERE filename = '0016_user_theme_preference.sql'`,
);
console.log("Migration record:", JSON.stringify(mig.rows));

await c.end();

if (colRes.rows.length !== 1) {
  console.error("FAIL: column missing");
  process.exit(1);
}
console.log("OK: theme_preference column exists");
