/**
 * 12-backfill-grammar-rules.ts — Phase 13: normalize lesson.grammar_points
 * into first-class grammar_rules + song_version_grammar_rules rows.
 *
 * Reads every song_versions row with a non-null lesson.grammar_points array,
 * upserts each GrammarPoint into grammar_rules keyed by (name, jlpt_reference),
 * then links the song version to the rule via song_version_grammar_rules.
 *
 * The JSONB grammar_points entries are preserved — the relational tables are
 * the source of truth for the exercise bank and mastery tracking, but the
 * UI still reads explanations/conjugation_path from the lesson JSONB for
 * display.
 *
 * Idempotent: upsert on unique constraints, DO NOTHING on conflict. Safe to
 * re-run whenever new songs are added to the catalog.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/12-backfill-grammar-rules.ts
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/12-backfill-grammar-rules.ts --dry-run
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb } from "../../src/lib/db/index.js";
import { songVersions, grammarRules, songVersionGrammarRules } from "../../src/lib/db/schema.js";
import { sql } from "drizzle-orm";
import type { GrammarPoint, Lesson } from "../../src/lib/types/lesson.js";

const DRY_RUN = process.argv.includes("--dry-run");

function normalizeKey(name: string, jlptRef: string): string {
  return `${name.trim()}::${jlptRef.trim()}`;
}

async function main() {
  const db = getDb();

  const versions = await db
    .select({ id: songVersions.id, lesson: songVersions.lesson })
    .from(songVersions);

  let scanned = 0;
  let rulesSeen = 0;
  let rulesInserted = 0;
  let linksInserted = 0;
  const seenRuleKeys = new Set<string>();

  for (const row of versions) {
    if (!row.lesson) continue;
    const lesson = row.lesson as Lesson;
    const points: GrammarPoint[] = lesson.grammar_points ?? [];
    if (!points.length) continue;
    scanned++;

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const name = point.name?.trim() ?? "";
      const jlptRef = point.jlpt_reference?.trim() ?? "";
      if (!name || !jlptRef) continue;

      const key = normalizeKey(name, jlptRef);
      rulesSeen++;
      const firstTime = !seenRuleKeys.has(key);
      seenRuleKeys.add(key);

      if (DRY_RUN) continue;

      // Upsert the rule. ON CONFLICT DO UPDATE SET updated_at so RETURNING id
      // always comes back regardless of insert vs conflict.
      const [rule] = await db
        .insert(grammarRules)
        .values({
          name,
          jlpt_reference: jlptRef,
          explanation: point.explanation as object,
        })
        .onConflictDoUpdate({
          target: [grammarRules.name, grammarRules.jlpt_reference],
          set: { updated_at: sql`now()` },
        })
        .returning({ id: grammarRules.id });

      if (!rule) continue;
      if (firstTime) rulesInserted++;

      // Link song_version → rule. Conflict = already linked, skip.
      const inserted = await db
        .insert(songVersionGrammarRules)
        .values({
          song_version_id: row.id,
          grammar_rule_id: rule.id,
          display_order: i,
          conjugation_path: point.conjugation_path ?? null,
        })
        .onConflictDoNothing()
        .returning({ id: songVersionGrammarRules.id });

      if (inserted.length > 0) linksInserted++;
    }
  }

  console.log("\n── grammar backfill ──");
  console.log(`song_versions with grammar: ${scanned}`);
  console.log(`grammar_points encountered: ${rulesSeen}`);
  console.log(`unique rules (name+jlpt):   ${seenRuleKeys.size}`);
  if (DRY_RUN) {
    console.log("(dry-run — no DB writes)");
  } else {
    console.log(`new grammar_rules rows:    ${rulesInserted}`);
    console.log(`new version→rule links:    ${linksInserted}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
