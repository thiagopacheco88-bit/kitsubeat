/**
 * conjugation.test.ts — Phase 10-03 Grammar Conjugation unit tests.
 *
 * Covers:
 *   - Classifier round-trips on canonical fixtures.
 *   - Mini-conjugator for godan + ichidan + irregulars (する / くる).
 *   - pickConjugationOptions: correct + 3 distractors with mixed strategy.
 *   - Unstructured path → null.
 *   - Form not in V1 → null.
 *   - Empty / insufficient JLPT pool → null (no "???" filler).
 *   - Distractors never include the correct answer.
 */

import { describe, it, expect } from "vitest";
import {
  V1_CONJUGATION_FORMS,
  classifyConjugationForm,
  conjugate,
  pickConjugationOptions,
  stripGloss,
} from "../conjugation";
import type { GrammarPoint, VocabEntry } from "@/lib/types/lesson";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeVocab(overrides: Partial<VocabEntry> & { surface: string }): VocabEntry {
  return {
    surface: overrides.surface,
    reading: overrides.reading ?? overrides.surface,
    romaji: overrides.romaji ?? `romaji_${overrides.surface}`,
    part_of_speech: overrides.part_of_speech ?? "verb",
    jlpt_level: overrides.jlpt_level ?? "N5",
    meaning: overrides.meaning ?? `meaning_${overrides.surface}`,
    example_from_song: "",
    additional_examples: [],
    vocab_item_id: overrides.vocab_item_id ?? `uuid-${overrides.surface}`,
  };
}

function makeGP(conjugation_path: string): GrammarPoint {
  return {
    name: "test-gp",
    jlpt_reference: "N5",
    explanation: "test",
    conjugation_path,
  };
}

// ---------------------------------------------------------------------------
// V1 list sanity
// ---------------------------------------------------------------------------

describe("V1_CONJUGATION_FORMS", () => {
  it("is a non-empty list of coarse form names", () => {
    expect(V1_CONJUGATION_FORMS.length).toBeGreaterThan(0);
    expect(V1_CONJUGATION_FORMS).toEqual(
      expect.arrayContaining(["past_affirmative", "te_form", "negative", "tai_form"]),
    );
  });
});

// ---------------------------------------------------------------------------
// stripGloss + classifier
// ---------------------------------------------------------------------------

describe("stripGloss", () => {
  it("strips parenthetical ASCII gloss after the Japanese part", () => {
    expect(stripGloss("食べた (tabeta, 'ate')")).toBe("食べた");
  });
  it("leaves plain Japanese untouched", () => {
    expect(stripGloss("食べた")).toBe("食べた");
  });
  it("splits on slash too (multi-example)", () => {
    expect(stripGloss("食べた / 飲んだ")).toBe("食べた");
  });
});

describe("classifyConjugationForm", () => {
  it("classifies past_affirmative from -た ending", () => {
    expect(
      classifyConjugationForm({
        base: "食べる",
        conjugated: "食べた (tabeta)",
        conjugation_type: "past tense",
        is_structured: true,
      }),
    ).toBe("past_affirmative");
  });

  it("classifies te_form from -て ending", () => {
    expect(
      classifyConjugationForm({
        base: "食べる",
        conjugated: "食べて (tabete, te-form)",
        conjugation_type: "te-form",
        is_structured: true,
      }),
    ).toBe("te_form");
  });

  it("classifies negative from -ない ending", () => {
    expect(
      classifyConjugationForm({
        base: "食べる",
        conjugated: "食べない (tabenai)",
        conjugation_type: "negative",
        is_structured: true,
      }),
    ).toBe("negative");
  });

  it("classifies tai_form from -たい ending", () => {
    expect(
      classifyConjugationForm({
        base: "食べる",
        conjugated: "食べたい (tabetai, 'want to eat')",
        conjugation_type: "want",
        is_structured: true,
      }),
    ).toBe("tai_form");
  });

  it("classifies past_negative from -なかった ending", () => {
    expect(
      classifyConjugationForm({
        base: "食べる",
        conjugated: "食べなかった",
        conjugation_type: "past negative",
        is_structured: true,
      }),
    ).toBe("past_negative");
  });
});

// ---------------------------------------------------------------------------
// Mini-conjugator
// ---------------------------------------------------------------------------

describe("conjugate — ichidan verbs", () => {
  it("食べる → past_affirmative = 食べた", () => {
    expect(conjugate("食べる", "past_affirmative")).toBe("食べた");
  });
  it("食べる → te_form = 食べて", () => {
    expect(conjugate("食べる", "te_form")).toBe("食べて");
  });
  it("食べる → negative = 食べない", () => {
    expect(conjugate("食べる", "negative")).toBe("食べない");
  });
  it("食べる → tai_form = 食べたい", () => {
    expect(conjugate("食べる", "tai_form")).toBe("食べたい");
  });
  it("食べる → past_negative = 食べなかった", () => {
    expect(conjugate("食べる", "past_negative")).toBe("食べなかった");
  });
});

describe("conjugate — godan verbs", () => {
  it("飲む → past_affirmative = 飲んだ", () => {
    expect(conjugate("飲む", "past_affirmative")).toBe("飲んだ");
  });
  it("飲む → te_form = 飲んで", () => {
    expect(conjugate("飲む", "te_form")).toBe("飲んで");
  });
  it("飲む → negative = 飲まない", () => {
    expect(conjugate("飲む", "negative")).toBe("飲まない");
  });
  it("書く → past_affirmative = 書いた", () => {
    expect(conjugate("書く", "past_affirmative")).toBe("書いた");
  });
  it("話す → te_form = 話して", () => {
    expect(conjugate("話す", "te_form")).toBe("話して");
  });
});

describe("conjugate — irregulars する / くる / 行く", () => {
  it("する → past_affirmative = した", () => {
    expect(conjugate("する", "past_affirmative")).toBe("した");
  });
  it("する → te_form = して", () => {
    expect(conjugate("する", "te_form")).toBe("して");
  });
  it("する → negative = しない", () => {
    expect(conjugate("する", "negative")).toBe("しない");
  });
  it("くる → past_affirmative = きた", () => {
    expect(conjugate("くる", "past_affirmative")).toBe("きた");
  });
  it("くる → negative = こない", () => {
    expect(conjugate("くる", "negative")).toBe("こない");
  });
  it("行く → te_form = 行って (NOT 行いて)", () => {
    expect(conjugate("行く", "te_form")).toBe("行って");
  });
});

// ---------------------------------------------------------------------------
// pickConjugationOptions
// ---------------------------------------------------------------------------

// Pool of same-JLPT verbs used by "alternate verbs in target form" distractors.
const JLPT_POOL: VocabEntry[] = [
  makeVocab({ surface: "飲む", reading: "のむ", part_of_speech: "verb" }),
  makeVocab({ surface: "書く", reading: "かく", part_of_speech: "verb" }),
  makeVocab({ surface: "話す", reading: "はなす", part_of_speech: "verb" }),
  makeVocab({ surface: "見る", reading: "みる", part_of_speech: "verb" }),
  // A non-verb that must be skipped
  makeVocab({ surface: "本", reading: "ほん", part_of_speech: "noun" }),
];

describe("pickConjugationOptions — structured past_affirmative (食べる → 食べた)", () => {
  const target = makeVocab({ surface: "食べる", reading: "たべる", part_of_speech: "verb" });
  const gp = makeGP("食べる (taberu, 'to eat') → 食べた (tabeta, 'ate')");

  it("returns correct + 3 distractors + base + form", () => {
    const res = pickConjugationOptions({
      targetVocab: target,
      grammarPoint: gp,
      sameJlptPool: JLPT_POOL,
    });
    expect(res).not.toBeNull();
    expect(res!.correct).toBe("食べた");
    expect(res!.base).toBe("食べる");
    expect(res!.form).toBe("past_affirmative");
    expect(res!.distractors).toHaveLength(3);
    // First distractor is the same-verb adjacent (opposite polarity)
    expect(res!.distractors[0]).toBe("食べなかった");
  });

  it("distractors never include the correct answer", () => {
    const res = pickConjugationOptions({
      targetVocab: target,
      grammarPoint: gp,
      sameJlptPool: JLPT_POOL,
    });
    expect(res).not.toBeNull();
    expect(res!.distractors).not.toContain(res!.correct);
  });

  it("distractors are unique", () => {
    const res = pickConjugationOptions({
      targetVocab: target,
      grammarPoint: gp,
      sameJlptPool: JLPT_POOL,
    });
    expect(res).not.toBeNull();
    const set = new Set(res!.distractors);
    expect(set.size).toBe(res!.distractors.length);
  });

  it("alternate-verb distractors are conjugated to the target form", () => {
    const res = pickConjugationOptions({
      targetVocab: target,
      grammarPoint: gp,
      sameJlptPool: JLPT_POOL,
    });
    expect(res).not.toBeNull();
    // Skip the first distractor (same-verb wrong); remaining 2 are alternate verbs.
    const altDistractors = res!.distractors.slice(1);
    // Every alternate distractor ends with た/だ (past_affirmative suffix).
    for (const d of altDistractors) {
      expect(d).toMatch(/[たた|だ]$/);
    }
  });
});

describe("pickConjugationOptions — unstructured path returns null", () => {
  it("returns null for pattern-label grammar point", () => {
    const target = makeVocab({ surface: "食べる", part_of_speech: "verb" });
    const gp = makeGP("〜ている");
    const res = pickConjugationOptions({
      targetVocab: target,
      grammarPoint: gp,
      sameJlptPool: JLPT_POOL,
    });
    expect(res).toBeNull();
  });

  it("returns null for dictionary-form-label-first grammar point", () => {
    const target = makeVocab({ surface: "食べる", part_of_speech: "verb" });
    const gp = makeGP("dictionary form → te-form");
    const res = pickConjugationOptions({
      targetVocab: target,
      grammarPoint: gp,
      sameJlptPool: JLPT_POOL,
    });
    expect(res).toBeNull();
  });
});

describe("pickConjugationOptions — form not in V1 returns null", () => {
  it("returns null for shimau compound (not in V1)", () => {
    const target = makeVocab({ surface: "知る", part_of_speech: "verb" });
    const gp = makeGP(
      "知る (shiru) → 知って (shitte) → 知ってしまった (shitte shimatta, 'ended up knowing')",
    );
    const res = pickConjugationOptions({
      targetVocab: target,
      grammarPoint: gp,
      sameJlptPool: JLPT_POOL,
    });
    expect(res).toBeNull();
  });
});

describe("pickConjugationOptions — insufficient pool returns null (no filler)", () => {
  it("returns null when sameJlptPool has zero verbs", () => {
    const target = makeVocab({ surface: "食べる", part_of_speech: "verb" });
    const gp = makeGP("食べる (taberu) → 食べた (tabeta)");
    const res = pickConjugationOptions({
      targetVocab: target,
      grammarPoint: gp,
      sameJlptPool: [],
    });
    expect(res).toBeNull();
  });

  it("returns null when sameJlptPool has only 1 eligible verb", () => {
    const target = makeVocab({ surface: "食べる", part_of_speech: "verb" });
    const gp = makeGP("食べる (taberu) → 食べた (tabeta)");
    const res = pickConjugationOptions({
      targetVocab: target,
      grammarPoint: gp,
      sameJlptPool: [
        makeVocab({ surface: "飲む", part_of_speech: "verb" }),
      ],
    });
    expect(res).toBeNull();
  });
});

describe("pickConjugationOptions — irregular verb target する", () => {
  it("returns conjugated forms via irregular table", () => {
    const target = makeVocab({ surface: "する", reading: "する", part_of_speech: "verb" });
    const gp = makeGP("する (suru, 'to do') → した (shita, 'did')");
    const res = pickConjugationOptions({
      targetVocab: target,
      grammarPoint: gp,
      sameJlptPool: JLPT_POOL,
    });
    expect(res).not.toBeNull();
    expect(res!.correct).toBe("した");
    expect(res!.base).toBe("する");
    // Same-verb wrong is past_negative → しなかった
    expect(res!.distractors[0]).toBe("しなかった");
  });
});
