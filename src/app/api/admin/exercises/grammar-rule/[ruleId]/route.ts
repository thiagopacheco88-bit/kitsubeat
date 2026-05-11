import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { grammarExercises } from "@/lib/db/schema";

export const runtime = "nodejs";

export interface GrammarExerciseItem {
  id: string;
  level: string;
  exercise_type: string;
  prompt_jp_furigana: string;
  prompt_romaji: string | null;
  prompt_translation: string;
  blank_token_index: number;
  correct_answer: string;
  distractors: string[];
  hint: string | null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ruleId } = await params;

  const rows = await db
    .select({
      id: grammarExercises.id,
      level: grammarExercises.level,
      exercise_type: grammarExercises.exercise_type,
      prompt_jp_furigana: grammarExercises.prompt_jp_furigana,
      prompt_romaji: grammarExercises.prompt_romaji,
      prompt_translation: grammarExercises.prompt_translation,
      blank_token_index: grammarExercises.blank_token_index,
      correct_answer: grammarExercises.correct_answer,
      distractors: grammarExercises.distractors,
      hint: grammarExercises.hint,
    })
    .from(grammarExercises)
    .where(eq(grammarExercises.grammar_rule_id, ruleId))
    .orderBy(grammarExercises.level, grammarExercises.created_at);

  const exercises: GrammarExerciseItem[] = rows.map((r) => {
    const rawTranslation = r.prompt_translation as Record<string, string> | string;
    const translation =
      typeof rawTranslation === "string"
        ? rawTranslation
        : (rawTranslation?.en ?? Object.values(rawTranslation ?? {})[0] ?? "");

    return {
      id: r.id,
      level: r.level,
      exercise_type: r.exercise_type,
      prompt_jp_furigana: r.prompt_jp_furigana,
      prompt_romaji: r.prompt_romaji,
      prompt_translation: translation,
      blank_token_index: r.blank_token_index,
      correct_answer: r.correct_answer,
      distractors: (r.distractors as string[]) ?? [],
      hint: r.hint,
    };
  });

  return NextResponse.json({ exercises });
}
