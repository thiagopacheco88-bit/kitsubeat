/**
 * Eighth dedup pass — large cleanup of long-tail dupes spotted while scanning
 * for batch 6. ~32 merges + 2 metadata deletions. Same data-preserving 7-step
 * protocol. Idempotent.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { sql } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";

interface MergePair { orphan: string; canonical: string; reason: string; }

const MERGES: MergePair[] = [
  { orphan: "879cbd33", canonical: "28040405", reason: "〜ていますか polite question → batch1 〜te iru/〜teru" },
  { orphan: "811c32e4", canonical: "3b3d1273", reason: "〜のさ explanatory + casual → batch4a (true dup)" },
  { orphan: "dd0ffa22", canonical: "c4a89586", reason: "〜のならば → batch3b 〜naraba (literary if)" },
  { orphan: "b390fc0c", canonical: "3271a7b8", reason: "〜のまま → batch2 〜mama" },
  { orphan: "9f65a1b3", canonical: "da3b1a0a", reason: "〜のよう → batch3a 〜you da" },
  { orphan: "5b788735", canonical: "da3b1a0a", reason: "〜のようで → batch3a 〜you da" },
  { orphan: "b5109fa5", canonical: "da3b1a0a", reason: "〜のような → batch3a 〜you da" },
  { orphan: "ac4002ff", canonical: "2cea4155", reason: "〜みたいだ → batch3a 〜mitai" },
  { orphan: "520f0c46", canonical: "da3b1a0a", reason: "〜ようで → batch3a 〜you da" },
  { orphan: "2d01603b", canonical: "f1266fba", reason: "〜ようとして → batch4a 〜you to suru" },
  { orphan: "6e02bfde", canonical: "da3b1a0a", reason: "〜ような → batch3a 〜you da" },
  { orphan: "41dc4ade", canonical: "da3b1a0a", reason: "〜ような/〜ように → batch3a 〜you da" },
  { orphan: "4d7d59fa", canonical: "374d6f9b", reason: "〜んでしょ → batch3a 〜darou" },
  { orphan: "e63ca82a", canonical: "641e4f77", reason: "〜んな casual prohibition → batch4a 〜na" },
  { orphan: "919fe20e", canonical: "e6d9fc96", reason: "〜出す → batch3a 〜だす" },
  { orphan: "42324460", canonical: "e6d9fc96", reason: "〜出す → batch3a 〜だす" },
  { orphan: "367370f3", canonical: "e6d9fc96", reason: "〜出す → batch3a 〜だす" },
  { orphan: "a3ddc225", canonical: "185984a3", reason: "〜次第 → batch4a 〜shidai" },
  { orphan: "0dedd15b", canonical: "a26c69c5", reason: "〜気がする → batch3b 〜ki ga suru" },
  { orphan: "d0274e5a", canonical: "5f70f52a", reason: "受身形 N3 → batch3a Passive" },
  { orphan: "f5109671", canonical: "e5c690b1", reason: "Adjective stem + すぎる → batch3a 〜sugiru" },
  { orphan: "af46a8b8", canonical: "0e471da0", reason: "Adjective stem + そう → batch3b 〜sou" },
  { orphan: "70996908", canonical: "746c737e", reason: "〜ばいい → batch4b 〜ba ii" },
  { orphan: "c80a4167", canonical: "8d859f55", reason: "〜ばっか/ばかり → batch3a 〜bakari" },
  { orphan: "dc997bc4", canonical: "3eb9c806", reason: "何も〜ない → batch4b question word + も + neg" },
  { orphan: "520c013d", canonical: "1a53d7f9", reason: "Adjective + さ → batch4b 〜sa nominaliser" },
  { orphan: "1748bdba", canonical: "4902e9be", reason: "Casual 〜ん → batch4a 〜nai (Kansai contraction)" },
  { orphan: "df0f8c5f", canonical: "4c07593c", reason: "Casual conditional 〜たって → batch2 〜tatte" },
  { orphan: "f1e08d6a", canonical: "e099e98b", reason: "Casual conditional 〜なきゃ → batch3b" },
  { orphan: "6668dc26", canonical: "374d6f9b", reason: "Casual contraction 〜だろう→ろ → batch3a 〜darou" },
  { orphan: "70a54ab2", canonical: "28040405", reason: "Casual contraction 〜てても → batch1 〜te iru" },
  { orphan: "bcba6d53", canonical: "28040405", reason: "Casual contraction 〜てる → batch1 〜te iru/〜teru" },
  { orphan: "cf6e73bb", canonical: "14e074d3", reason: "Casual contraction 〜てんだ → batch2 〜n da" },
  { orphan: "4ad6715d", canonical: "7ca38620", reason: "Casual contrastive 〜けど → batch3b 〜keredo" },
  { orphan: "688d1e06", canonical: "8b1f9116", reason: "Casual emphatic 〜くって/〜って → batch4a 〜tte" },
  { orphan: "6788c73c", canonical: "8b1f9116", reason: "Casual quotative-ending って → batch4a 〜tte" },
  { orphan: "6a6c10e6", canonical: "8d859f55", reason: "Casual 〜ばっか → batch3a 〜bakari" },
  { orphan: "9e08c96f", canonical: "ab9d2989", reason: "Causative + て → batch4a Causative" },
  { orphan: "20385c1b", canonical: "ab9d2989", reason: "Causative form 〜させる → batch4a" },
  { orphan: "68312db4", canonical: "ab9d2989", reason: "Causative 〜せる/〜させる → batch4a" },
  { orphan: "6927503b", canonical: "ab9d2989", reason: "Causative 曇らせる → batch4a" },
  { orphan: "66d0a631", canonical: "d058db02", reason: "Classical negative 〜ぬ → batch3b" },
  { orphan: "c3263981", canonical: "d058db02", reason: "Classical negative 〜ぬ/〜ず → batch3b" },
  { orphan: "387685f9", canonical: "d058db02", reason: "Classical/literary negative 〜ぬ → batch3b" },
  { orphan: "720db672", canonical: "d058db02", reason: "Bungo negative 〜ぬ → batch3b" },
  { orphan: "e9e8f7a0", canonical: "f5280e84", reason: "Cleft 〜のは〜から/〜のは〜だ → batch3b 〜no wa 〜da" },
  { orphan: "0b10201b", canonical: "499f3fd9", reason: "Assertion particle 〜さ casual masculine → batch4b" },
  { orphan: "f2ab28fb", canonical: "74492d07", reason: "〜はずのない (impossible) → other 〜hazu no nai (within-band dup)" },
  { orphan: "e27d8508", canonical: "1a53d7f9", reason: "Adjective-stem nouns → batch4b 〜sa nominaliser" },
  { orphan: "f11415eb", canonical: "a0d93554", reason: "〜てった casual past contraction → batch3a 〜teiku" },
];

const DELETIONS_NON_GRAMMAR = [
  { id: "08dc90b7", reason: "All I ever wanted — English grammar metadata" },
  { id: "145bea2d", reason: "今すぐ adverb only, not grammar" },
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
    else throw new Error(`Ambiguous partial id ${p}: ${rows.map(r=>r.id).join(",")}`);
  }
  return map;
}

async function main() {
  const db = getDb();
  const partials = Array.from(new Set([...MERGES.flatMap(m=>[m.orphan, m.canonical]), ...DELETIONS_NON_GRAMMAR.map(d=>d.id)]));
  const idMap = await expandPartialIds(db, partials);
  const fullMerges = MERGES.map(m => ({ orphan: idMap.get(m.orphan) ?? "", canonical: idMap.get(m.canonical) ?? "", reason: m.reason }));
  const fullDeletes = DELETIONS_NON_GRAMMAR.map(d => ({ id: idMap.get(d.id) ?? "", reason: d.reason }));
  const liveMerges = fullMerges.filter(m => m.orphan && m.canonical);
  const liveDeletes = fullDeletes.filter(d => d.id);
  console.log(`[dedup-pass8] merges: ${liveMerges.length}/${MERGES.length}, deletions: ${liveDeletes.length}/${DELETIONS_NON_GRAMMAR.length}`);
  if (liveMerges.length===0 && liveDeletes.length===0) { console.log("nothing to do"); return; }
  if (dryRun) return;

  const allLive = Array.from(new Set([...liveMerges.flatMap(m=>[m.orphan, m.canonical]), ...liveDeletes.map(d=>d.id)]));
  const idList = allLive.map(id=>`'${id}'::uuid`).join(",");
  const ruleRes = await db.execute(sql.raw(`SELECT id::text AS id, name, jlpt_reference, explanation FROM grammar_rules WHERE id IN (${idList})`));
  const byId = new Map(((ruleRes.rows ?? ruleRes) as Rule[]).map(r=>[r.id, r]));

  let svglR=0, svglD=0;
  for (const m of liveMerges) {
    const dup = await db.execute(sql.raw(`DELETE FROM song_version_grammar_rules WHERE grammar_rule_id='${m.orphan}'::uuid AND song_version_id IN (SELECT song_version_id FROM song_version_grammar_rules WHERE grammar_rule_id='${m.canonical}'::uuid) RETURNING song_version_id`));
    svglD += ((dup.rows ?? dup) as unknown[]).length;
    const r = await db.execute(sql.raw(`UPDATE song_version_grammar_rules SET grammar_rule_id='${m.canonical}'::uuid WHERE grammar_rule_id='${m.orphan}'::uuid RETURNING song_version_id`));
    svglR += ((r.rows ?? r) as unknown[]).length;
  }
  console.log(`svgr: ${svglR} re-linked, ${svglD} dup-dropped`);

  const versionRes = await db.execute(sql`SELECT id, lesson FROM song_versions WHERE lesson IS NOT NULL AND lesson->'grammar_points' IS NOT NULL`);
  const versions = (versionRes.rows ?? versionRes) as Array<{ id: string; lesson: any }>;
  let vt=0, pr=0, prm=0;
  const deletedNames = new Set(liveDeletes.map(d => byId.get(d.id)?.name?.trim() ?? ""));
  for (const v of versions) {
    const lesson = v.lesson;
    if (!Array.isArray(lesson?.grammar_points)) continue;
    let mutated = false;
    const beforeLen = lesson.grammar_points.length;
    lesson.grammar_points = lesson.grammar_points.filter((gp: any) => { const isDel = deletedNames.has((gp.name??"").trim()); if (isDel) prm++; return !isDel; });
    if (lesson.grammar_points.length !== beforeLen) mutated = true;
    for (const gp of lesson.grammar_points) {
      const gpN=(gp.name??"").trim(), gpJ=(gp.jlpt_reference??"").trim();
      const match = liveMerges.find(m => { const o = byId.get(m.orphan); return o && o.name.trim()===gpN && o.jlpt_reference.trim()===gpJ; });
      if (!match) continue;
      const c = byId.get(match.canonical)!;
      gp.name = c.name; gp.jlpt_reference = c.jlpt_reference;
      if (c.explanation && typeof c.explanation === "object" && "en" in c.explanation) gp.explanation = { en: (c.explanation as any).en };
      mutated = true; pr++;
    }
    if (mutated) { await db.execute(sql`UPDATE song_versions SET lesson=${JSON.stringify(lesson)}::jsonb, updated_at=NOW() WHERE id=${v.id}::uuid`); vt++; }
  }
  console.log(`lesson JSONB: ${pr} rewritten + ${prm} removed across ${vt} song_versions`);

  let exR=0, mR=0, mD=0, lR=0;
  for (const m of liveMerges) {
    const ex = await db.execute(sql.raw(`UPDATE grammar_exercises SET grammar_rule_id='${m.canonical}'::uuid WHERE grammar_rule_id='${m.orphan}'::uuid RETURNING id`));
    exR += ((ex.rows ?? ex) as unknown[]).length;
    const md = await db.execute(sql.raw(`DELETE FROM user_grammar_rule_mastery WHERE grammar_rule_id='${m.orphan}'::uuid AND user_id IN (SELECT user_id FROM user_grammar_rule_mastery WHERE grammar_rule_id='${m.canonical}'::uuid) RETURNING user_id`));
    mD += ((md.rows ?? md) as unknown[]).length;
    const mr = await db.execute(sql.raw(`UPDATE user_grammar_rule_mastery SET grammar_rule_id='${m.canonical}'::uuid WHERE grammar_rule_id='${m.orphan}'::uuid RETURNING user_id`));
    mR += ((mr.rows ?? mr) as unknown[]).length;
    const lg = await db.execute(sql.raw(`UPDATE user_grammar_exercise_log SET grammar_rule_id='${m.canonical}'::uuid WHERE grammar_rule_id='${m.orphan}'::uuid RETURNING id`));
    lR += ((lg.rows ?? lg) as unknown[]).length;
  }
  console.log(`exercises: ${exR}, mastery: ${mR} +${mD} dup, log: ${lR}`);

  const allDel = [...liveMerges.map(m=>m.orphan), ...liveDeletes.map(d=>d.id)];
  const delList = allDel.map(id=>`'${id}'::uuid`).join(",");
  const delRes = await db.execute(sql.raw(`DELETE FROM grammar_rules WHERE id IN (${delList}) RETURNING id`));
  console.log(`grammar_rules deleted: ${((delRes.rows ?? delRes) as unknown[]).length}`);

  const finalRes = await db.execute(sql`SELECT COUNT(*)::int AS n FROM grammar_rules`);
  console.log(`grammar_rules remaining: ${((finalRes.rows ?? finalRes) as Array<{n:number}>)[0].n}`);
}

main().then(()=>process.exit(0)).catch(e=>{console.error(e); process.exit(1);});
