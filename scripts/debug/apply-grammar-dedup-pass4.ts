/**
 * Fourth dedup pass — merges the 6 cross-batch duplicates flagged during
 * batch3a/3b authoring. Each orphan is the same grammar as a v2-rewritten
 * canonical from a prior batch; merging propagates the v2 explanation to
 * the orphan's song_versions and consolidates user FSRS paths.
 *
 * Uses the same data-preserving 7-step protocol as pass 2/3.
 *
 * 6 merges:
 *   - d1afdbf7 命令形 N3 → ebd9bcdf 命令形 N4 (batch1)
 *   - 684d6fd0 〜てる N4  → 28040405 〜te iru/〜teru (batch1)
 *   - 284f8804 〜てく N4  → a0d93554 〜ていく (batch3a, casual contraction)
 *   - afdceda7 〜のに N3  → 8748faec 〜noni (batch2)
 *   - 09478338 受身形 N4 → 5f70f52a Passive 〜(ら)れる (batch3a)
 *   - 48215292 意志形 N4 → 75765b3c Volitional 〜you/ou (batch2)
 *
 * Idempotent.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";

interface MergePair { orphan: string; canonical: string; reason: string; }

const MERGES: MergePair[] = [
  { orphan: "d1afdbf7-411d-4b51-9aef-c1d29a3349e0", canonical: "ebd9bcdf-2acf-4879-a970-50f98346c3cf", reason: "命令形 N3 → batch1 命令形 N4" },
  { orphan: "684d6fd0-8657-4946-9102-9c474b79bc88", canonical: "28040405-e731-49b2-9bb5-a082bbf34da2", reason: "〜てる → batch1 〜te iru/〜teru (casual contraction)" },
  { orphan: "284f8804-f884-4be9-81d7-45f7aaf2f7fb", canonical: "a0d93554-e629-4a25-8d26-6f4bd78a227d", reason: "〜てく → batch3a 〜ていく (casual contraction)" },
  { orphan: "afdceda7-1a51-4e56-ae49-d2e8e593ca73", canonical: "8748faec-25ee-4167-ad26-c7b292f5fa41", reason: "〜のに N3 → batch2 〜noni" },
  { orphan: "09478338-ebca-4c5c-8c6d-a4394ee01f8a", canonical: "5f70f52a-4e3b-4b57-93ce-b44763a711cd", reason: "受身形 → batch3a Passive 〜(ら)れる" },
  { orphan: "48215292-9f98-4cd8-b5c3-2491486afc4e", canonical: "75765b3c-d98d-4081-9316-dd2f85f309eb", reason: "意志形 → batch2 Volitional 〜you/ou" },
];

const dryRun = process.argv.includes("--dry-run");

interface Rule { id: string; name: string; jlpt_reference: string; explanation: { en?: string } | string | null; }

async function main() {
  const db = getDb();
  const allIds = Array.from(new Set(MERGES.flatMap((m) => [m.orphan, m.canonical])));
  const idList = allIds.map((id) => `'${id}'::uuid`).join(",");
  const ruleRes = await db.execute(sql.raw(`
    SELECT id::text AS id, name, jlpt_reference, explanation FROM grammar_rules WHERE id IN (${idList})
  `));
  const rules = (ruleRes.rows ?? ruleRes) as Rule[];
  const byId = new Map(rules.map((r) => [r.id, r]));

  for (const m of MERGES) {
    if (!byId.has(m.canonical)) { console.error(`FATAL: canonical missing ${m.canonical}`); process.exit(1); }
  }

  const live = MERGES.filter((m) => byId.has(m.orphan));
  console.log(`\n[dedup-pass4] declared: ${MERGES.length}, live: ${live.length}, idempotent-skip: ${MERGES.length - live.length}, dry-run: ${dryRun}\n`);
  for (const m of live) {
    const o = byId.get(m.orphan)!;
    const c = byId.get(m.canonical)!;
    console.log(`  [${o.jlpt_reference}] ${o.name}\n     → [${c.jlpt_reference}] ${c.name}\n     ${m.reason}`);
  }
  if (dryRun) { console.log("\n[dedup-pass4] dry-run — no DB writes."); return; }
  if (live.length === 0) { console.log("\n[dedup-pass4] nothing to do."); return; }

  // Step 1: re-link song_version_grammar_rules with dup-cleanup
  let svglRelinked = 0, svglDupDeleted = 0;
  for (const m of live) {
    const dup = await db.execute(sql.raw(`
      DELETE FROM song_version_grammar_rules
      WHERE grammar_rule_id = '${m.orphan}'::uuid
        AND song_version_id IN (SELECT song_version_id FROM song_version_grammar_rules WHERE grammar_rule_id = '${m.canonical}'::uuid)
      RETURNING song_version_id
    `));
    svglDupDeleted += ((dup.rows ?? dup) as unknown[]).length;
    const r = await db.execute(sql.raw(`
      UPDATE song_version_grammar_rules SET grammar_rule_id = '${m.canonical}'::uuid
      WHERE grammar_rule_id = '${m.orphan}'::uuid RETURNING song_version_id
    `));
    svglRelinked += ((r.rows ?? r) as unknown[]).length;
  }
  console.log(`\n[dedup-pass4] song_version_grammar_rules: ${svglRelinked} re-linked, ${svglDupDeleted} dup-dropped`);

  // Step 2: rewrite lesson JSONB grammar_points
  const versionRes = await db.execute(sql`
    SELECT id, lesson FROM song_versions WHERE lesson IS NOT NULL AND lesson->'grammar_points' IS NOT NULL
  `);
  const versions = (versionRes.rows ?? versionRes) as Array<{ id: string; lesson: any }>;
  let versionsTouched = 0, pointsRewritten = 0;
  for (const v of versions) {
    const lesson = v.lesson;
    if (!Array.isArray(lesson?.grammar_points)) continue;
    let mutated = false;
    for (const gp of lesson.grammar_points) {
      const gpName = (gp.name ?? "").trim();
      const gpJlpt = (gp.jlpt_reference ?? "").trim();
      const match = live.find((m) => {
        const o = byId.get(m.orphan);
        return o && o.name.trim() === gpName && o.jlpt_reference.trim() === gpJlpt;
      });
      if (!match) continue;
      const c = byId.get(match.canonical)!;
      gp.name = c.name;
      gp.jlpt_reference = c.jlpt_reference;
      if (c.explanation && typeof c.explanation === "object" && "en" in c.explanation) {
        gp.explanation = { en: (c.explanation as { en: string }).en };
      }
      mutated = true;
      pointsRewritten++;
    }
    if (mutated) {
      await db.execute(sql`UPDATE song_versions SET lesson = ${JSON.stringify(lesson)}::jsonb, updated_at = NOW() WHERE id = ${v.id}::uuid`);
      versionsTouched++;
    }
  }
  console.log(`[dedup-pass4] lesson JSONB: ${pointsRewritten} rewritten across ${versionsTouched} song_versions`);

  // Step 3: re-link grammar_exercises (preserve seeded exercises)
  let exercisesRelinked = 0;
  for (const m of live) {
    const r = await db.execute(sql.raw(`
      UPDATE grammar_exercises SET grammar_rule_id = '${m.canonical}'::uuid
      WHERE grammar_rule_id = '${m.orphan}'::uuid RETURNING id
    `));
    exercisesRelinked += ((r.rows ?? r) as unknown[]).length;
  }
  console.log(`[dedup-pass4] grammar_exercises: ${exercisesRelinked} re-linked`);

  // Step 4: re-link user_grammar_rule_mastery with dup-cleanup
  let masteryRelinked = 0, masteryDupDropped = 0;
  for (const m of live) {
    const dup = await db.execute(sql.raw(`
      DELETE FROM user_grammar_rule_mastery
      WHERE grammar_rule_id = '${m.orphan}'::uuid
        AND user_id IN (SELECT user_id FROM user_grammar_rule_mastery WHERE grammar_rule_id = '${m.canonical}'::uuid)
      RETURNING user_id
    `));
    masteryDupDropped += ((dup.rows ?? dup) as unknown[]).length;
    const r = await db.execute(sql.raw(`
      UPDATE user_grammar_rule_mastery SET grammar_rule_id = '${m.canonical}'::uuid
      WHERE grammar_rule_id = '${m.orphan}'::uuid RETURNING user_id
    `));
    masteryRelinked += ((r.rows ?? r) as unknown[]).length;
  }
  console.log(`[dedup-pass4] user_grammar_rule_mastery: ${masteryRelinked} re-linked, ${masteryDupDropped} dup-dropped`);

  // Step 5: re-link user_grammar_exercise_log
  let logRelinked = 0;
  for (const m of live) {
    const r = await db.execute(sql.raw(`
      UPDATE user_grammar_exercise_log SET grammar_rule_id = '${m.canonical}'::uuid
      WHERE grammar_rule_id = '${m.orphan}'::uuid RETURNING id
    `));
    logRelinked += ((r.rows ?? r) as unknown[]).length;
  }
  console.log(`[dedup-pass4] user_grammar_exercise_log: ${logRelinked} re-linked`);

  // Step 6: delete orphans
  const orphanIds = live.map((m) => `'${m.orphan}'::uuid`).join(",");
  const delRes = await db.execute(sql.raw(`DELETE FROM grammar_rules WHERE id IN (${orphanIds}) RETURNING id`));
  console.log(`[dedup-pass4] grammar_rules deleted: ${((delRes.rows ?? delRes) as unknown[]).length}`);

  const finalRes = await db.execute(sql`SELECT COUNT(*)::int AS n FROM grammar_rules`);
  console.log(`\n[dedup-pass4] grammar_rules remaining: ${((finalRes.rows ?? finalRes) as Array<{n:number}>)[0].n}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
