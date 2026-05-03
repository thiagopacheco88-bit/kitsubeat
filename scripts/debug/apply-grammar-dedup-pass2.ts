/**
 * Second consolidation pass — merges duplicate grammar_rules that survived
 * the first apply-grammar-rule-consolidation.ts run.
 *
 * Two merge categories:
 *   A. Cross-batch (orphan → already-authored v2 canonical):
 *      Propagates the canonical's v2 name+explanation to every song_version
 *      lesson.grammar_points entry that previously matched the orphan's
 *      (name, jlpt). Effectively extends v2 reach to ~70 more song_versions.
 *
 *   B. Within-batch (both un-authored):
 *      Picks the higher-song-count member as canonical (or alphabetically-first
 *      ID on ties). Propagates the canonical's existing (non-v2) name+
 *      explanation. The canonical will be authored to v2 in a later batch.
 *
 * Steps per merge pair (mirrors apply-grammar-rule-consolidation.ts):
 *   1. DELETE duplicate (canonical_id, song_version_id) join rows that would
 *      violate the unique constraint.
 *   2. UPDATE song_version_grammar_rules.grammar_rule_id orphan → canonical.
 *   3. UPDATE song_versions.lesson.grammar_points[] — rewrite name+jlpt+
 *      explanation for matched entries.
 *   4. UPDATE grammar_exercises.grammar_rule_id orphan → canonical
 *      (preserves authored/seeded exercises through the merge).
 *   5. UPDATE user_grammar_rule_mastery.grammar_rule_id orphan → canonical,
 *      with pre-delete of (canonical, user) duplicates that would violate
 *      the unique constraint (user FSRS progress is preserved on the canonical).
 *   6. UPDATE user_grammar_exercise_log.grammar_rule_id orphan → canonical
 *      (no unique constraint to worry about — straight re-link).
 *   7. DELETE orphan grammar_rules row.
 *
 * IMPORTANT: Steps 4-6 MUST run before step 7. Three of these tables have
 * onDelete: cascade FKs to grammar_rules. Skipping them = silent data loss
 * on orphan delete (the original apply-grammar-rule-consolidation.ts had this
 * bug — got lucky because no users existed yet).
 *
 * Idempotent: re-running after success is a no-op (orphans already deleted).
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/debug/apply-grammar-dedup-pass2.ts --dry-run
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/debug/apply-grammar-dedup-pass2.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";

interface MergePair {
  orphan: string;
  canonical: string;
  reason: string;
}

const MERGES: MergePair[] = [
  // --- Cross-batch: orphan → batch1/batch2 v2 canonical ---
  { orphan: "c38ecbc8-8a01-4e0f-9438-02badaf7b596", canonical: "2f4bde8c-f15b-43bc-bcfa-191da710a386", reason: "〜たい dup → 〜tai (batch1)" },
  { orphan: "8f2a8d1a-f687-40b2-91a2-cf129120b75b", canonical: "7055ddcc-0f83-4d34-94ca-6b8807abd37e", reason: "〜ずに dup → 〜zu (ni) (batch1)" },
  { orphan: "20b9300c-5a14-4c96-b825-3e9c51d4b7f0", canonical: "975331f4-03e3-4703-94a7-100d26eb5145", reason: "〜続ける dup → 〜tsuzukeru (batch1)" },
  { orphan: "add25a2c-5fac-4d10-b8f7-b9f525b7bb74", canonical: "02522b64-19a7-422c-87d7-318afd223420", reason: "〜ちゃう dup → 〜chau/jau (batch2)" },
  { orphan: "b928630d-f2f9-4445-be1e-571e01d5fad7", canonical: "3271a7b8-8e74-4372-9a57-ec39b80e8cc6", reason: "〜まま dup → 〜mama (batch2)" },
  { orphan: "7db79739-81ba-4b52-9a53-5217a8826b90", canonical: "c3fd6077-9048-44c1-b8ec-93fe565fdc2b", reason: "〜だって dup → 〜datte (batch2)" },
  { orphan: "c25fe9ad-7563-4005-a0fb-ab434580d4b0", canonical: "75765b3c-d98d-4081-9316-dd2f85f309eb", reason: "〜よう volitional dup → 〜you/ou (batch2)" },
  { orphan: "501bafd7-c57f-4d31-b9af-0c973842c36d", canonical: "82bde35d-b73c-494a-a1a0-dff9fc412303", reason: "〜ほど…ない negative use → 〜hodo (batch2)" },
  { orphan: "feb8b0e7-b0a1-4a5b-a41e-fb91cd17b023", canonical: "3271a7b8-8e74-4372-9a57-ec39b80e8cc6", reason: "〜たまま (past+mama) → 〜mama (batch2)" },

  // --- Within-batch: pick highest song_count canonical ---
  { orphan: "22f86c2b-6619-4c48-99f5-a9c7b879c17d", canonical: "5f70f52a-4e3b-4b57-93ce-b44763a711cd", reason: "Passive 〜られる dup → 〜(ら)れる" },
  { orphan: "aa328157-c231-4373-929e-b5a317174d6d", canonical: "d1afdbf7-411d-4b51-9aef-c1d29a3349e0", reason: "Imperative dup → 命令形 (10 songs)" },
  { orphan: "d174b63e-c564-4721-a089-f86199a1eb9e", canonical: "d1afdbf7-411d-4b51-9aef-c1d29a3349e0", reason: "Bare imperative 〜ろ/〜れ → 命令形 (subset)" },
  { orphan: "96ccc215-f3e3-4966-8534-a837a5933504", canonical: "a69edff2-3f3f-448c-899b-e75e9387fabf", reason: "〜てゆく dup → progressive-movement variant" },
  { orphan: "cffc19a6-57f7-43e3-b8ac-62b675c6db81", canonical: "21037dd8-4312-4b4d-a104-0b6f3fb1f856", reason: "〜だらけ dup (alphabetical canonical)" },
  { orphan: "dcc7f95f-1596-4949-a869-c9886605ecf7", canonical: "8d859f55-61c8-4539-9c3b-96832e31e940", reason: "〜ばかり dup (alphabetical canonical)" },
  { orphan: "140d9ca9-8cfe-4b2a-8663-041052da19e9", canonical: "2a28ef78-f2e4-432f-a6f5-d2d6b22a577e", reason: "〜のように → 〜ように (same simile sense)" },
  { orphan: "30736478-1209-4c9c-a379-95333cc48584", canonical: "a0d93554-e629-4a25-8d26-6f4bd78a227d", reason: "〜ていく continuing-away → 〜ていく (high-freq canonical)" },

  // --- Pass 2 follow-ups: cross-JLPT dupes surfaced after first re-rank ---
  { orphan: "5b369ad3-1980-418c-93b5-79c681c94a80", canonical: "05a47b35-f7bd-41a0-bea8-1eab6bfcd2a1", reason: "〜まで N4 dup → N5 canonical" },
  { orphan: "c7596dae-615b-4f55-a7d3-1d9cef6a614b", canonical: "0086e6bc-d5b1-4122-b312-e870381d6eb5", reason: "〜くらい N4 dup → N3 canonical" },
  { orphan: "f2c6109f-883a-4c75-a622-2e9120d78793", canonical: "0b73b44c-4256-49cb-9002-825f9d225b32", reason: "〜はず N3 dup → N4 canonical" },
  { orphan: "aba91ffa-bd0e-408c-a631-5dddd79d32ad", canonical: "4d5ffbe9-28ba-475a-a185-d090a30e75a3", reason: "〜てしまう N3 dup → 〜te shimau (batch1)" },
];

const dryRun = process.argv.includes("--dry-run");

interface Rule {
  id: string;
  name: string;
  jlpt_reference: string;
  explanation: { en?: string } | string | null;
}

async function main() {
  const db = getDb();

  // Load metadata for every orphan + canonical referenced in MERGES
  const allIds = Array.from(new Set(MERGES.flatMap((m) => [m.orphan, m.canonical])));
  const idList = allIds.map((id) => `'${id}'::uuid`).join(",");
  const ruleRes = await db.execute(sql.raw(`
    SELECT id, name, jlpt_reference, explanation
    FROM grammar_rules WHERE id IN (${idList})
  `));
  const rules = (ruleRes.rows ?? ruleRes) as Rule[];
  const byId = new Map(rules.map((r) => [r.id, r]));

  // Validate: every canonical must exist; orphans may be already-deleted (idempotent skip)
  const missingCanonical: string[] = [];
  for (const m of MERGES) {
    if (!byId.has(m.canonical)) missingCanonical.push(`canonical missing: ${m.canonical} (${m.reason})`);
  }
  if (missingCanonical.length > 0) {
    console.error("[dedup-pass2] FATAL — required canonical rules not found:");
    for (const e of missingCanonical) console.error("  " + e);
    process.exit(1);
  }

  const live = MERGES.filter((m) => byId.has(m.orphan));
  const skipped = MERGES.length - live.length;
  console.log(`\n[dedup-pass2] merges declared: ${MERGES.length}`);
  console.log(`[dedup-pass2] live merges:      ${live.length}`);
  console.log(`[dedup-pass2] already-merged:   ${skipped} (idempotent skip)`);
  console.log(`[dedup-pass2] dry-run:          ${dryRun}\n`);

  for (const m of live) {
    const o = byId.get(m.orphan)!;
    const c = byId.get(m.canonical)!;
    console.log(`  [${o.jlpt_reference}] ${o.name}  →  ${c.name}`);
    console.log(`     reason: ${m.reason}`);
  }

  if (dryRun) {
    console.log("\n[dedup-pass2] dry-run — no DB writes.");
    return;
  }

  // Step 1+2: relink song_version_grammar_rules with dup-cleanup
  let svglRelinked = 0;
  let svglDupDeleted = 0;
  for (const m of live) {
    // Pre-delete (orphan, song_version) rows where canonical already has the link
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
  console.log(`\n[dedup-pass2] song_version_grammar_rules: ${svglRelinked} re-linked, ${svglDupDeleted} duplicates dropped`);

  // Step 3: rewrite lesson JSONB grammar_points
  // For each orphan, match by (orphan.name, orphan.jlpt) and replace with
  // canonical (name, jlpt, explanation).
  const versionRes = await db.execute(sql`
    SELECT id, lesson FROM song_versions
    WHERE lesson IS NOT NULL AND lesson->'grammar_points' IS NOT NULL
  `);
  const versions = (versionRes.rows ?? versionRes) as Array<{ id: string; lesson: any }>;

  let versionsTouched = 0;
  let pointsRewritten = 0;
  for (const v of versions) {
    const lesson = v.lesson;
    if (!Array.isArray(lesson?.grammar_points)) continue;
    let mutated = false;
    for (const gp of lesson.grammar_points) {
      const gpName = (gp.name ?? "").trim();
      const gpJlpt = (gp.jlpt_reference ?? "").trim();
      const match = live.find((m) => {
        const o = byId.get(m.orphan)!;
        return o.name.trim() === gpName && o.jlpt_reference.trim() === gpJlpt;
      });
      if (!match) continue;
      const c = byId.get(match.canonical)!;
      gp.name = c.name;
      gp.jlpt_reference = c.jlpt_reference;
      // Propagate canonical's explanation (v2 if present, else stable old text)
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
  console.log(`[dedup-pass2] lesson JSONB: ${pointsRewritten} grammar_points rewritten across ${versionsTouched} song_versions`);

  // Step 4: re-link grammar_exercises (preserve authored/seeded exercises)
  let exercisesRelinked = 0;
  for (const m of live) {
    const r = await db.execute(sql.raw(`
      UPDATE grammar_exercises
      SET grammar_rule_id = '${m.canonical}'::uuid
      WHERE grammar_rule_id = '${m.orphan}'::uuid
      RETURNING id
    `));
    exercisesRelinked += ((r.rows ?? r) as unknown[]).length;
  }
  console.log(`[dedup-pass2] grammar_exercises: ${exercisesRelinked} re-linked (would have cascade-deleted)`);

  // Step 5: re-link user_grammar_rule_mastery with dup-cleanup
  // unique(user_id, grammar_rule_id) — if a user has mastery on BOTH orphan and
  // canonical, we keep the canonical row and drop the orphan row.
  let masteryRelinked = 0;
  let masteryDupDropped = 0;
  for (const m of live) {
    const dup = await db.execute(sql.raw(`
      DELETE FROM user_grammar_rule_mastery
      WHERE grammar_rule_id = '${m.orphan}'::uuid
        AND user_id IN (
          SELECT user_id FROM user_grammar_rule_mastery
          WHERE grammar_rule_id = '${m.canonical}'::uuid
        )
      RETURNING user_id
    `));
    masteryDupDropped += ((dup.rows ?? dup) as unknown[]).length;

    const r = await db.execute(sql.raw(`
      UPDATE user_grammar_rule_mastery
      SET grammar_rule_id = '${m.canonical}'::uuid
      WHERE grammar_rule_id = '${m.orphan}'::uuid
      RETURNING user_id
    `));
    masteryRelinked += ((r.rows ?? r) as unknown[]).length;
  }
  console.log(`[dedup-pass2] user_grammar_rule_mastery: ${masteryRelinked} re-linked, ${masteryDupDropped} dup-dropped`);

  // Step 6: re-link user_grammar_exercise_log (no unique constraint)
  let logRelinked = 0;
  for (const m of live) {
    const r = await db.execute(sql.raw(`
      UPDATE user_grammar_exercise_log
      SET grammar_rule_id = '${m.canonical}'::uuid
      WHERE grammar_rule_id = '${m.orphan}'::uuid
      RETURNING id
    `));
    logRelinked += ((r.rows ?? r) as unknown[]).length;
  }
  console.log(`[dedup-pass2] user_grammar_exercise_log: ${logRelinked} re-linked`);

  // Step 7: delete orphans (now safe — all child references are re-pointed)
  const orphanIds = live.map((m) => `'${m.orphan}'::uuid`).join(",");
  const delRes = await db.execute(sql.raw(`
    DELETE FROM grammar_rules WHERE id IN (${orphanIds}) RETURNING id
  `));
  const orphansDeleted = ((delRes.rows ?? delRes) as unknown[]).length;
  console.log(`[dedup-pass2] grammar_rules: ${orphansDeleted} orphans deleted`);

  // Final state
  const finalRes = await db.execute(sql`SELECT COUNT(*)::int AS n FROM grammar_rules`);
  const finalRows = (finalRes.rows ?? finalRes) as Array<{ n: number }>;
  console.log(`[dedup-pass2] grammar_rules remaining: ${finalRows[0]?.n}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
