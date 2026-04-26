/**
 * grammar-ai.ts — On-demand Phase 13 grammar exercise generator.
 *
 * Runs server-side (imported only from server actions). Generates ONE
 * grammar_exercises row at a time via the Anthropic Messages API and persists
 * it before returning. Called lazily by the Grammar Session flow when the
 * exercise bank for a (rule, level) is running low for the user.
 *
 * Contract:
 *   - Never batches. One call → one row.
 *   - Enforces the 100-per-(rule, level) ceiling before the API call.
 *   - Uses the lowest-cost model by default (Haiku 4.5) and strict JSON
 *     output; switch to `claude-sonnet-4-6` if quality checks fail.
 *   - Prompt cache key = the system prompt + rule details; repeated calls
 *     for the same (rule, level) hit the cache on the system prompt.
 */

import Anthropic from "@anthropic-ai/sdk";
import { and, eq, count } from "drizzle-orm";
import { db } from "@/lib/db/index";
import {
  grammarExercises,
  grammarRules,
  type GrammarRuleRow,
} from "@/lib/db/schema";
import type { GrammarLevel } from "@/lib/types/lesson";
import { localize, type Localizable } from "@/lib/types/lesson";

const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 1024;

/**
 * Application-level ceiling on per-(rule, level) exercises. When the bank hits
 * this count, generateOneGrammarExercise refuses and returns null — the caller
 * falls back to replaying existing exercises via FSRS. 100 is plenty for
 * spaced-repetition variety; going higher wastes cache cost.
 */
export const GRAMMAR_EXERCISE_CAP_PER_LEVEL = 100;

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set — cannot generate grammar exercises."
      );
    }
    _client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      maxRetries: 2,
    });
  }
  return _client;
}

export async function countExercisesForRuleLevel(
  grammarRuleId: string,
  level: GrammarLevel
): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(grammarExercises)
    .where(
      and(
        eq(grammarExercises.grammar_rule_id, grammarRuleId),
        eq(grammarExercises.level, level)
      )
    );
  return row?.n ?? 0;
}

function buildPrompt(rule: GrammarRuleRow, level: GrammarLevel): string {
  const explanationEn = localize(rule.explanation as Localizable, "en");
  const levelRules = {
    beginner: `
LEVEL: BEGINNER (mcq_fill_blank)
- exercise_type must be "mcq_fill_blank"
- prompt_jp_furigana: short natural sentence (≤ 12 tokens) with one Japanese
  word replaced by the literal placeholder "____". Use kanji with <ruby>
  furigana</ruby> where appropriate.
- prompt_romaji: the same sentence in Hepburn romaji with "____" in the same
  slot. REQUIRED for beginner.
- distractors: exactly 3 plausible but wrong options in the SAME form as the
  correct answer (e.g. all verb conjugations, or all particles).
- hint: one short phrase (≤ 10 words) in English nudging toward the rule.`,
    intermediate: `
LEVEL: INTERMEDIATE (mcq_fill_blank)
- exercise_type must be "mcq_fill_blank"
- prompt_jp_furigana: natural sentence (≤ 15 tokens) with one token replaced by
  "____". Use <ruby>kanji<rt>furigana</rt></ruby> markup liberally so the learner
  can rely on furigana without romaji.
- prompt_romaji: MUST be null — intermediate hides romaji by design.
- distractors: exactly 3 close-semantic distractors (wrong conjugation, wrong
  particle, wrong level of politeness, etc.).
- hint: optional (may be null) — intermediate encourages figuring it out.`,
    advanced: `
LEVEL: ADVANCED (write_romaji)
- exercise_type must be "write_romaji"
- prompt_jp_furigana: natural sentence (≤ 18 tokens) with one token replaced by
  "____". Furigana markup optional.
- prompt_romaji: MUST be null — the learner is producing romaji, not reading it.
- distractors: MUST be null — advanced is free-text input.
- correct_answer: the romaji form the learner must type (Hepburn, long vowels
  as "ō" OR "ou" — both are accepted by the normalizer).
- hint: may contain the English gloss of the target token as a nudge.`,
  };

  return `You are building ONE Japanese grammar exercise for a learner app.

GRAMMAR RULE
- name: ${rule.name}
- JLPT reference: ${rule.jlpt_reference}
- explanation: ${explanationEn}
${rule.canonical_conjugation_template ? `- canonical template: ${rule.canonical_conjugation_template}` : ""}

${levelRules[level]}

GLOBAL CONSTRAINTS
- The sentence MUST naturally use the grammar rule above. The blanked token MUST
  be the slot where the rule applies.
- prompt_translation is a JSON object with keys "en" and "pt-BR", each a short
  natural translation of the sentence with the blank filled in.
- blank_token_index is the 0-based index of "____" after tokenizing the
  prompt_jp_furigana string by whitespace / punctuation boundaries.
- correct_answer is the exact string that fills the blank. For MCQ levels it
  MUST equal one of (correct_answer ∪ distractors) after trimming.
- NO repeated distractors. NO distractor equal to correct_answer.

OUTPUT
Return ONLY a JSON object with this shape, no prose:
{
  "exercise_type": "mcq_fill_blank" | "write_romaji",
  "prompt_jp_furigana": string,
  "prompt_romaji": string | null,
  "prompt_translation": { "en": string, "pt-BR": string },
  "blank_token_index": integer,
  "correct_answer": string,
  "distractors": string[] | null,
  "hint": string | null
}`;
}

interface GeneratedPayload {
  exercise_type: "mcq_fill_blank" | "write_romaji";
  prompt_jp_furigana: string;
  prompt_romaji: string | null;
  prompt_translation: Record<string, string>;
  blank_token_index: number;
  correct_answer: string;
  distractors: string[] | null;
  hint: string | null;
}

function extractJson(text: string): GeneratedPayload {
  // The model occasionally wraps JSON in ```json fences even with explicit
  // "return ONLY JSON" instructions — strip them defensively before parsing.
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(trimmed) as GeneratedPayload;
}

function validatePayload(payload: GeneratedPayload, level: GrammarLevel): void {
  if (level === "advanced") {
    if (payload.exercise_type !== "write_romaji") {
      throw new Error(`advanced level requires write_romaji, got ${payload.exercise_type}`);
    }
    if (payload.distractors !== null) {
      throw new Error("advanced exercises must have null distractors");
    }
  } else {
    if (payload.exercise_type !== "mcq_fill_blank") {
      throw new Error(`${level} requires mcq_fill_blank, got ${payload.exercise_type}`);
    }
    if (!Array.isArray(payload.distractors) || payload.distractors.length !== 3) {
      throw new Error(`${level} must have exactly 3 distractors`);
    }
    const norm = (s: string) => s.trim().toLowerCase();
    const ca = norm(payload.correct_answer);
    if (payload.distractors.some((d) => norm(d) === ca)) {
      throw new Error("a distractor matches correct_answer");
    }
    const unique = new Set(payload.distractors.map(norm));
    if (unique.size !== payload.distractors.length) {
      throw new Error("duplicate distractors");
    }
  }
  if (level === "beginner" && !payload.prompt_romaji) {
    throw new Error("beginner requires prompt_romaji");
  }
  if (level !== "beginner" && payload.prompt_romaji) {
    // Soft enforcement: overwrite to null rather than throw, because models
    // sometimes include a romaji aid on intermediate even when told not to.
    payload.prompt_romaji = null;
  }
}

/**
 * Generate exactly one grammar exercise for (rule, level), persist it, and
 * return the inserted row. Returns null if the bank is already at cap — the
 * caller should fall back to replay.
 */
export async function generateOneGrammarExercise(
  grammarRuleId: string,
  level: GrammarLevel
): Promise<typeof grammarExercises.$inferSelect | null> {
  const current = await countExercisesForRuleLevel(grammarRuleId, level);
  if (current >= GRAMMAR_EXERCISE_CAP_PER_LEVEL) return null;

  const [rule] = await db
    .select()
    .from(grammarRules)
    .where(eq(grammarRules.id, grammarRuleId))
    .limit(1);
  if (!rule) throw new Error(`grammar rule ${grammarRuleId} not found`);

  const prompt = buildPrompt(rule, level);
  const client = getClient();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Anthropic response missing text block");
  }
  const payload = extractJson(textBlock.text);
  validatePayload(payload, level);

  const [inserted] = await db
    .insert(grammarExercises)
    .values({
      grammar_rule_id: grammarRuleId,
      level,
      exercise_type: payload.exercise_type,
      prompt_jp_furigana: payload.prompt_jp_furigana,
      prompt_romaji: payload.prompt_romaji,
      prompt_translation: payload.prompt_translation,
      blank_token_index: payload.blank_token_index,
      correct_answer: payload.correct_answer,
      distractors: payload.distractors,
      hint: payload.hint,
    })
    .returning();

  return inserted;
}
