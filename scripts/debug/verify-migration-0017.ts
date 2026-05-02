import { config } from "dotenv";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname2 = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname2, "../..");
config({ path: join(ROOT, ".env.local") });
if (!process.env.DATABASE_URL) {
  config({ path: "C:/Users/thiag/velora-projects/kitsubeat/.env.local" });
}

import { Client } from "@neondatabase/serverless";

const client = new Client(process.env.DATABASE_URL!);
await client.connect();

// Check if 0017 is tracked
const r0 = await client.query(
  "SELECT filename, applied_at FROM schema_migrations WHERE filename = '0017_dual_card_kind_and_verse_domination.sql'"
);
console.log("migration_tracked:", JSON.stringify(r0.rows));

const r1 = await client.query("SELECT to_regtype('card_kind')::text AS t");
const r2 = await client.query("SELECT to_regclass('user_verse_domination')::text AS c");
const r3 = await client.query(
  "SELECT column_name FROM information_schema.columns WHERE table_name='user_song_progress' AND column_name IN ('vocab_track_pct','grammar_track_pct','kanji_track_pct','advanced_drills_unlocked_at') ORDER BY column_name"
);
const r4 = await client.query(
  "SELECT conname FROM pg_constraint WHERE conrelid = 'user_vocab_mastery'::regclass AND conname IN ('user_vocab_mastery_user_vocab_unique','user_vocab_mastery_user_vocab_kind_unique') ORDER BY conname"
);
const r5 = await client.query("SELECT count(*)::text as cnt FROM user_vocab_mastery");
const r6 = await client.query(
  "SELECT column_name FROM information_schema.columns WHERE table_name='user_vocab_mastery' AND column_name='card_kind'"
);

// Also check NOT EXISTS for old constraint
const r7 = await client.query(
  "SELECT conname FROM pg_constraint WHERE conrelid = 'user_vocab_mastery'::regclass AND conname = 'user_vocab_mastery_user_vocab_unique'"
);

console.log("card_kind_type:", JSON.stringify(r1.rows));
console.log("verse_dom_table:", JSON.stringify(r2.rows));
console.log("new_usp_columns_count:", r3.rows.length);
console.log("uvm_new_constraint:", JSON.stringify(r4.rows));
console.log("uvm_old_constraint_gone:", r7.rows.length === 0 ? "YES" : "NO — still exists");
console.log("uvm_row_count:", JSON.stringify(r5.rows));
console.log("card_kind_col:", JSON.stringify(r6.rows));

await client.end();
