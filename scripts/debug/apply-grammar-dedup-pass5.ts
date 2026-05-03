/**
 * Fifth dedup pass — 20 cross-batch / within-band duplicates surfaced when
 * scanning candidates for batch 4 authoring, plus 1 non-grammar deletion.
 *
 * Same data-preserving 7-step protocol. Idempotent.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";

interface MergePair { orphan: string; canonical: string; reason: string; }

const MERGES: MergePair[] = [
  // Aspectual cluster — 〜te iru / 〜te iru variants
  { orphan: "92ec3103", canonical: "28040405", reason: "〜ていた past continuous → batch1 〜te iru/〜teru" },
  { orphan: "e6de1447", canonical: "28040405", reason: "〜ている → batch1 〜te iru/〜teru" },
  // Giving-receiving variants
  { orphan: "f43b1e81", canonical: "9c03bf67", reason: "〜てくれ imperative → batch2 〜te kureru" },
  // Casual must variants
  { orphan: "11c3e684", canonical: "e099e98b", reason: "〜なくちゃ → batch3b 〜なきゃ (alt casual contraction)" },
  // Cleft / focus
  { orphan: "8d2edf85", canonical: "f5280e84", reason: "〜のは〜だ N4 → batch3b 〜no wa〜da N3 (true dup)" },
  // Conditional 〜ba
  { orphan: "b940a4e8", canonical: "670a043a", reason: "〜ば conditional dup → batch1 〜ba" },
  { orphan: "dffa622b", canonical: "670a043a", reason: "Verb-conditional 〜ば → batch1 〜ba" },
  // 〜mitai variants
  { orphan: "45e7730d", canonical: "2cea4155", reason: "〜みたいに adverbial → batch3a 〜みたい" },
  // 〜きれない
  { orphan: "a6300249", canonical: "737080ec", reason: "〜きれない N2 → batch3a 〜kirenai N3 (true dup)" },
  // 〜ために
  { orphan: "1777001c", canonical: "4d218c66", reason: "〜ために → batch2 〜tame ni" },
  // Classical 〜ぬ variants
  { orphan: "6cf047da", canonical: "d058db02", reason: "〜ぬ literary N1 → batch3b 〜nu classical N2 (true dup)" },
  // 〜n darou
  { orphan: "71712166", canonical: "49fba520", reason: "〜んだろう probably → batch3b 〜n darou (dup)" },
  // 〜sou variants
  { orphan: "a401e623", canonical: "0e471da0", reason: "〜そうな modifying → batch3b 〜sou" },
  { orphan: "f8785d71", canonical: "0e471da0", reason: "〜そうだ sentence-final → batch3b 〜sou" },
  // 〜darou polite variant
  { orphan: "966c10ca", canonical: "374d6f9b", reason: "〜でしょう polite → batch3a 〜darou" },
  // 〜n da explanatory
  { orphan: "f04179f1", canonical: "14e074d3", reason: "〜んだよ → batch2 〜n da/〜no da explanatory" },
  // 意向形 = 意志形 = volitional
  { orphan: "7f4e7745", canonical: "75765b3c", reason: "意向形 → batch2 Volitional 〜you/ou" },
  // Verb stem + 合う (mutual) — clear dup with batch3a
  { orphan: "e3e26935", canonical: "02bb26e0", reason: "Verb stem + 合う → batch3a 〜au mutual action" },
  // Causative form duplicates
  { orphan: "082b854d", canonical: "ab9d2989", reason: "Causative 〜(さ)せる → 〜させる (canonical, both un-authored)" },
  // 〜なき literary attributive — within-batch dup
  { orphan: "9e8944b8", canonical: "3d8f8611", reason: "〜なき literary 'without' N2 → 〜なき N1 (true dup)" },
];

const DELETIONS_NON_GRAMMAR = [
  { id: "eea9babb", reason: "Conditional with 'if' (real condition) — JLPT='English grammar' metadata garbage" },
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

  console.log(`\n[dedup-pass5] merges: ${MERGES.length} declared, ${liveMerges.length} live, ${MERGES.length - liveMerges.length} idempotent-skip`);
  console.log(`[dedup-pass5] deletions: ${DELETIONS_NON_GRAMMAR.length} declared, ${liveDeletes.length} live`);
  console.log(`[dedup-pass5] dry-run: ${dryRun}\n`);

  if (liveMerges.length === 0 && liveDeletes.length === 0) { console.log("(nothing to do)"); return; }

  const allLiveIds = Array.from(new Set([
    ...liveMerges.flatMap((m) => [m.orphan, m.canonical]),
    ...liveDeletes.map((d) => d.id),
  ]));
  const idList = allLiveIds.map((id) => `'${id}'::uuid`).join(",");
  const ruleRes = await db.execute(sql.raw(`SELECT id::text AS id, name, jlpt_reference, explanation FROM grammar_rules WHERE id IN (${idList})`));
  const byId = new Map(((ruleRes.rows ?? ruleRes) as Rule[]).map((r) => [r.id, r]));

  console.log("MERGES:");
  for (const m of liveMerges) {
    const o = byId.get(m.orphan)!; const c = byId.get(m.canonical)!;
    console.log(`  [${o.jlpt_reference}] ${o.name}\n     → [${c.jlpt_reference}] ${c.name}\n     ${m.reason}`);
  }
  console.log("\nDELETIONS:");
  for (const d of liveDeletes) {
    const r = byId.get(d.id)!;
    console.log(`  [${r.jlpt_reference}] ${r.name}\n     ${d.reason}`);
  }

  if (dryRun) { console.log("\n[dedup-pass5] dry-run — no DB writes."); return; }

  // Step 1: re-link song_version_grammar_rules with dup-cleanup
  let svglRelinked = 0, svglDupDeleted = 0;
  for (const m of liveMerges) {
    const dup = await db.execute(sql.raw(`
      DELETE FROM song_version_grammar_rules
      WHERE grammar_rule_id = '${m.orphan}'::uuid
        AND song_version_id IN (SELECT song_version_id FROM song_version_grammar_rules WHERE grammar_rule_id = '${m.canonical}'::uuid)
      RETURNING song_version_id`));
    svglDupDeleted += ((dup.rows ?? dup) as unknown[]).length;
    const r = await db.execute(sql.raw(`
      UPDATE song_version_grammar_rules SET grammar_rule_id = '${m.canonical}'::uuid
      WHERE grammar_rule_id = '${m.orphan}'::uuid RETURNING song_version_id`));
    svglRelinked += ((r.rows ?? r) as unknown[]).length;
  }
  console.log(`\n[dedup-pass5] svgr: ${svglRelinked} re-linked, ${svglDupDeleted} dup-dropped`);

  // Step 2: rewrite lesson JSONB
  const versionRes = await db.execute(sql`SELECT id, lesson FROM song_versions WHERE lesson IS NOT NULL AND lesson->'grammar_points' IS NOT NULL`);
  const versions = (versionRes.rows ?? versionRes) as Array<{ id: string; lesson: any }>;
  let versionsTouched = 0, pointsRewritten = 0, pointsRemoved = 0;
  const deletedNames = new Set(liveDeletes.map((d) => byId.get(d.id)?.name?.trim() ?? ""));
  for (const v of versions) {
    const lesson = v.lesson;
    if (!Array.isArray(lesson?.grammar_points)) continue;
    let mutated = false;
    const beforeLen = lesson.grammar_points.length;
    lesson.grammar_points = lesson.grammar_points.filter((gp: any) => {
      const isDeleted = deletedNames.has((gp.name ?? "").trim());
      if (isDeleted) pointsRemoved++;
      return !isDeleted;
    });
    if (lesson.grammar_points.length !== beforeLen) mutated = true;
    for (const gp of lesson.grammar_points) {
      const gpName = (gp.name ?? "").trim();
      const gpJlpt = (gp.jlpt_reference ?? "").trim();
      const match = liveMerges.find((m) => {
        const o = byId.get(m.orphan);
        return o && o.name.trim() === gpName && o.jlpt_reference.trim() === gpJlpt;
      });
      if (!match) continue;
      const c = byId.get(match.canonical)!;
      gp.name = c.name; gp.jlpt_reference = c.jlpt_reference;
      if (c.explanation && typeof c.explanation === "object" && "en" in c.explanation) {
        gp.explanation = { en: (c.explanation as { en: string }).en };
      }
      mutated = true; pointsRewritten++;
    }
    if (mutated) {
      await db.execute(sql`UPDATE song_versions SET lesson = ${JSON.stringify(lesson)}::jsonb, updated_at = NOW() WHERE id = ${v.id}::uuid`);
      versionsTouched++;
    }
  }
  console.log(`[dedup-pass5] lesson JSONB: ${pointsRewritten} rewritten + ${pointsRemoved} removed across ${versionsTouched} song_versions`);

  // Step 3-5: re-link cascade tables
  let exercisesRelinked = 0, masteryRelinked = 0, masteryDup = 0, logRelinked = 0;
  for (const m of liveMerges) {
    const ex = await db.execute(sql.raw(`UPDATE grammar_exercises SET grammar_rule_id = '${m.canonical}'::uuid WHERE grammar_rule_id = '${m.orphan}'::uuid RETURNING id`));
    exercisesRelinked += ((ex.rows ?? ex) as unknown[]).length;
    const md = await db.execute(sql.raw(`DELETE FROM user_grammar_rule_mastery WHERE grammar_rule_id = '${m.orphan}'::uuid AND user_id IN (SELECT user_id FROM user_grammar_rule_mastery WHERE grammar_rule_id = '${m.canonical}'::uuid) RETURNING user_id`));
    masteryDup += ((md.rows ?? md) as unknown[]).length;
    const mr = await db.execute(sql.raw(`UPDATE user_grammar_rule_mastery SET grammar_rule_id = '${m.canonical}'::uuid WHERE grammar_rule_id = '${m.orphan}'::uuid RETURNING user_id`));
    masteryRelinked += ((mr.rows ?? mr) as unknown[]).length;
    const lg = await db.execute(sql.raw(`UPDATE user_grammar_exercise_log SET grammar_rule_id = '${m.canonical}'::uuid WHERE grammar_rule_id = '${m.orphan}'::uuid RETURNING id`));
    logRelinked += ((lg.rows ?? lg) as unknown[]).length;
  }
  console.log(`[dedup-pass5] grammar_exercises: ${exercisesRelinked} re-linked`);
  console.log(`[dedup-pass5] user_grammar_rule_mastery: ${masteryRelinked} re-linked, ${masteryDup} dup-dropped`);
  console.log(`[dedup-pass5] user_grammar_exercise_log: ${logRelinked} re-linked`);

  // Step 6: delete orphans + non-grammar deletions
  const allToDelete = [...liveMerges.map((m) => m.orphan), ...liveDeletes.map((d) => d.id)];
  const deleteList = allToDelete.map((id) => `'${id}'::uuid`).join(",");
  const delRes = await db.execute(sql.raw(`DELETE FROM grammar_rules WHERE id IN (${deleteList}) RETURNING id`));
  console.log(`[dedup-pass5] grammar_rules deleted: ${((delRes.rows ?? delRes) as unknown[]).length} (${liveMerges.length} merge orphans + ${liveDeletes.length} non-grammar)`);

  const finalRes = await db.execute(sql`SELECT COUNT(*)::int AS n FROM grammar_rules`);
  console.log(`\n[dedup-pass5] grammar_rules remaining: ${((finalRes.rows ?? finalRes) as Array<{n:number}>)[0].n}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
