import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb } from "../src/lib/db/index.js";
import { sql } from "drizzle-orm";

const db = getDb();

await db.execute(sql`
  ALTER TABLE "anime_metadata"
    ADD COLUMN IF NOT EXISTS "start_year" integer,
    ADD COLUMN IF NOT EXISTS "genres" text[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS "tags" text[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS "description" text,
    ADD COLUMN IF NOT EXISTS "season" text,
    ADD COLUMN IF NOT EXISTS "season_year" integer,
    ADD COLUMN IF NOT EXISTS "average_score" integer,
    ADD COLUMN IF NOT EXISTS "popularity" integer
`);

console.log("Migration 0021 applied — anime_metadata enrichment columns added.");
process.exit(0);
