/**
 * Seventh dedup pass — 14 dupes + 2 metadata deletions surfaced in the
 * post-pass6 candidate scan for batch 5. Same data-preserving 7-step protocol.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";

interface MergePair { orphan: string; canonical: string; reason: string; }

const MERGES: MergePair[] = [
  { orphan: "52163f3b", canonical: "d2c689cc", reason: "〜たくない N5 → batch3b 〜takunai N4 (true dup)" },
  { orphan: "ac4a0d2b", canonical: "a0d93554", reason: "〜ていった past → batch3a 〜ていく" },
  { orphan: "b02a0525", canonical: "28040405", reason: "〜てた casual past continuous → batch1 〜te iru/〜teru" },
  { orphan: "1631cb54", canonical: "28040405", reason: "〜てん casual ている → batch1 〜te iru/〜teru" },
  { orphan: "aa1d0769", canonical: "374d6f9b", reason: "〜でしょ casual → batch3a 〜darou/〜deshou" },
  { orphan: "4a51d2f9", canonical: "641e4f77", reason: "〜な negative command → batch4a 〜na (covers prohibition)" },
  { orphan: "33712870", canonical: "abddaea4", reason: "〜ないでいる → batch4a 〜ないでいて (same pattern, different te-form)" },
  { orphan: "fea4928f", canonical: "b275fafa", reason: "〜ながら → batch2 〜nagara" },
  { orphan: "4bc93370", canonical: "e099e98b", reason: "〜なくちゃいけない full form → batch3b 〜なきゃ" },
  { orphan: "d00d24c2", canonical: "ecdf4566", reason: "〜なくてもいい → batch3b 〜なくていい (variant with mo)" },
  { orphan: "1f9ecb8e", canonical: "e099e98b", reason: "〜なけりゃ casual → batch3b 〜なきゃ" },
  { orphan: "58ab413a", canonical: "641e4f77", reason: "〜なよ → batch4a 〜na soft prohibition + yo" },
  { orphan: "d559940b", canonical: "88fa7efc", reason: "〜に来る → batch4b 〜に行く/来る (covers both)" },
  { orphan: "deb52676", canonical: "a39935db", reason: "〜ぬように classical → 〜ないように (modern, will author)" },
];

const DELETIONS_NON_GRAMMAR = [
  { id: "6838a57f", reason: "Past tense narration — JLPT N/A metadata" },
  { id: "22278c3f", reason: "Present continuous — JLPT N/A metadata" },
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
    else throw new Error(`Ambiguous partial id ${p}`);
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

  console.log(`\n[dedup-pass7] merges: ${liveMerges.length} live / ${MERGES.length} declared`);
  console.log(`[dedup-pass7] deletions: ${liveDeletes.length} live\n`);

  if (liveMerges.length === 0 && liveDeletes.length === 0) { console.log("(nothing to do)"); return; }

  const allLiveIds = Array.from(new Set([
    ...liveMerges.flatMap((m) => [m.orphan, m.canonical]),
    ...liveDeletes.map((d) => d.id),
  ]));
  const idList = allLiveIds.map((id) => `'${id}'::uuid`).join(",");
  const ruleRes = await db.execute(sql.raw(`SELECT id::text AS id, name, jlpt_reference, explanation FROM grammar_rules WHERE id IN (${idList})`));
  const byId = new Map(((ruleRes.rows ?? ruleRes) as Rule[]).map((r) => [r.id, r]));

  if (dryRun) { console.log("dry-run."); return; }

  let svglR = 0, svglD = 0;
  for (const m of liveMerges) {
    const dup = await db.execute(sql.raw(`DELETE FROM song_version_grammar_rules WHERE grammar_rule_id = '${m.orphan}'::uuid AND song_version_id IN (SELECT song_version_id FROM song_version_grammar_rules WHERE grammar_rule_id = '${m.canonical}'::uuid) RETURNING song_version_id`));
    svglD += ((dup.rows ?? dup) as unknown[]).length;
    const r = await db.execute(sql.raw(`UPDATE song_version_grammar_rules SET grammar_rule_id = '${m.canonical}'::uuid WHERE grammar_rule_id = '${m.orphan}'::uuid RETURNING song_version_id`));
    svglR += ((r.rows ?? r) as unknown[]).length;
  }
  console.log(`svgr: ${svglR} re-linked, ${svglD} dup-dropped`);

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
  console.log(`lesson JSONB: ${pr} rewritten + ${prm} removed across ${vt} song_versions`);

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
  console.log(`exercises: ${exR}, mastery: ${mR} +${mD} dup, log: ${lR}`);

  const allDel = [...liveMerges.map((m) => m.orphan), ...liveDeletes.map((d) => d.id)];
  const delList = allDel.map((id) => `'${id}'::uuid`).join(",");
  const delRes = await db.execute(sql.raw(`DELETE FROM grammar_rules WHERE id IN (${delList}) RETURNING id`));
  console.log(`grammar_rules deleted: ${((delRes.rows ?? delRes) as unknown[]).length}`);

  const finalRes = await db.execute(sql`SELECT COUNT(*)::int AS n FROM grammar_rules`);
  console.log(`\n[dedup-pass7] grammar_rules remaining: ${((finalRes.rows ?? finalRes) as Array<{n:number}>)[0].n}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
