/**
 * conjugation.ts — Phase 10-03 Grammar Conjugation helpers.
 *
 * Consumes parseConjugationPath() output from scripts/lib/conjugation-audit.ts
 * and produces (correct, distractors, base, form) options for the
 * grammar_conjugation exercise type.
 *
 * Two public surfaces:
 *   - V1_CONJUGATION_FORMS   — short list of form families supported in v1.
 *   - pickConjugationOptions — selects correct + 3 distractors.
 *
 * Pure TypeScript — no DB or network. Tested in __tests__/conjugation.test.ts.
 */

import {
  parseConjugationPath,
  type StructuredConjugation,
} from "../../../scripts/lib/conjugation-audit";
import type { GrammarPoint, VocabEntry } from "@/lib/types/lesson";

// ---------------------------------------------------------------------------
// V1 form coverage
// ---------------------------------------------------------------------------
//
// Selected from scripts/audit/conjugation-form-coverage.ts (see
// .planning/phases/10-advanced-exercises-full-mastery/conjugation-coverage.md).
//
// Out of 23 classified families (607 structured exemplars), v1 picks the four
// families with the cleanest, most recognizable mini-conjugator rules that
// beginners would attempt unassisted:
//
//   - past_affirmative  (42 exemplars, 33 songs)   — 食べる → 食べた
//   - te_form           (39 exemplars, 35 songs)   — 食べる → 食べて
//   - negative          (29 exemplars, 28 songs)   — 食べる → 食べない
//   - tai_form          (20 exemplars, 19 songs)   — 食べる → 食べたい
//
// past_negative is NOT drilled (too sparse — 4 exemplars) but IS used as the
// opposite-polarity same-verb distractor for past_affirmative targets.
//
// Compound families (shimau, progressive, conditional_*, obligation, etc.)
// are deferred — their mini-rules require stacked conjugation and gloss
// alignment that would inflate the module past the Task 1 size budget.

export const V1_CONJUGATION_FORMS: string[] = [
  "past_affirmative",
  "te_form",
  "negative",
  "tai_form",
];

// ---------------------------------------------------------------------------
// Coarse form classifier (shared with scripts/audit/conjugation-form-coverage.ts)
// ---------------------------------------------------------------------------
//
// Duplicated here deliberately: runtime consumers should not import from
// scripts/. The two definitions are kept in sync by a unit test that
// round-trips a canonical fixture through both.

/** Strip the parenthetical ASCII gloss from a conjugated Japanese field. */
export function stripGloss(conjugated: string): string {
  return conjugated.split(/\s*[(（/]/)[0].trim();
}

/** Classify a parsed conjugation into a coarse form family. */
export function classifyConjugationForm(
  parsed: StructuredConjugation,
): string {
  const conj = stripGloss(parsed.conjugated);
  const label = parsed.conjugation_type.toLowerCase();

  if (
    /なくちゃ|なきゃ|なければ|なくてはいけない|なくてはならない/.test(conj) ||
    label.includes("must") ||
    label.includes("obligation")
  )
    return "obligation";

  if (/たい$/.test(conj)) return "tai_form";
  if (/ように$|ようになる|ようになった$/.test(conj)) return "you_ni_hope";
  if (/てしまう$|でしまう$|てしまった$|でしまった$|ちゃう$|ちゃった$/.test(conj))
    return "shimau";
  if (/てくれる$|でくれる$|てください$|でください$|てくれた$/.test(conj))
    return "kureru_kudasai";

  if (/たら$|だら$/.test(conj)) return "conditional_tara";
  if (/れば$|けれど$|けれども$|けど$/.test(conj)) return "conditional_eba";
  if (/なら$/.test(conj)) return "conditional_nara";

  if (/なかった$/.test(conj) || /なくて$/.test(conj)) return "past_negative";
  if (/ました$/.test(conj)) return "past_polite";
  if (/でした$/.test(conj)) return "past_copula";

  if (/ません$/.test(conj)) return "negative_polite";
  if (/ない$/.test(conj)) return "negative";

  if (/ていた$|でいた$|ていました$|でいました$/.test(conj))
    return "past_progressive";
  if (/てた$|でた$/.test(conj)) return "past_progressive_casual";
  if (/ている$|でいる$/.test(conj)) return "progressive";
  if (/てる$|でる$|てく$/.test(conj)) return "progressive_casual";

  if (/ましょう$|おう$|よう$/.test(conj)) return "volitional";

  if (label.includes("causative") || /させる$|せる$|させて$|せて$/.test(conj))
    return "causative";
  if (label.includes("passive") || /られる$|される$/.test(conj))
    return "passive_potential";

  if (label.includes("imperative") || /ろ$/.test(conj)) return "imperative";

  if (/て$|で$/.test(conj)) return "te_form";
  if (/た$|だ$/.test(conj)) return "past_affirmative";

  if (/ために$|まで$|たびに$|からこそ$/.test(conj)) return "clause_marker";
  if (label.includes("masu-stem") || label.includes("stem")) return "stem";

  return "other";
}

// ---------------------------------------------------------------------------
// Mini conjugator — dictionary form → target form
// ---------------------------------------------------------------------------
//
// Rules for Japanese verb conjugation at the four v1 families. Godan (u-verb)
// phonemic shifts covered via a lookup table; ichidan (ru-verb) is strip-る +
// stem. Irregulars する / くる are hardcoded.

type Form = "past_affirmative" | "te_form" | "negative" | "tai_form" | "past_negative";

/** Explicit irregulars keyed by dictionary form. */
const IRREGULAR_TABLE: Record<string, Partial<Record<Form, string>>> = {
  する: {
    past_affirmative: "した",
    te_form: "して",
    negative: "しない",
    tai_form: "したい",
    past_negative: "しなかった",
  },
  くる: {
    past_affirmative: "きた",
    te_form: "きて",
    negative: "こない",
    tai_form: "きたい",
    past_negative: "こなかった",
  },
  来る: {
    past_affirmative: "来た",
    te_form: "来て",
    negative: "来ない",
    tai_form: "来たい",
    past_negative: "来なかった",
  },
  行く: {
    // 行く is godan but ike-te is irregular (行って not 行いて)
    past_affirmative: "行った",
    te_form: "行って",
    negative: "行かない",
    tai_form: "行きたい",
    past_negative: "行かなかった",
  },
  いく: {
    past_affirmative: "いった",
    te_form: "いって",
    negative: "いかない",
    tai_form: "いきたい",
    past_negative: "いかなかった",
  },
  ある: {
    past_affirmative: "あった",
    te_form: "あって",
    negative: "ない",
    tai_form: "ありたい",
    past_negative: "なかった",
  },
};

/** Is the verb ichidan (ru-verb)? Heuristic: ends in iru/eru with vowel kana i/e before る. */
function isIchidan(dict: string): boolean {
  // Must end in る
  if (!/る$/.test(dict)) return false;
  const penultimate = dict.slice(-2, -1);
  // Ichidan final-syllable mora ends in /i/ or /e/ kana.
  // Hiragana i-row: いきしちにひみり
  // Hiragana e-row: えけせてねへめれ (plus ぜでべぺ etc.)
  // Katakana i-row: イキシチニヒミリ
  // Katakana e-row: エケセテネヘメレ
  // Keep simple: test against the i/e-row kana that can precede る for ichidan.
  // (Godan verbs ending in iru/eru exist but most in this catalog are ichidan.)
  return /[いきしちにひみりぎじぢびぴえけせてねへめれげぜでべぺイキシチニヒミリギジヂビピエケセテネヘメレゲゼデベペ]/.test(
    penultimate,
  );
}

/** Godan stem transform table — dictionary final kana → (form → conjugated suffix). */
const GODAN_STEM: Record<
  string,
  { past_affirmative: string; te_form: string; negative: string; tai_form: string; past_negative: string }
> = {
  // -u  → past -tta, te -tte, neg -wanai, tai -itai, past_neg -wanakatta
  う: {
    past_affirmative: "った",
    te_form: "って",
    negative: "わない",
    tai_form: "いたい",
    past_negative: "わなかった",
  },
  // -tsu → past -tta, te -tte, neg -tanai, tai -chitai, past_neg -tanakatta
  つ: {
    past_affirmative: "った",
    te_form: "って",
    negative: "たない",
    tai_form: "ちたい",
    past_negative: "たなかった",
  },
  // -ru (godan) → past -tta, te -tte, neg -ranai, tai -ritai, past_neg -ranakatta
  る: {
    past_affirmative: "った",
    te_form: "って",
    negative: "らない",
    tai_form: "りたい",
    past_negative: "らなかった",
  },
  // -mu → past -nda, te -nde
  む: {
    past_affirmative: "んだ",
    te_form: "んで",
    negative: "まない",
    tai_form: "みたい",
    past_negative: "まなかった",
  },
  // -nu
  ぬ: {
    past_affirmative: "んだ",
    te_form: "んで",
    negative: "なない",
    tai_form: "にたい",
    past_negative: "ななかった",
  },
  // -bu
  ぶ: {
    past_affirmative: "んだ",
    te_form: "んで",
    negative: "ばない",
    tai_form: "びたい",
    past_negative: "ばなかった",
  },
  // -ku → past -ita, te -ite
  く: {
    past_affirmative: "いた",
    te_form: "いて",
    negative: "かない",
    tai_form: "きたい",
    past_negative: "かなかった",
  },
  // -gu → past -ida, te -ide
  ぐ: {
    past_affirmative: "いだ",
    te_form: "いで",
    negative: "がない",
    tai_form: "ぎたい",
    past_negative: "がなかった",
  },
  // -su → past -shita, te -shite
  す: {
    past_affirmative: "した",
    te_form: "して",
    negative: "さない",
    tai_form: "したい",
    past_negative: "さなかった",
  },
};

/**
 * Conjugate a dictionary-form verb into the target form.
 * Returns null if the verb cannot be conjugated (unknown godan ending,
 * unrecognized form, or not a verb).
 */
export function conjugate(dict: string, form: Form): string | null {
  if (!dict || dict.length < 2) return null;

  // Irregulars first (may be godan like 行く).
  const irregular = IRREGULAR_TABLE[dict];
  if (irregular && irregular[form]) return irregular[form]!;

  // Ichidan: drop る, add suffix
  if (isIchidan(dict)) {
    const stem = dict.slice(0, -1);
    switch (form) {
      case "past_affirmative":
        return stem + "た";
      case "te_form":
        return stem + "て";
      case "negative":
        return stem + "ない";
      case "tai_form":
        return stem + "たい";
      case "past_negative":
        return stem + "なかった";
    }
  }

  // Godan: strip final kana + append from GODAN_STEM
  const finalKana = dict.slice(-1);
  const rules = GODAN_STEM[finalKana];
  if (!rules) return null;
  const stem = dict.slice(0, -1);
  return stem + rules[form];
}

// ---------------------------------------------------------------------------
// Same-verb "wrong" distractor — opposite-polarity / adjacent-form selection
// ---------------------------------------------------------------------------
//
// Maps the target form to a sibling form whose output is nevertheless a
// plausible wrong conjugation of the SAME verb. Output: past_affirmative ↔
// past_negative (polarity), te_form → negative (rule confusion), negative →
// past_affirmative (polarity), tai_form → te_form.

const ADJACENT_FORM: Record<Form, Form> = {
  past_affirmative: "past_negative",
  te_form: "negative",
  negative: "past_affirmative",
  tai_form: "te_form",
  past_negative: "past_affirmative",
};

// ---------------------------------------------------------------------------
// Public API — pickConjugationOptions
// ---------------------------------------------------------------------------

export interface PickConjugationInput {
  /** The target vocab entry whose conjugated form is the correct answer. */
  targetVocab: VocabEntry;
  /** The grammar point backing this question (holds conjugation_path). */
  grammarPoint: GrammarPoint;
  /** Verbs from the same JLPT level to sample alternate-verb distractors from. */
  sameJlptPool: VocabEntry[];
}

export interface ConjugationOptions {
  /** The conjugated target form (correct answer). */
  correct: string;
  /** Exactly 3 distractors: 1 same-verb wrong conjugation + 2 alternate verbs in target form. */
  distractors: string[];
  /** Dictionary / base form of the target verb (shown as scaffold). */
  base: string;
  /** Coarse form family, e.g. "past_affirmative". */
  form: string;
}

function normalizeKey(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Select the correct answer + 3 distractors for a grammar_conjugation question.
 *
 * Returns null when:
 *   - The grammar point's conjugation_path is not structured.
 *   - The classified form is not in V1_CONJUGATION_FORMS.
 *   - The sameJlptPool has fewer than 2 distinct conjugatable verbs.
 *   - The same-verb wrong distractor would collide with the correct answer.
 *
 * Null return is preferred over filler "???" entries per CONTEXT
 * (skip-unstructured-cleanly invariant).
 */
export function pickConjugationOptions(
  input: PickConjugationInput,
): ConjugationOptions | null {
  const { targetVocab, grammarPoint, sameJlptPool } = input;

  const parsed = parseConjugationPath(grammarPoint.conjugation_path);
  if (!parsed || !parsed.is_structured) return null;

  const form = classifyConjugationForm(parsed);
  if (!V1_CONJUGATION_FORMS.includes(form)) return null;

  const base = stripGloss(parsed.base);
  const correct = stripGloss(parsed.conjugated);
  if (!base || !correct) return null;

  // Same-verb wrong conjugation: adjacent form of the same dictionary verb.
  const adjacent = ADJACENT_FORM[form as Form];
  const sameVerbWrong = adjacent ? conjugate(base, adjacent) : null;
  if (!sameVerbWrong) return null;
  if (normalizeKey(sameVerbWrong) === normalizeKey(correct)) return null;

  // Same-JLPT alternate verbs: filter to verbs, conjugate each to the target form.
  const usedKeys = new Set<string>([
    normalizeKey(correct),
    normalizeKey(sameVerbWrong),
  ]);
  const alternateDistractors: string[] = [];
  for (const entry of sameJlptPool) {
    if (alternateDistractors.length >= 2) break;
    if (entry.part_of_speech !== "verb") continue;
    if (entry.vocab_item_id === targetVocab.vocab_item_id) continue;
    const conjugated = conjugate(entry.surface, form as Form);
    if (!conjugated) continue;
    const key = normalizeKey(conjugated);
    if (usedKeys.has(key)) continue;
    usedKeys.add(key);
    alternateDistractors.push(conjugated);
  }

  if (alternateDistractors.length < 2) return null;

  return {
    correct,
    distractors: [sameVerbWrong, ...alternateDistractors],
    base,
    form,
  };
}
