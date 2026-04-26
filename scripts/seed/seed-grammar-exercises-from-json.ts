/**
 * seed-grammar-exercises-from-json.ts — bulk-insert grammar_exercises from a
 * JSON file hand-authored in the chat (cost-zero alternative to the inline
 * Anthropic generator).
 *
 * Input file is an array of objects matching the grammar_exercises row shape:
 *   {
 *     "grammar_rule_id": "uuid",
 *     "level": "beginner" | "intermediate" | "advanced",
 *     "exercise_type": "mcq_fill_blank" | "write_romaji",
 *     "prompt_jp_furigana": "...",
 *     "prompt_romaji": "..." | null,
 *     "prompt_translation": { "en": "...", "pt-BR": "..." },
 *     "blank_token_index": 0,
 *     "correct_answer": "...",
 *     "distractors": ["...", "...", "..."] | null,
 *     "hint": "..." | null
 *   }
 *
 * Skips duplicates by (rule_id, level, prompt_jp_furigana) — safe to re-run.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/seed-grammar-exercises-from-json.ts data/grammar-exercises/vivid-vice.json
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "fs";
import { resolve } from "path";
import { getDb } from "../../src/lib/db/index.js";
import { grammarExercises } from "../../src/lib/db/schema.js";
import { and, eq } from "drizzle-orm";

interface ExerciseInput {
  grammar_rule_id: string;
  level: "beginner" | "intermediate" | "advanced";
  exercise_type: "mcq_fill_blank" | "write_romaji";
  prompt_jp_furigana: string;
  prompt_romaji: string | null;
  prompt_translation: Record<string, string>;
  blank_token_index: number;
  correct_answer: string;
  distractors: string[] | null;
  hint: string | null;
}

function validate(row: ExerciseInput, i: number) {
  const ctx = `row ${i + 1} (rule ${row.grammar_rule_id} / ${row.level})`;
  if (!row.grammar_rule_id) throw new Error(`${ctx}: missing grammar_rule_id`);
  if (!["beginner", "intermediate", "advanced"].includes(row.level)) {
    throw new Error(`${ctx}: bad level ${row.level}`);
  }
  if (row.level === "advanced") {
    if (row.exercise_type !== "write_romaji") {
      throw new Error(`${ctx}: advanced requires write_romaji`);
    }
    if (row.distractors !== null) {
      throw new Error(`${ctx}: advanced requires null distractors`);
    }
  } else {
    if (row.exercise_type !== "mcq_fill_blank") {
      throw new Error(`${ctx}: ${row.level} requires mcq_fill_blank`);
    }
    if (!Array.isArray(row.distractors) || row.distractors.length !== 3) {
      throw new Error(`${ctx}: mcq needs exactly 3 distractors`);
    }
    const norm = (s: string) => s.trim().toLowerCase();
    const ca = norm(row.correct_answer);
    if (row.distractors.some((d) => norm(d) === ca)) {
      throw new Error(`${ctx}: distractor equals correct_answer`);
    }
  }
  if (row.level === "beginner" && !row.prompt_romaji) {
    throw new Error(`${ctx}: beginner requires prompt_romaji`);
  }
  if (!row.prompt_jp_furigana) throw new Error(`${ctx}: missing prompt_jp_furigana`);
  if (!row.correct_answer) throw new Error(`${ctx}: missing correct_answer`);
}

async function main() {
  const pathArg = process.argv[2];
  if (!pathArg) {
    console.error("provide path to json file");
    process.exit(1);
  }

  const db = getDb();
  const filePath = resolve(process.cwd(), pathArg);
  const rows = JSON.parse(readFileSync(filePath, "utf8")) as ExerciseInput[];
  if (!Array.isArray(rows)) {
    throw new Error("expected JSON array");
  }
  rows.forEach(validate);

  let inserted = 0;
  let skipped = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // Dedup: same rule + same level + same prompt_jp_furigana means same exercise.
    const existing = await db
      .select({ id: grammarExercises.id })
      .from(grammarExercises)
      .where(
        and(
          eq(grammarExercises.grammar_rule_id, row.grammar_rule_id),
          eq(grammarExercises.level, row.level),
          eq(grammarExercises.prompt_jp_furigana, row.prompt_jp_furigana)
        )
      )
      .limit(1);
    if (existing.length > 0) {
      skipped++;
      continue;
    }
    await db.insert(grammarExercises).values({
      grammar_rule_id: row.grammar_rule_id,
      level: row.level,
      exercise_type: row.exercise_type,
      prompt_jp_furigana: row.prompt_jp_furigana,
      prompt_romaji: row.prompt_romaji,
      prompt_translation: row.prompt_translation,
      blank_token_index: row.blank_token_index,
      correct_answer: row.correct_answer,
      distractors: row.distractors,
      hint: row.hint,
    });
    inserted++;
  }

  console.log(`${inserted} inserted, ${skipped} skipped (already existed).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
