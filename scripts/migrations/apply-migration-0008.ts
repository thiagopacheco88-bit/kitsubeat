/**
 * Temporary one-shot script to apply drizzle/0008_gamification.sql.
 * Run via: tsx --tsconfig tsconfig.scripts.json scripts/apply-migration-0008.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function exec(statement: string) {
  const preview = statement.replace(/\s+/g, " ").substring(0, 80);
  console.log(`Executing: ${preview}...`);
  // neon sql function used as tagged template; for raw DDL use sql([stmt], []) form
  await sql([statement] as unknown as TemplateStringsArray, ...[]);
  console.log("  OK");
}

async function main() {
  // Users gamification columns
  await exec(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "xp_total" integer NOT NULL DEFAULT 0`);
  await exec(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "level" integer NOT NULL DEFAULT 1`);
  await exec(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "xp_today" integer NOT NULL DEFAULT 0`);
  await exec(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "xp_today_date" date`);
  await exec(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "streak_current" integer NOT NULL DEFAULT 0`);
  await exec(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "streak_best" integer NOT NULL DEFAULT 0`);
  await exec(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_streak_date" date`);
  await exec(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "streak_tz" text`);
  await exec(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "grace_used_this_week" boolean NOT NULL DEFAULT false`);
  await exec(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "streak_week_start" date`);
  await exec(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "current_path_node_slug" text`);
  await exec(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "sound_enabled" boolean NOT NULL DEFAULT true`);
  await exec(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "haptics_enabled" boolean NOT NULL DEFAULT true`);

  // user_cosmetics table
  await exec(`CREATE TABLE IF NOT EXISTS "user_cosmetics" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "slot_id" text NOT NULL,
    "unlocked_at" timestamp with time zone DEFAULT now(),
    "equipped" boolean DEFAULT false,
    CONSTRAINT "user_cosmetics_user_slot_unique" UNIQUE ("user_id", "slot_id")
  )`);

  await exec(`CREATE INDEX IF NOT EXISTS "user_cosmetics_user_id_idx" ON "user_cosmetics" ("user_id")`);

  // reward_slot_definitions table
  await exec(`CREATE TABLE IF NOT EXISTS "reward_slot_definitions" (
    "id" text PRIMARY KEY NOT NULL,
    "slot_type" text NOT NULL,
    "level_threshold" integer NOT NULL,
    "content" jsonb NOT NULL,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT now()
  )`);

  console.log("\nMigration 0008_gamification.sql applied successfully.");
}

main().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
