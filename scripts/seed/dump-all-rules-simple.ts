import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb } from "../../src/lib/db/index.js";
import { grammarRules } from "../../src/lib/db/schema.js";
import { asc } from "drizzle-orm";

async function main() {
  const db = getDb();
  const r = await db
    .select({ jlpt: grammarRules.jlpt_reference, name: grammarRules.name })
    .from(grammarRules)
    .orderBy(asc(grammarRules.jlpt_reference), asc(grammarRules.name));

  console.log(`count: ${r.length}`);
  const byLevel: Record<string, string[]> = {};
  r.forEach((x) => {
    (byLevel[x.jlpt] ??= []).push(x.name);
  });
  for (const jlpt of Object.keys(byLevel).sort()) {
    console.log(`\n--- ${jlpt} (${byLevel[jlpt].length}) ---`);
    byLevel[jlpt].forEach((n, i) => console.log(`  ${i + 1}. ${n}`));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
