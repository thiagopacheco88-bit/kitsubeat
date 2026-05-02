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

await client.query(
  "INSERT INTO schema_migrations (filename) VALUES ('0017_dual_card_kind_and_verse_domination.sql') ON CONFLICT DO NOTHING"
);
const r = await client.query(
  "SELECT filename, applied_at FROM schema_migrations WHERE filename LIKE '0017%'"
);
console.log("recorded:", JSON.stringify(r.rows));

await client.end();
