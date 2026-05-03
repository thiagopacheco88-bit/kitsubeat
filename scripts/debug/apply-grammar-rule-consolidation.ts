/**
 * Apply the grammar_rule consolidation migration.
 *
 * For each cluster in _temp/grammar-rule-clusters.json that is either:
 *   - confidence: "high" (kana-stem auto-merge), OR
 *   - listed in MANUAL_APPROVE_STEMS (review-needed but obvious duplicate
 *     clusters confirmed by inline analysis: 命令形, 続ける, 合う, Bare
 *     imperative, Volitional, Passive, Causative).
 *
 * Migration steps per cluster:
 *   1. UPDATE song_version_grammar_rules.grammar_rule_id from orphan IDs → canonical_id
 *   2. UPDATE song_versions.lesson.grammar_points[]: any gp matching an orphan's
 *      (name, jlpt_reference) gets rewritten to the canonical's name + jlpt.
 *   3. UPDATE grammar_exercises.grammar_rule_id orphan → canonical
 *      (preserve seeded/authored exercises through merge).
 *   4. UPDATE user_grammar_rule_mastery.grammar_rule_id orphan → canonical,
 *      with pre-delete of (canonical, user) duplicates that violate the
 *      unique(user_id, grammar_rule_id) constraint.
 *   5. UPDATE user_grammar_exercise_log.grammar_rule_id orphan → canonical.
 *   6. DELETE the orphan grammar_rules rows.
 *
 * IMPORTANT: Steps 3-5 MUST run before step 6. grammar_exercises,
 * user_grammar_rule_mastery, and user_grammar_exercise_log all have
 * onDelete: cascade FKs to grammar_rules — skipping the re-link silently
 * destroys exercises and user FSRS progress when orphans are deleted.
 *
 * Idempotent: safe to re-run. Already-merged orphans are absent from the
 * grammar_rules table and the song_version_grammar_rules join is already pointed
 * at the canonical, so nothing happens.
 *
 * Usage:
 *   # Dry-run — print plan, no DB writes
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/debug/apply-grammar-rule-consolidation.ts --dry-run
 *
 *   # Apply
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/debug/apply-grammar-rule-consolidation.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";

interface Rule { id: string; name: string; jlpt_reference: string; song_count: number; }
interface Cluster {
  stem_key: string;
  jlpt: string;
  canonical: Rule;
  members: Rule[];
  total_song_count: number;
  confidence: "high" | "review";
}

// Inline-confirmed review-needed clusters that ARE genuine duplicate clusters.
// Each entry: "{jlpt}::{stem_key}" matching the cluster output.
const MANUAL_APPROVE_KEYS = new Set<string>([
  "N4::命令形",       // imperative form (7 variants)
  "N3::命令形",       // imperative form (2 variants)
  "N3::Imperati",    // imperative variants — merge into N3::命令形 separately below
  "N4::続ける",       // tsuzukeru (6 variants)
  "N3::続ける",       // tsuzukeru (5 variants)
  "N3::合う",         // au mutual (4 variants)
  "N4::Bare",        // bare imperative (6 variants)
  "N4::Volition",    // volitional (9 variants)
  "N4::Passive",     // passive (11 variants)
  "N3::Causativ",    // causative (7 variants)
]);

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const db = getDb();
  const clusters = JSON.parse(
    readFileSync("_temp/grammar-rule-clusters.json", "utf8"),
  ) as Cluster[];

  const eligible = clusters.filter((c) => {
    if (c.confidence === "high") return true;
    return MANUAL_APPROVE_KEYS.has(`${c.jlpt}::${c.stem_key}`);
  });

  console.log(`\n[consolidate] eligible clusters: ${eligible.length}/${clusters.length}`);
  let totalOrphans = 0;
  for (const c of eligible) totalOrphans += c.members.length - 1;
  console.log(`[consolidate] orphans to merge into canonicals: ${totalOrphans}`);
  console.log(`[consolidate] dry-run: ${dryRun}`);

  if (dryRun) {
    console.log("\n[consolidate] sample cluster plans (top 5):");
    for (const c of eligible.slice(0, 5)) {
      console.log(`\n  [${c.jlpt}::${c.stem_key}]  ${c.members.length} → 1`);
      console.log(`    survivor: ${c.canonical.name}`);
      for (const m of c.members) {
        if (m.id === c.canonical.id) continue;
        console.log(`    merge   : ${m.name}`);
      }
    }
    return;
  }

  // ---- Pre-load all song_versions with grammar so JSONB sync is one pass ----
  const versionRes = await db.execute(sql`
    SELECT id, lesson FROM song_versions
    WHERE lesson IS NOT NULL AND lesson->'grammar_points' IS NOT NULL
  `);
  const versions = (versionRes.rows ?? versionRes) as Array<{ id: string; lesson: any }>;

  // Build lookup: orphan name+jlpt → canonical {name, jlpt}
  const renameMap = new Map<string, { name: string; jlpt: string }>();
  for (const c of eligible) {
    for (const m of c.members) {
      if (m.id === c.canonical.id) continue;
      const key = `${m.name}::${m.jlpt_reference}`;
      renameMap.set(key, { name: c.canonical.name, jlpt: c.canonical.jlpt_reference });
    }
  }

  // ---- Step 1: re-link song_version_grammar_rules.grammar_rule_id ----
  let svglRelinked = 0;
  for (const c of eligible) {
    const orphans = c.members.filter((m) => m.id !== c.canonical.id).map((m) => m.id);
    if (orphans.length === 0) continue;
    const orphanList = orphans.map((id) => `'${id}'::uuid`).join(",");
    // First, delete potential duplicate (canonical_id, song_version_id) rows
    // that would violate the unique constraint when we re-point orphans →
    // canonical. The orphan's link is dropped; the canonical's existing link
    // (if any) for that same song_version stays.
    const dupRes = await db.execute(sql.raw(`
      DELETE FROM song_version_grammar_rules
      WHERE grammar_rule_id IN (${orphanList})
        AND song_version_id IN (
          SELECT song_version_id FROM song_version_grammar_rules
          WHERE grammar_rule_id = '${c.canonical.id}'::uuid
        )
      RETURNING song_version_id
    `));
    const dupCount = ((dupRes.rows ?? dupRes) as unknown[]).length;
    // Then re-point the remaining orphan links to the canonical rule.
    const relinkRes = await db.execute(sql.raw(`
      UPDATE song_version_grammar_rules
      SET grammar_rule_id = '${c.canonical.id}'::uuid
      WHERE grammar_rule_id IN (${orphanList})
      RETURNING song_version_id
    `));
    const relinkCount = ((relinkRes.rows ?? relinkRes) as unknown[]).length;
    svglRelinked += relinkCount + dupCount;
  }
  console.log(`[consolidate] song_version_grammar_rules: ${svglRelinked} links updated`);

  // ---- Step 2: rewrite lesson JSONB grammar_points to canonical names ----
  let versionsTouched = 0;
  let pointsRewritten = 0;
  for (const v of versions) {
    const lesson = v.lesson;
    if (!Array.isArray(lesson?.grammar_points)) continue;
    let mutated = false;
    for (const gp of lesson.grammar_points) {
      const key = `${(gp.name ?? "").trim()}::${(gp.jlpt_reference ?? "").trim()}`;
      const canon = renameMap.get(key);
      if (!canon) continue;
      gp.name = canon.name;
      gp.jlpt_reference = canon.jlpt;
      mutated = true;
      pointsRewritten++;
    }
    if (mutated) {
      await db.execute(sql`
        UPDATE song_versions
        SET lesson = ${JSON.stringify(lesson)}::jsonb,
            updated_at = NOW()
        WHERE id = ${v.id}::uuid
      `);
      versionsTouched++;
    }
  }
  console.log(`[consolidate] lesson JSONB: ${pointsRewritten} grammar_points rewritten across ${versionsTouched} song_versions`);

  // ---- Step 3: re-link grammar_exercises orphan → canonical ----
  let exercisesRelinked = 0;
  for (const c of eligible) {
    const orphans = c.members.filter((m) => m.id !== c.canonical.id).map((m) => m.id);
    if (orphans.length === 0) continue;
    const orphanList = orphans.map((id) => `'${id}'::uuid`).join(",");
    const r = await db.execute(sql.raw(`
      UPDATE grammar_exercises
      SET grammar_rule_id = '${c.canonical.id}'::uuid
      WHERE grammar_rule_id IN (${orphanList})
      RETURNING id
    `));
    exercisesRelinked += ((r.rows ?? r) as unknown[]).length;
  }
  console.log(`[consolidate] grammar_exercises: ${exercisesRelinked} re-linked (would have cascade-deleted)`);

  // ---- Step 4: re-link user_grammar_rule_mastery with dup-cleanup ----
  let masteryRelinked = 0;
  let masteryDupDropped = 0;
  for (const c of eligible) {
    const orphans = c.members.filter((m) => m.id !== c.canonical.id).map((m) => m.id);
    if (orphans.length === 0) continue;
    const orphanList = orphans.map((id) => `'${id}'::uuid`).join(",");
    const dup = await db.execute(sql.raw(`
      DELETE FROM user_grammar_rule_mastery
      WHERE grammar_rule_id IN (${orphanList})
        AND user_id IN (
          SELECT user_id FROM user_grammar_rule_mastery
          WHERE grammar_rule_id = '${c.canonical.id}'::uuid
        )
      RETURNING user_id
    `));
    masteryDupDropped += ((dup.rows ?? dup) as unknown[]).length;
    const r = await db.execute(sql.raw(`
      UPDATE user_grammar_rule_mastery
      SET grammar_rule_id = '${c.canonical.id}'::uuid
      WHERE grammar_rule_id IN (${orphanList})
      RETURNING user_id
    `));
    masteryRelinked += ((r.rows ?? r) as unknown[]).length;
  }
  console.log(`[consolidate] user_grammar_rule_mastery: ${masteryRelinked} re-linked, ${masteryDupDropped} dup-dropped`);

  // ---- Step 5: re-link user_grammar_exercise_log ----
  let logRelinked = 0;
  for (const c of eligible) {
    const orphans = c.members.filter((m) => m.id !== c.canonical.id).map((m) => m.id);
    if (orphans.length === 0) continue;
    const orphanList = orphans.map((id) => `'${id}'::uuid`).join(",");
    const r = await db.execute(sql.raw(`
      UPDATE user_grammar_exercise_log
      SET grammar_rule_id = '${c.canonical.id}'::uuid
      WHERE grammar_rule_id IN (${orphanList})
      RETURNING id
    `));
    logRelinked += ((r.rows ?? r) as unknown[]).length;
  }
  console.log(`[consolidate] user_grammar_exercise_log: ${logRelinked} re-linked`);

  // ---- Step 6: delete orphan grammar_rules (now safe) ----
  let orphansDeleted = 0;
  const allOrphanIds: string[] = [];
  for (const c of eligible) {
    for (const m of c.members) {
      if (m.id !== c.canonical.id) allOrphanIds.push(m.id);
    }
  }
  if (allOrphanIds.length > 0) {
    const orphanList = allOrphanIds.map((id) => `'${id}'::uuid`).join(",");
    const delRes = await db.execute(sql.raw(`
      DELETE FROM grammar_rules WHERE id IN (${orphanList}) RETURNING id
    `));
    orphansDeleted = ((delRes.rows ?? delRes) as unknown[]).length;
  }
  console.log(`[consolidate] grammar_rules: ${orphansDeleted} orphan rules deleted`);

  // ---- Verify final state ----
  const finalRes = await db.execute(sql`SELECT COUNT(*)::int AS n FROM grammar_rules`);
  const finalRows = (finalRes.rows ?? finalRes) as Array<{ n: number }>;
  console.log(`[consolidate] grammar_rules remaining: ${finalRows[0]?.n}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
