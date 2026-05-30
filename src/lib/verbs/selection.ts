import type { VerbEntry, VerbMasteryMap, ConjFormId } from "./types";
import { getStars } from "./mastery";
import { conjugateVerb, buildVerbDistractors } from "./conjugate";
import { FORM_META } from "./types";

export interface VerbQuestion {
  verbId: string;
  dict: string;
  reading: string;
  romaji: string;
  meaning: string;
  verbClass: import("./types").VerbClass;
  formId: ConjFormId;
  formLabel: string;
  correct: string;
  distractors: string[];
  sentenceJpPre: string;
  sentenceJpPost: string;
  sentenceEn: string;
  stars: number;
}

/** Same weight curve as kana: 0→10, 5→5, 10→1. */
export function weightFor(stars: number): number {
  const s = Math.max(0, Math.min(10, stars));
  if (s <= 0) return 10;
  if (s >= 10) return 1;
  return 10 - s;
}

function pickWeighted<T extends { weight: number }>(pool: T[], rng = Math.random): T {
  const total = pool.reduce((s, x) => s + x.weight, 0);
  let r = rng() * total;
  for (const x of pool) {
    r -= x.weight;
    if (r <= 0) return x;
  }
  return pool[pool.length - 1];
}

export interface SessionParams {
  verbs: VerbEntry[];
  forms: ConjFormId[];
  mastery: VerbMasteryMap;
  questionCount?: number;
  rng?: () => number;
}

/**
 * Build a question pool for a verb drilling session.
 * Weights (verb, form) pairs by inverse mastery — less-known combos appear more.
 * Skips (verb, form) pairs where conjugateVerb returns null.
 * Never repeats the same (verb, form) back-to-back.
 */
export function buildVerbSession(params: SessionParams): VerbQuestion[] {
  const { verbs, forms, mastery, questionCount = 20, rng = Math.random } = params;

  type Candidate = { verb: VerbEntry; formId: ConjFormId; weight: number; stars: number };
  const pool: Candidate[] = [];

  for (const verb of verbs) {
    for (const formId of forms) {
      const conjugated = conjugateVerb(verb.dict, formId);
      if (!conjugated) continue;
      const stars = getStars(mastery, verb.id, formId);
      pool.push({ verb, formId, weight: weightFor(stars), stars });
    }
  }

  if (pool.length === 0) return [];

  const keyOf = (c: Candidate) => `${c.verb.id}:${c.formId}`;
  const result: VerbQuestion[] = [];

  for (let i = 0; i < questionCount; i++) {
    const prev = i > 0 ? keyOf(result[i - 1] as unknown as Candidate) : null;
    const candidates = prev
      ? pool.filter((c) => keyOf(c) !== prev)
      : pool;
    const picked = pickWeighted(candidates.length > 0 ? candidates : pool, rng);

    const correct = conjugateVerb(picked.verb.dict, picked.formId)!;
    const distractors = buildVerbDistractors(picked.verb.dict, picked.formId);
    const meta = FORM_META[picked.formId];
    const sentence =
      meta.sentenceKey === "past"
        ? picked.verb.pastSentence
        : picked.verb.presentSentence;

    result.push({
      verbId: picked.verb.id,
      dict: picked.verb.dict,
      reading: picked.verb.reading,
      romaji: picked.verb.romaji,
      meaning: picked.verb.meaning,
      verbClass: picked.verb.verbClass,
      formId: picked.formId,
      formLabel: meta.label,
      correct,
      distractors,
      sentenceJpPre: sentence.jp_pre,
      sentenceJpPost: sentence.jp_post,
      sentenceEn: sentence.en,
      stars: picked.stars,
    });
  }

  return result;
}
