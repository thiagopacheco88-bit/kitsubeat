/**
 * Audit which canonical rules have exercises, and which authored canonicals
 * (batch1/2/HoS) have zero exercises (signal that exercises may have been
 * lost via cascade when their original rule_id was an orphan).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";

const V2_CANONICALS = [
  // batch 1
  "0588f1da-7292-4efc-bebf-3d103b09b7d6","670a043a-cc9c-4e59-958e-60a43313c364","28040405-e731-49b2-9bb5-a082bbf34da2","ebd9bcdf-2acf-4879-a970-50f98346c3cf","cd6b0ba0-2202-4c5e-8856-db742ca9d2bf","2f4bde8c-f15b-43bc-bcfa-191da710a386","7055ddcc-0f83-4d34-94ca-6b8807abd37e","bce4d9cb-0d2c-41fb-a910-7f1a127ba466","4d5ffbe9-28ba-475a-a185-d090a30e75a3","975331f4-03e3-4703-94a7-100d26eb5145",
  // batch 2
  "9c03bf67-2944-4a87-88fe-7ef21fd1edaf","16cee5b1-d12f-4943-a9ed-6812dfe73d26","47e9005b-2c76-4c7d-8e05-10d53c506123","b275fafa-892e-45a7-94c6-8a48271031ed","14e074d3-b63d-429f-954a-03bde8b36612","c52c6db9-1101-4e55-a082-e883ac1fa800","02522b64-19a7-422c-87d7-318afd223420","4c07593c-4c9a-4ecb-86d5-ab49c372825f","e172f73b-9c00-439a-b0da-b24b207d7e80","75765b3c-d98d-4081-9316-dd2f85f309eb","4d218c66-5ade-47a3-87a1-002466891415","8748faec-25ee-4167-ad26-c7b292f5fa41","c3fd6077-9048-44c1-b8ec-93fe565fdc2b","82bde35d-b73c-494a-a1a0-dff9fc412303","3271a7b8-8e74-4372-9a57-ec39b80e8cc6",
];

async function main() {
  const db = getDb();
  const idList = V2_CANONICALS.map((id) => `'${id}'::uuid`).join(",");
  const res = await db.execute(sql.raw(`
    SELECT
      gr.id,
      gr.name,
      COUNT(ge.id)::int AS exercise_count
    FROM grammar_rules gr
    LEFT JOIN grammar_exercises ge ON ge.grammar_rule_id = gr.id
    WHERE gr.id IN (${idList})
    GROUP BY gr.id, gr.name
    ORDER BY exercise_count DESC, gr.name
  `));
  const rows = (res.rows ?? res) as Array<{ id: string; name: string; exercise_count: number }>;
  console.log("[audit] exercises per v2 canonical:");
  let withEx = 0, withoutEx = 0;
  for (const r of rows) {
    console.log(`  ${r.exercise_count.toString().padStart(3)} | ${r.name}`);
    if (r.exercise_count > 0) withEx++; else withoutEx++;
  }
  console.log(`\n  ${withEx} canonicals have exercises, ${withoutEx} have none`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
