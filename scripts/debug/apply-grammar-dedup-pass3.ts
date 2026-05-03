/**
 * Third dedup pass — applies kana-stem and kanji-form duplicates surfaced by
 * cluster-grammar-rules-v2.ts (improved heuristic that doesn't collide
 * v2-format names like 〜te mo / 〜te iru / 〜te kureru).
 *
 * 25 merges + 3 deletes (non-grammar metadata "rules"):
 *   - 12 high-conf within-cluster kana-stem dupes
 *   -  7 review-tier kanji-form dupes (命令形 / 可能形 / 受身形 / 意志形)
 *   -  6 selective low-tier dupes (ば+kya, 気がする, 合う/あう, そう, 出す, 切る→きれない)
 *   -  3 non-grammar tags deleted (English lyrics, English song, code-switching)
 *
 * Uses the same data-preserving 7-step protocol as dedup-pass2:
 *   re-link song_version_grammar_rules → JSONB → grammar_exercises →
 *   user_grammar_rule_mastery → user_grammar_exercise_log → THEN delete orphan.
 *
 * Idempotent.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";

interface MergePair { orphan: string; canonical: string; reason: string; }

const MERGES: MergePair[] = [
  // --- HIGH-confidence kana-stem matches (within JLPT bucket) ---
  { orphan: "e279daec", canonical: "75765b3c", reason: "[N4::よう] dup → batch2 volitional 〜you/ou" }, // partial id; expanded below
  { orphan: "9a24ae2d", canonical: "02522b64", reason: "[N3::ちゃう] dup → batch2 〜chau/jau" },
  { orphan: "e5d23b89", canonical: "abbf5947", reason: "[N4::たり] partial-listing → 〜たり〜たり" },
  { orphan: "adf26e37", canonical: "abbf5947", reason: "[N4::たり] 〜たりする → 〜たり〜たり" },
  { orphan: "31af0cd6", canonical: "1ef3e2d7", reason: "[N3::たとえ] tatoe...te mo → tatoe...demo (same concessive)" },
  { orphan: "df7c41b0", canonical: "1ef3e2d7", reason: "[N3::たとえ] (たとえ)〜ても → tatoe...demo" },
  { orphan: "691ce281", canonical: "afdceda7", reason: "[N3::のに] dup → 〜のに despite/and yet" },
  { orphan: "c0cd6c33", canonical: "f5280e84", reason: "[N3::のは] cleft 〜のは〜だ → 〜のは...だ emphasis" },
  { orphan: "37ef6108", canonical: "f8364773", reason: "[N3::きる] dup → 〜きる completely" },
  { orphan: "768ca248", canonical: "f8785d71", reason: "[N4::そうだ] dup → 〜そうだ seems-like" },
  { orphan: "ac0a824f", canonical: "9d3ce380", reason: "[N3::ことも] dup → 〜ことも+なく/ない" },
  { orphan: "ed8fc74f", canonical: "b67ce8fc", reason: "[N3::まるで] dup → まるで〜のように" },

  // --- REVIEW-tier kanji-form matches ---
  { orphan: "aecda142", canonical: "ebd9bcdf", reason: "[N4::命令形] dup → batch1 命令形" },
  { orphan: "4b183a7c", canonical: "ebd9bcdf", reason: "[N4::命令形] dup → batch1 命令形" },
  { orphan: "81457d16", canonical: "eac3a7b9", reason: "[N4::可能形] dup → 可能形 potential form" },
  { orphan: "927e47f8", canonical: "09478338", reason: "[N4::受身形] dup → 受身形 passive form" },
  { orphan: "84ae701f", canonical: "48215292", reason: "[N4::意志形] dup → 意志形 volitional" },
  { orphan: "a238903f", canonical: "48215292", reason: "[N4::意志形] +よ → 意志形 volitional (subset)" },
  { orphan: "410551ac", canonical: "d0274e5a", reason: "[N3::受身形] dup → 受身形 passive" },

  // --- LOW-tier selective merges (verified clear duplicates) ---
  { orphan: "5dce6151", canonical: "670a043a", reason: "[N4::ば] +kya note → batch1 〜ba general conditional" },
  { orphan: "49317de1", canonical: "a26c69c5", reason: "[N3::気がする] dup → 〜気がする feel like" },
  { orphan: "bc702836", canonical: "e3e26935", reason: "[N3::Verb stem + 合う] あう dup → 合う mutual" },
  { orphan: "038affad", canonical: "2d029959", reason: "[N3::Verb stem + そう] dup → 〜そう looks-like" },
  { orphan: "831c8b4b", canonical: "38ea38c8", reason: "[N3::Verb stem + 出す] dup → 〜出す begin-to" },
  { orphan: "a9fd1252", canonical: "acb5af46", reason: "[N2::Verb stem + 切る→きれない] dup" },
];

// Non-grammar metadata "rules" — songs without Japanese grammar.
// Delete the rule entirely; cascade will drop the song_version_grammar_rules
// links. The affected song_versions will (correctly) show no grammar entries.
const DELETIONS_NON_GRAMMAR = [
  { id: "88377396", reason: "English lyrics in anime OST (4 songs)" },
  { id: "d2d5eaa4", reason: "English song - no Japanese grammar (4 songs)" },
  { id: "d60bbd29", reason: "Japanese-English code-switching (4 songs)" },
];

const dryRun = process.argv.includes("--dry-run");

interface Rule { id: string; name: string; jlpt_reference: string; explanation: { en?: string } | string | null; }

async function expandPartialIds(db: any, partials: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const p of partials) {
    const res = await db.execute(sql.raw(`
      SELECT id::text FROM grammar_rules WHERE id::text LIKE '${p}%'
    `));
    const rows = (res.rows ?? res) as Array<{ id: string }>;
    if (rows.length === 1) map.set(p, rows[0].id);
    else if (rows.length === 0) map.set(p, ""); // mark as missing
    else throw new Error(`Ambiguous partial id ${p}: ${rows.map(r => r.id).join(", ")}`);
  }
  return map;
}

async function main() {
  const db = getDb();

  // Expand 8-char partial UUIDs → full UUIDs
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

  // Validate canonicals exist; orphans missing = idempotent skip
  const liveMerges = fullMerges.filter((m) => m.orphan && m.canonical);
  const skippedMerges = fullMerges.length - liveMerges.length;
  const liveDeletes = fullDeletes.filter((d) => d.id);
  const skippedDeletes = fullDeletes.length - liveDeletes.length;

  console.log(`\n[dedup-pass3] merges declared: ${MERGES.length}, live: ${liveMerges.length}, idempotent-skip: ${skippedMerges}`);
  console.log(`[dedup-pass3] deletions declared: ${DELETIONS_NON_GRAMMAR.length}, live: ${liveDeletes.length}, idempotent-skip: ${skippedDeletes}`);
  console.log(`[dedup-pass3] dry-run: ${dryRun}\n`);

  // Load full rule metadata for name/jlpt/explanation propagation
  const allLiveIds = Array.from(new Set([
    ...liveMerges.flatMap((m) => [m.orphan, m.canonical]),
    ...liveDeletes.map((d) => d.id),
  ]));
  if (allLiveIds.length === 0) { console.log("(nothing to do)"); return; }

  const idList = allLiveIds.map((id) => `'${id}'::uuid`).join(",");
  const ruleRes = await db.execute(sql.raw(`
    SELECT id::text AS id, name, jlpt_reference, explanation
    FROM grammar_rules WHERE id IN (${idList})
  `));
  const rules = (ruleRes.rows ?? ruleRes) as Rule[];
  const byId = new Map(rules.map((r) => [r.id, r]));

  console.log("[dedup-pass3] MERGES:");
  for (const m of liveMerges) {
    const o = byId.get(m.orphan);
    const c = byId.get(m.canonical);
    if (!o || !c) { console.log(`  [SKIP] missing rule for ${m.orphan} or ${m.canonical}`); continue; }
    console.log(`  [${o.jlpt_reference}] ${o.name}`);
    console.log(`     →  [${c.jlpt_reference}] ${c.name}`);
    console.log(`     ${m.reason}`);
  }
  console.log("\n[dedup-pass3] DELETIONS (non-grammar metadata):");
  for (const d of liveDeletes) {
    const r = byId.get(d.id);
    console.log(`  [${r?.jlpt_reference}] ${r?.name}`);
    console.log(`     ${d.reason}`);
  }

  if (dryRun) {
    console.log("\n[dedup-pass3] dry-run — no DB writes.");
    return;
  }

  // ---- Step 1: re-link song_version_grammar_rules with dup-cleanup ----
  let svglRelinked = 0, svglDupDeleted = 0;
  for (const m of liveMerges) {
    const dupRes = await db.execute(sql.raw(`
      DELETE FROM song_version_grammar_rules
      WHERE grammar_rule_id = '${m.orphan}'::uuid
        AND song_version_id IN (
          SELECT song_version_id FROM song_version_grammar_rules
          WHERE grammar_rule_id = '${m.canonical}'::uuid
        )
      RETURNING song_version_id
    `));
    svglDupDeleted += ((dupRes.rows ?? dupRes) as unknown[]).length;

    const relinkRes = await db.execute(sql.raw(`
      UPDATE song_version_grammar_rules
      SET grammar_rule_id = '${m.canonical}'::uuid
      WHERE grammar_rule_id = '${m.orphan}'::uuid
      RETURNING song_version_id
    `));
    svglRelinked += ((relinkRes.rows ?? relinkRes) as unknown[]).length;
  }
  console.log(`\n[dedup-pass3] song_version_grammar_rules: ${svglRelinked} re-linked, ${svglDupDeleted} dup-dropped`);

  // ---- Step 2: rewrite lesson JSONB grammar_points ----
  const versionRes = await db.execute(sql`
    SELECT id, lesson FROM song_versions
    WHERE lesson IS NOT NULL AND lesson->'grammar_points' IS NOT NULL
  `);
  const versions = (versionRes.rows ?? versionRes) as Array<{ id: string; lesson: any }>;

  let versionsTouched = 0, pointsRewritten = 0, pointsRemoved = 0;
  const deletedNames = new Set(liveDeletes.map((d) => byId.get(d.id)?.name?.trim() ?? ""));
  for (const v of versions) {
    const lesson = v.lesson;
    if (!Array.isArray(lesson?.grammar_points)) continue;
    let mutated = false;

    // First, remove grammar_points that point at deleted non-grammar metadata rules
    const beforeLen = lesson.grammar_points.length;
    lesson.grammar_points = lesson.grammar_points.filter((gp: any) => {
      const isDeleted = deletedNames.has((gp.name ?? "").trim());
      if (isDeleted) pointsRemoved++;
      return !isDeleted;
    });
    if (lesson.grammar_points.length !== beforeLen) mutated = true;

    // Then, rewrite grammar_points whose (name, jlpt) matches a merge orphan
    for (const gp of lesson.grammar_points) {
      const gpName = (gp.name ?? "").trim();
      const gpJlpt = (gp.jlpt_reference ?? "").trim();
      const match = liveMerges.find((m) => {
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
      await db.execute(sql`
        UPDATE song_versions
        SET lesson = ${JSON.stringify(lesson)}::jsonb,
            updated_at = NOW()
        WHERE id = ${v.id}::uuid
      `);
      versionsTouched++;
    }
  }
  console.log(`[dedup-pass3] lesson JSONB: ${pointsRewritten} rewritten + ${pointsRemoved} removed across ${versionsTouched} song_versions`);

  // ---- Step 3: re-link grammar_exercises (preserve seeded exercises) ----
  let exercisesRelinked = 0, exercisesDeleted = 0;
  for (const m of liveMerges) {
    const r = await db.execute(sql.raw(`
      UPDATE grammar_exercises SET grammar_rule_id = '${m.canonical}'::uuid
      WHERE grammar_rule_id = '${m.orphan}'::uuid RETURNING id
    `));
    exercisesRelinked += ((r.rows ?? r) as unknown[]).length;
  }
  // For deletions, exercises will cascade-delete (no canonical to relink to — it's not a duplicate, it's a non-grammar rule)
  for (const d of liveDeletes) {
    const r = await db.execute(sql.raw(`
      SELECT COUNT(*)::int AS n FROM grammar_exercises WHERE grammar_rule_id = '${d.id}'::uuid
    `));
    exercisesDeleted += (((r.rows ?? r) as Array<{ n: number }>)[0]?.n ?? 0);
  }
  console.log(`[dedup-pass3] grammar_exercises: ${exercisesRelinked} re-linked, ${exercisesDeleted} will cascade-delete (non-grammar rules)`);

  // ---- Step 4: re-link user_grammar_rule_mastery with dup-cleanup ----
  let masteryRelinked = 0, masteryDupDropped = 0, masteryDeleted = 0;
  for (const m of liveMerges) {
    const dup = await db.execute(sql.raw(`
      DELETE FROM user_grammar_rule_mastery
      WHERE grammar_rule_id = '${m.orphan}'::uuid
        AND user_id IN (
          SELECT user_id FROM user_grammar_rule_mastery WHERE grammar_rule_id = '${m.canonical}'::uuid
        )
      RETURNING user_id
    `));
    masteryDupDropped += ((dup.rows ?? dup) as unknown[]).length;

    const r = await db.execute(sql.raw(`
      UPDATE user_grammar_rule_mastery SET grammar_rule_id = '${m.canonical}'::uuid
      WHERE grammar_rule_id = '${m.orphan}'::uuid RETURNING user_id
    `));
    masteryRelinked += ((r.rows ?? r) as unknown[]).length;
  }
  for (const d of liveDeletes) {
    const r = await db.execute(sql.raw(`
      SELECT COUNT(*)::int AS n FROM user_grammar_rule_mastery WHERE grammar_rule_id = '${d.id}'::uuid
    `));
    masteryDeleted += (((r.rows ?? r) as Array<{ n: number }>)[0]?.n ?? 0);
  }
  console.log(`[dedup-pass3] user_grammar_rule_mastery: ${masteryRelinked} re-linked, ${masteryDupDropped} dup-dropped, ${masteryDeleted} will cascade-delete`);

  // ---- Step 5: re-link user_grammar_exercise_log ----
  let logRelinked = 0;
  for (const m of liveMerges) {
    const r = await db.execute(sql.raw(`
      UPDATE user_grammar_exercise_log SET grammar_rule_id = '${m.canonical}'::uuid
      WHERE grammar_rule_id = '${m.orphan}'::uuid RETURNING id
    `));
    logRelinked += ((r.rows ?? r) as unknown[]).length;
  }
  console.log(`[dedup-pass3] user_grammar_exercise_log: ${logRelinked} re-linked`);

  // ---- Step 6: delete orphans + non-grammar deletions ----
  const allToDelete = [...liveMerges.map((m) => m.orphan), ...liveDeletes.map((d) => d.id)];
  const deleteList = allToDelete.map((id) => `'${id}'::uuid`).join(",");
  const delRes = await db.execute(sql.raw(`
    DELETE FROM grammar_rules WHERE id IN (${deleteList}) RETURNING id
  `));
  const totalDeleted = ((delRes.rows ?? delRes) as unknown[]).length;
  console.log(`[dedup-pass3] grammar_rules deleted: ${totalDeleted} (${liveMerges.length} merge orphans + ${liveDeletes.length} non-grammar)`);

  // Final state
  const finalRes = await db.execute(sql`SELECT COUNT(*)::int AS n FROM grammar_rules`);
  const finalRows = (finalRes.rows ?? finalRes) as Array<{ n: number }>;
  console.log(`\n[dedup-pass3] grammar_rules remaining: ${finalRows[0]?.n}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
