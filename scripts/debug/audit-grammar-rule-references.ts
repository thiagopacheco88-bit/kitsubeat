/**
 * Audit what references grammar_rule_id and what got lost in dedup-pass2.
 *
 * Tables that reference grammar_rules.id:
 *   1. song_version_grammar_rules           — handled by dedup script
 *   2. grammar_exercises                    — onDelete: cascade  (LOST on orphan delete)
 *   3. user_grammar_rule_mastery            — onDelete: cascade  (FSRS PROGRESS LOST)
 *   4. user_grammar_exercise_log            — onDelete: NO ACTION (would FK-error)
 *
 * Reports:
 *   - Current row counts per child table
 *   - Whether any user_grammar_rule_mastery exists (signal for catastrophic loss)
 *   - Whether grammar_exercises orphans (rule_id with no rule row) exist
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";

async function main() {
  const db = getDb();

  const counts = await db.execute(sql`
    SELECT
      (SELECT COUNT(*)::int FROM grammar_rules) AS grammar_rules,
      (SELECT COUNT(*)::int FROM song_version_grammar_rules) AS svgr,
      (SELECT COUNT(*)::int FROM grammar_exercises) AS exercises,
      (SELECT COUNT(*)::int FROM user_grammar_rule_mastery) AS mastery,
      (SELECT COUNT(*)::int FROM user_grammar_exercise_log) AS exercise_log
  `);
  console.log("[audit] table row counts:");
  console.log(counts.rows ?? counts);

  // Distinct users with any mastery record
  const users = await db.execute(sql`
    SELECT user_id, COUNT(*)::int AS rules_tracked
    FROM user_grammar_rule_mastery
    GROUP BY user_id
    ORDER BY rules_tracked DESC
  `);
  console.log("\n[audit] users with grammar mastery state:");
  const userRows = (users.rows ?? users) as Array<{ user_id: string; rules_tracked: number }>;
  if (userRows.length === 0) {
    console.log("  (none — no user has any FSRS state on grammar rules yet)");
  } else {
    for (const u of userRows) console.log(`  ${u.user_id}: ${u.rules_tracked} rules`);
  }

  // Orphaned grammar_exercises (rule_id pointing at a deleted rule)
  const orphanExercises = await db.execute(sql`
    SELECT COUNT(*)::int AS n
    FROM grammar_exercises ge
    LEFT JOIN grammar_rules gr ON gr.id = ge.grammar_rule_id
    WHERE gr.id IS NULL
  `);
  const orphanExRows = (orphanExercises.rows ?? orphanExercises) as Array<{ n: number }>;
  console.log(`\n[audit] orphaned grammar_exercises: ${orphanExRows[0].n}`);
  console.log("  (should be 0 — cascade should have cleaned them; non-zero means broken FK)");

  // Orphaned user_grammar_exercise_log (no cascade — could cause errors)
  const orphanLog = await db.execute(sql`
    SELECT COUNT(*)::int AS n
    FROM user_grammar_exercise_log uel
    LEFT JOIN grammar_rules gr ON gr.id = uel.grammar_rule_id
    WHERE gr.id IS NULL
  `);
  const orphanLogRows = (orphanLog.rows ?? orphanLog) as Array<{ n: number }>;
  console.log(`\n[audit] orphaned user_grammar_exercise_log: ${orphanLogRows[0].n}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
