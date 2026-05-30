/**
 * conjugate.ts — Verb conjugation engine for the verb drills module.
 *
 * Separate from src/lib/exercises/conjugation.ts (which serves the grammar
 * exercise system). This file covers all ConjFormId values including polite
 * forms and grammar patterns not needed by the grammar system.
 *
 * Pure TypeScript — no React, no DB. Tested in __tests__/verbs/conjugate.test.ts.
 */

import type { ConjFormId } from "./types";

// ---------------------------------------------------------------------------
// Ichidan heuristic — same logic as exercises/conjugation.ts
// ---------------------------------------------------------------------------

function isIchidan(dict: string): boolean {
  if (!/る$/.test(dict)) return false;
  const pen = dict.slice(-2, -1);
  return /[いきしちにひみりぎじぢびぴえけせてねへめれげぜでべぺイキシチニヒミリギジヂビピエケセテネヘメレゲゼデベペ]/.test(pen);
}

// ---------------------------------------------------------------------------
// Stem tables
// ---------------------------------------------------------------------------

/** Godan final kana → masu-stem kana */
const GODAN_MASU: Record<string, string> = {
  う: "い", つ: "ち", る: "り", む: "み", ぬ: "に",
  ぶ: "び", く: "き", ぐ: "ぎ", す: "し",
};

/** Godan final kana → e-row kana (for potential) */
const GODAN_POTENTIAL: Record<string, string> = {
  う: "え", つ: "て", る: "れ", む: "め", ぬ: "ね",
  ぶ: "べ", く: "け", ぐ: "げ", す: "せ",
};

/** Godan final kana → a-row kana for negative stem (used in nakereba) */
const GODAN_NEG_STEM: Record<string, string> = {
  う: "わ", つ: "た", る: "ら", む: "ま", ぬ: "な",
  ぶ: "ば", く: "か", ぐ: "が", す: "さ",
};

// ---------------------------------------------------------------------------
// Irregular lookup table — covers する, くる, 来る, 行く, いく, ある
// ---------------------------------------------------------------------------

const IRREGULARS: Record<string, Partial<Record<ConjFormId, string>>> = {
  する: {
    polite_present:       "します",
    polite_negative:      "しません",
    polite_past:          "しました",
    polite_past_negative: "しませんでした",
    plain_present:        "する",
    plain_negative:       "しない",
    plain_past:           "した",
    plain_past_negative:  "しなかった",
    te_form:              "して",
    tai_form:             "したい",
    potential:            "できます",
    beki:                 "するべきです",
    nakereba:             "しなければなりません",
  },
  くる: {
    polite_present:       "きます",
    polite_negative:      "きません",
    polite_past:          "きました",
    polite_past_negative: "きませんでした",
    plain_present:        "くる",
    plain_negative:       "こない",
    plain_past:           "きた",
    plain_past_negative:  "こなかった",
    te_form:              "きて",
    tai_form:             "きたい",
    potential:            "こられます",
    beki:                 "くるべきです",
    nakereba:             "こなければなりません",
  },
  来る: {
    polite_present:       "来ます",
    polite_negative:      "来ません",
    polite_past:          "来ました",
    polite_past_negative: "来ませんでした",
    plain_present:        "来る",
    plain_negative:       "来ない",
    plain_past:           "来た",
    plain_past_negative:  "来なかった",
    te_form:              "来て",
    tai_form:             "来たい",
    potential:            "来られます",
    beki:                 "来るべきです",
    nakereba:             "来なければなりません",
  },
  // 行く: godan but irregular te-form (行って, not 行いて)
  行く: {
    te_form:    "行って",
    plain_past: "行った",
  },
  いく: {
    te_form:    "いって",
    plain_past: "いった",
  },
  ある: {
    polite_present:       "あります",
    polite_negative:      "ありません",
    polite_past:          "ありました",
    polite_past_negative: "ありませんでした",
    plain_present:        "ある",
    plain_negative:       "ない",
    plain_past:           "あった",
    plain_past_negative:  "なかった",
    te_form:              "あって",
    tai_form:             "ありたい",
    potential:            "あれます",
    beki:                 "あるべきです",
    nakereba:             "なければなりません",
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Conjugate a dictionary-form verb into the target form.
 * Returns null if the verb or form cannot be determined.
 */
export function conjugateVerb(dict: string, form: ConjFormId): string | null {
  if (!dict || dict.length < 2) return null;

  // Full irregular lookup first
  const irr = IRREGULARS[dict];
  if (irr?.[form] !== undefined) return irr[form]!;

  // plain_present is always just the dictionary form
  if (form === "plain_present") return dict;

  // beki always attaches to dict + べきです
  if (form === "beki") return dict + "べきです";

  if (isIchidan(dict)) {
    const stem = dict.slice(0, -1);
    switch (form) {
      case "polite_present":        return stem + "ます";
      case "polite_negative":       return stem + "ません";
      case "polite_past":           return stem + "ました";
      case "polite_past_negative":  return stem + "ませんでした";
      case "plain_negative":        return stem + "ない";
      case "plain_past":            return stem + "た";
      case "plain_past_negative":   return stem + "なかった";
      case "te_form":               return stem + "て";
      case "tai_form":              return stem + "たい";
      case "potential":             return stem + "られます";
      case "nakereba":              return stem + "なければなりません";
      default: return null;
    }
  }

  // Godan
  const final = dict.slice(-1);
  const base = dict.slice(0, -1);

  const masuKana = GODAN_MASU[final];
  if (!masuKana) return null;

  switch (form) {
    case "polite_present":        return base + masuKana + "ます";
    case "polite_negative":       return base + masuKana + "ません";
    case "polite_past":           return base + masuKana + "ました";
    case "polite_past_negative":  return base + masuKana + "ませんでした";
    case "plain_negative": {
      const negStem = GODAN_NEG_STEM[final];
      return negStem ? base + negStem + "ない" : null;
    }
    case "plain_past": {
      // Reuse plain te-form base for consistency
      const past = godanPast(dict, base, final);
      return past;
    }
    case "plain_past_negative": {
      const negStem = GODAN_NEG_STEM[final];
      return negStem ? base + negStem + "なかった" : null;
    }
    case "te_form": {
      return godanTeForm(dict, base, final);
    }
    case "tai_form": {
      return base + masuKana + "たい";
    }
    case "potential": {
      const potKana = GODAN_POTENTIAL[final];
      return potKana ? base + potKana + "ます" : null;
    }
    case "nakereba": {
      const negStem = GODAN_NEG_STEM[final];
      return negStem ? base + negStem + "なければなりません" : null;
    }
    default: return null;
  }
}

function godanTeForm(dict: string, base: string, final: string): string | null {
  // 行く is special — handled in IRREGULARS above, but als cover いく
  switch (final) {
    case "う": case "つ": case "る": return base + "って";
    case "む": case "ぬ": case "ぶ": return base + "んで";
    case "く": return base + "いて";
    case "ぐ": return base + "いで";
    case "す": return base + "して";
    default: return null;
  }
  void dict;
}

function godanPast(dict: string, base: string, final: string): string | null {
  switch (final) {
    case "う": case "つ": case "る": return base + "った";
    case "む": case "ぬ": case "ぶ": return base + "んだ";
    case "く": return base + "いた";
    case "ぐ": return base + "いだ";
    case "す": return base + "した";
    default: return null;
  }
  void dict;
}

// ---------------------------------------------------------------------------
// Distractor selection — 3 wrong same-verb forms for a MCQ
// ---------------------------------------------------------------------------

const DISTRACTOR_FORMS: Record<ConjFormId, ConjFormId[]> = {
  polite_present:       ["polite_past",          "polite_negative",      "plain_present"],
  polite_negative:      ["polite_present",        "polite_past_negative", "plain_negative"],
  polite_past:          ["polite_present",        "polite_past_negative", "plain_past"],
  polite_past_negative: ["polite_past",           "polite_negative",      "plain_past_negative"],
  plain_present:        ["plain_past",            "plain_negative",       "polite_present"],
  plain_negative:       ["plain_present",         "plain_past_negative",  "polite_negative"],
  plain_past:           ["plain_present",         "plain_past_negative",  "polite_past"],
  plain_past_negative:  ["plain_past",            "plain_negative",       "polite_past_negative"],
  te_form:              ["tai_form",              "plain_past",           "plain_negative"],
  tai_form:             ["te_form",               "plain_present",        "polite_present"],
  potential:            ["polite_present",        "tai_form",             "plain_present"],
  beki:                 ["nakereba",              "polite_present",       "tai_form"],
  nakereba:             ["beki",                  "polite_past_negative", "polite_negative"],
};

/**
 * Build 3 wrong-answer distractors for the given verb and target form.
 * Falls back to adjacent conjugations if the preferred distractor set
 * produces collisions or nulls.
 */
export function buildVerbDistractors(dict: string, targetForm: ConjFormId): string[] {
  const correct = conjugateVerb(dict, targetForm);
  const distractors: string[] = [];
  const seen = new Set<string>(correct ? [correct] : []);

  for (const form of DISTRACTOR_FORMS[targetForm]) {
    if (distractors.length >= 3) break;
    const val = conjugateVerb(dict, form);
    if (!val || seen.has(val)) continue;
    seen.add(val);
    distractors.push(val);
  }

  // Fallback: try all remaining forms if we still need more
  if (distractors.length < 3) {
    const allForms = Object.keys(DISTRACTOR_FORMS) as ConjFormId[];
    for (const form of allForms) {
      if (distractors.length >= 3) break;
      if (form === targetForm) continue;
      const val = conjugateVerb(dict, form);
      if (!val || seen.has(val)) continue;
      seen.add(val);
      distractors.push(val);
    }
  }

  return distractors;
}
