import { config } from "dotenv";
config({ path: ".env.local" });
import { getDb } from "../../src/lib/db/index.js";
import { sql } from "drizzle-orm";

const slug = process.argv[2] ?? "the-1-muque";

async function main() {
  const db = getDb();

  const rows = await db.execute(sql`
    SELECT s.slug, sv.version_type,
           left(usp.user_id, 8) as user_id,
           usp.vocab_track_pct::numeric as vocab,
           usp.grammar_track_pct::numeric as grammar,
           usp.kanji_track_pct::numeric as kanji,
           usp.sessions_completed,
           usp.updated_at
    FROM user_song_progress usp
    JOIN song_versions sv ON sv.id = usp.song_version_id
    JOIN songs s ON s.id = sv.song_id
    WHERE s.slug = ${slug}
    ORDER BY usp.updated_at DESC
  `);

  console.log(`\nProgress for: ${slug}`);
  if (rows.rows.length === 0) {
    console.log("  No progress rows found.");
  } else {
    for (const r of rows.rows as Record<string, unknown>[]) {
      console.log(
        `  user=${r.user_id}… [${r.version_type}]` +
        `  vocab=${r.vocab}% grammar=${r.grammar}% kanji=${r.kanji}%` +
        `  sessions=${r.sessions_completed}  updated=${r.updated_at}`
      );
    }
  }

  // FSRS state breakdown via vocab_global materialized view
  const fsrsRows = await db.execute(sql`
    SELECT uvm.state, COUNT(*) as count
    FROM user_vocab_mastery uvm
    JOIN vocab_global vg ON vg.vocab_item_id = uvm.vocab_item_id
    JOIN songs s ON s.id = vg.song_id
    WHERE s.slug = ${slug}
    GROUP BY uvm.state
    ORDER BY uvm.state
  `);

  console.log(`\nFSRS state distribution for vocab in ${slug}:`);
  const stateNames: Record<number, string> = { 0: "New", 1: "Learning", 2: "Review", 3: "Relearning" };
  if (fsrsRows.rows.length === 0) {
    console.log("  No FSRS rows found (all vocab is state=0/New by default).");
  } else {
    for (const r of fsrsRows.rows as { state: number; count: string }[]) {
      console.log(`  state=${r.state} (${stateNames[r.state] ?? "?"}): ${r.count} items`);
    }
  }

  // Exercise log count
  const logRows = await db.execute(sql`
    SELECT uel.exercise_type, COUNT(*) as count
    FROM user_exercise_log uel
    JOIN song_versions sv ON sv.id = uel.song_version_id
    JOIN songs s ON s.id = sv.song_id
    WHERE s.slug = ${slug}
    GROUP BY uel.exercise_type
    ORDER BY count DESC
  `);

  console.log(`\nExercise log for ${slug}:`);
  if (logRows.rows.length === 0) {
    console.log("  No exercise log entries.");
  } else {
    for (const r of logRows.rows as { exercise_type: string; count: string }[]) {
      console.log(`  ${r.exercise_type}: ${r.count}`);
    }
  }
}

main().catch(console.error);
