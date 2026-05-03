import { config } from "dotenv";
config({ path: ".env.local" });
import { sql } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";

const id = process.argv[2];
async function main() {
  const db = getDb();
  const r = await db.execute(sql`SELECT name, jlpt_reference, explanation FROM grammar_rules WHERE id = ${id}::uuid`);
  const rows = (r.rows ?? r) as Array<{ name: string; jlpt_reference: string; explanation: { en: string } }>;
  if (!rows[0]) { console.log("not found"); return; }
  console.log(`# ${rows[0].name} [${rows[0].jlpt_reference}]\n`);
  console.log(rows[0].explanation.en);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
