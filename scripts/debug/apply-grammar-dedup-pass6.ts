/**
 * Sixth dedup pass — 11 cross-batch dupes spotted while scanning the deeper
 * candidate band (ranks 33-60 of post-pass5), plus 1 non-grammar deletion.
 * Same data-preserving 7-step protocol. Idempotent.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";

interface MergePair { orphan: string; canonical: string; reason: string; }

const MERGES: MergePair[] = [
  { orphan: "5cc4e34b", canonical: "ebd9bcdf", reason: "Imperative form (commands) → batch1 命令形" },
  { orphan: "54523f3b", canonical: "d058db02", reason: "Literary 〜ぬ N1 → batch3b 〜nu classical" },
  { orphan: "126ccd9e", canonical: "d058db02", reason: "Literary 〜ぬ N1 dup → batch3b 〜nu classical" },
  { orphan: "2d029959", canonical: "0e471da0", reason: "Verb stem + そう → batch3b 〜sou (visual)" },
  { orphan: "38ea38c8", canonical: "e6d9fc96", reason: "Verb stem + 出す → batch3a 〜だす sudden start" },
  { orphan: "acb5af46", canonical: "737080ec", reason: "Verb stem + 切る + ない → batch3a 〜kirenai" },
  { orphan: "171a233e", canonical: "75765b3c", reason: "volitional 〜よう/〜おう → batch2 Volitional" },
  { orphan: "415e6c3d", canonical: "bde81cdd", reason: "〜かけた past → batch3b 〜kakeru" },
  { orphan: "6ebc71c7", canonical: "bde81cdd", reason: "〜かけて te-form → batch3b 〜kakeru" },
  { orphan: "9244f9a8", canonical: "8c42f4ca", reason: "〜くらいなら N3 → batch4a 〜gurai nara" },
  { orphan: "361cac68", canonical: "02522b64", reason: "〜じまう → batch2 〜chau/jau (casual variant)" },
];

const DELETIONS_NON_GRAMMAR = [
  { id: "d47f7395", reason: "German song - no Japanese grammar (metadata)" },
];

const dryRun = process.argv.includes("--dry-run");

interface Rule { id: string; name: string; jlpt_reference: string; explanation: { en?: string } | string | null; }

async function expandPartialIds(db: any, partials: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const p of partials) {
    const res = await db.execute(sql.raw(`SELECT id::text FROM grammar_rules WHERE id::text LIKE '${p}%'`));
    const rows = (res.rows ?? res) as Array<{ id: string }>;
    if (rows.length === 1) map.set(p, rows[0].id);
    else if (rows.length === 0) map.set(p, "");
    else throw new Error(`Ambiguous partial id ${p}: ${rows.map(r => r.id).join(", ")}`);
  }
  return map;
}

async function main() {
  const db = getDb();
  const partials = Array.from(new Set([
    ...MERGES.flatMap((m) => [m.orphan, m.canonical]),
    ...DELETIONS_NON_GRAMMAR.map((d) => d.id),
  ]));
  const idMap = await expandPartialIds(db, partials);

  const fullMerges = MERGES.map((m) => ({
    orphan: idMap.get(m.orphan) ?? "",
    canonical: idMap.get(m.canonical) ?? "",
    reason: m.reason,
  }));
  const fullDeletes = DELETIONS_NON_GRAMMAR.map((d) => ({
    id: idMap.get(d.id) ?? "",
    reason: d.reason,
  }));

  const liveMerges = fullMerges.filter((m) => m.orphan && m.canonical);
  const liveDeletes = fullDeletes.filter((d) => d.id);

  console.log(`\n[dedup-pass6] merges: ${MERGES.length} declared, ${liveMerges.length} live, dry-run: ${dryRun}`);
  console.log(`[dedup-pass6] deletions: ${liveDeletes.length} live\n`);

  if (liveMerges.length === 0 && liveDeletes.length === 0) { console.log("(nothing to do)"); return; }

  const allLiveIds = Array.from(new Set([
    ...liveMerges.flatMap((m) => [m.orphan, m.canonical]),
    ...liveDeletes.map((d) => d.id),
  ]));
  const idList = allLiveIds.map((id) => `'${id}'::uuid`).join(",");
  const ruleRes = await db.execute(sql.raw(`SELECT id::text AS id, name, jlpt_reference, explanation FROM grammar_rules WHERE id IN (${idList})`));
  const byId = new Map(((ruleRes.rows ?? ruleRes) as Rule[]).map((r) => [r.id, r]));

  for (const m of liveMerges) {
    const o = byId.get(m.orphan)!; const c = byId.get(m.canonical)!;
    console.log(`  [${o.jlpt_reference}] ${o.name}\n    → [${c.jlpt_reference}] ${c.name}\n    ${m.reason}`);
  }

  if (dryRun) { console.log("\n[dedup-pass6] dry-run."); return; }

  // Step 1: re-link svgr with dup-cleanup
  let svglR = 0, svglD = 0;
  for (const m of liveMerges) {
    const dup = await db.execute(sql.raw(`DELETE FROM song_version_grammar_rules WHERE grammar_rule_id = '${m.orphan}'::uuid AND song_version_id IN (SELECT song_version_id FROM song_version_grammar_rules WHERE grammar_rule_id = '${m.canonical}'::uuid) RETURNING song_version_id`));
    svglD += ((dup.rows ?? dup) as unknown[]).length;
    const r = await db.execute(sql.raw(`UPDATE song_version_grammar_rules SET grammar_rule_id = '${m.canonical}'::uuid WHERE grammar_rule_id = '${m.orphan}'::uuid RETURNING song_version_id`));
    svglR += ((r.rows ?? r) as unknown[]).length;
  }
  console.log(`\n[dedup-pass6] svgr: ${svglR} re-linked, ${svglD} dup-dropped`);

  // Step 2: rewrite lesson JSONB
  const versionRes = await db.execute(sql`SELECT id, lesson FROM song_versions WHERE lesson IS NOT NULL AND lesson->'grammar_points' IS NOT NULL`);
  const versions = (versionRes.rows ?? versionRes) as Array<{ id: string; lesson: any }>;
  let vt = 0, pr = 0, prm = 0;
  const deletedNames = new Set(liveDeletes.map((d) => byId.get(d.id)?.name?.trim() ?? ""));
  for (const v of versions) {
    const lesson = v.lesson;
    if (!Array.isArray(lesson?.grammar_points)) continue;
    let mutated = false;
    const beforeLen = lesson.grammar_points.length;
    lesson.grammar_points = lesson.grammar_points.filter((gp: any) => {
      const isDel = deletedNames.has((gp.name ?? "").trim());
      if (isDel) prm++;
      return !isDel;
    });
    if (lesson.grammar_points.length !== beforeLen) mutated = true;
    for (const gp of lesson.grammar_points) {
      const gpN = (gp.name ?? "").trim(); const gpJ = (gp.jlpt_reference ?? "").trim();
      const match = liveMerges.find((m) => {
        const o = byId.get(m.orphan);
        return o && o.name.trim() === gpN && o.jlpt_reference.trim() === gpJ;
      });
      if (!match) continue;
      const c = byId.get(match.canonical)!;
      gp.name = c.name; gp.jlpt_reference = c.jlpt_reference;
      if (c.explanation && typeof c.explanation === "object" && "en" in c.explanation) {
        gp.explanation = { en: (c.explanation as { en: string }).en };
      }
      mutated = true; pr++;
    }
    if (mutated) {
      await db.execute(sql`UPDATE song_versions SET lesson = ${JSON.stringify(lesson)}::jsonb, updated_at = NOW() WHERE id = ${v.id}::uuid`);
      vt++;
    }
  }
  console.log(`[dedup-pass6] lesson JSONB: ${pr} rewritten + ${prm} removed across ${vt} song_versions`);

  // Step 3-5: cascade tables
  let exR = 0, mR = 0, mD = 0, lR = 0;
  for (const m of liveMerges) {
    const ex = await db.execute(sql.raw(`UPDATE grammar_exercises SET grammar_rule_id = '${m.canonical}'::uuid WHERE grammar_rule_id = '${m.orphan}'::uuid RETURNING id`));
    exR += ((ex.rows ?? ex) as unknown[]).length;
    const md = await db.execute(sql.raw(`DELETE FROM user_grammar_rule_mastery WHERE grammar_rule_id = '${m.orphan}'::uuid AND user_id IN (SELECT user_id FROM user_grammar_rule_mastery WHERE grammar_rule_id = '${m.canonical}'::uuid) RETURNING user_id`));
    mD += ((md.rows ?? md) as unknown[]).length;
    const mr = await db.execute(sql.raw(`UPDATE user_grammar_rule_mastery SET grammar_rule_id = '${m.canonical}'::uuid WHERE grammar_rule_id = '${m.orphan}'::uuid RETURNING user_id`));
    mR += ((mr.rows ?? mr) as unknown[]).length;
    const lg = await db.execute(sql.raw(`UPDATE user_grammar_exercise_log SET grammar_rule_id = '${m.canonical}'::uuid WHERE grammar_rule_id = '${m.orphan}'::uuid RETURNING id`));
    lR += ((lg.rows ?? lg) as unknown[]).length;
  }
  console.log(`[dedup-pass6] exercises: ${exR} re-linked, mastery: ${mR} re-linked + ${mD} dup-dropped, log: ${lR} re-linked`);

  // Step 6: delete
  const allToDelete = [...liveMerges.map((m) => m.orphan), ...liveDeletes.map((d) => d.id)];
  const delList = allToDelete.map((id) => `'${id}'::uuid`).join(",");
  const delRes = await db.execute(sql.raw(`DELETE FROM grammar_rules WHERE id IN (${delList}) RETURNING id`));
  console.log(`[dedup-pass6] grammar_rules deleted: ${((delRes.rows ?? delRes) as unknown[]).length}`);

  const finalRes = await db.execute(sql`SELECT COUNT(*)::int AS n FROM grammar_rules`);
  console.log(`\n[dedup-pass6] grammar_rules remaining: ${((finalRes.rows ?? finalRes) as Array<{n:number}>)[0].n}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
