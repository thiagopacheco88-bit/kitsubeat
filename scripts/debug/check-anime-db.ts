import { config } from "dotenv";
import { Client } from "@neondatabase/serverless";
import { join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: join(resolve(__dirname, "../.."), ".env.local") });

const client = new Client(process.env.DATABASE_URL!);
await client.connect();

const t = await client.query(
  "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename='anime_vocab_catalog'"
);
console.log("anime_vocab_catalog exists:", t.rows.length > 0);

const c = await client.query(
  "SELECT column_name FROM information_schema.columns WHERE table_name='anime_metadata' AND column_name='start_year'"
);
console.log("start_year column exists:", c.rows.length > 0);

const m = await client.query(
  "SELECT filename FROM schema_migrations ORDER BY filename"
);
console.log("schema_migrations entries:", m.rows.length);
console.log("Applied:", m.rows.map((r: { filename: string }) => r.filename).join("\n  "));

await client.end();
