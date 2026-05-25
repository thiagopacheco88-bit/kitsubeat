import { Client } from "@neondatabase/serverless";
import { config } from "dotenv";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: join(resolve(__dirname, ".."), ".env.local") });

async function main() {
  const c = new Client(process.env.DATABASE_URL!);
  await c.connect();
  const r = await c.query(`SELECT count(*) FROM vocabulary_items`);
  console.log("vocabulary_items rows:", r.rows[0]);
  const r2 = await c.query(`SELECT count(*) FROM vocab_global`);
  console.log("vocab_global rows:", r2.rows[0]);
  await c.end();
}
main();
