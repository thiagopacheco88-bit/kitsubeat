/**
 * Exercise Question Generator
 *
 * Pure functions — no side effects, no network calls, no DB access.
 * Transforms lesson vocabulary into shuffled, typed questions with
 * intelligent distractor selection.
 */

import { localize } from "@/lib/types/lesson";
import type {
  GrammarPoint,
  KanjiBreakdown,
  Lesson,
  Localizable,
  VocabEntry,
  Verse,
  Token,
} from "@/lib/types/lesson";
import {
  pickConjugationOptions,
  stripGloss,
  V1_CONJUGATION_FORMS,
  classifyConjugationForm,
} from "./conjugation";
import { parseConjugationPath } from "../../../scripts/lib/conjugation-audit";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExerciseType =
  | "vocab_meaning"
  | "meaning_vocab"
  | "reading_match"
  | "fill_lyric"
  | "grammar_conjugation"  // Ex 5 — Grammar Conjugation
  | "listening_drill"      // Ex 6 — Listening Drill (drives Star 3)
  | "sentence_order";      // Ex 7 — Sentence Order

/**
 * Minimal vocab representation for tier-aware rendering in exercise UI.
 * Extracted from VocabEntry so renderer components don't depend on the full
 * lesson type tree.
 */
export interface VocabInfo {
  surface: string;
  reading: string;
  romaji: string;
  /** vocab_item_id UUID — optional for legacy data; required for mastery popovers */
  vocab_item_id?: string;
}

export interface Question {
  /** UUID for deduplication */
  id: string;
  type: ExerciseType;
  /** vocab_item_id from VocabEntry */
  vocabItemId: string;
  /** What to show the user */
  prompt: string;
  /** The right answer */
  correctAnswer: string;
  /** Exactly 3 wrong answers */
  distractors: string[];
  /** Inline 1-2 sentence teacher-like explanation */
  explanation: string;
  /** Detailed explanation for the "More" panel */
  detailedExplanation?: string;
  /** Phase 08.3: memory mnemonic for the target vocab (nullable). */
  mnemonic?: Localizable;
  /** Phase 08.3: per-character kanji breakdown for the target vocab (null for kana-only). */
  kanji_breakdown?: KanjiBreakdown | null;
  /** For Fill-the-Lyric: the verse reference for audio seek */
  verseRef?: {
    verseNumber: number;
    startMs: number;
  };
  /**
   * VocabInfo for the target word — used by TierText for tier-aware rendering.
   * Populated for all question types.
   */
  vocabInfo: VocabInfo;
  /**
   * Map from distractor surface string → VocabInfo for distractor vocab.
   * Populated for meaning_vocab and fill_lyric (where options are vocab surfaces).
   * Used by TierText to render distractor options with the correct VocabInfo,
   * and by FeedbackPanel to show the mastery popover for wrong-pick distractors.
   */
  distractorVocab?: Record<string, VocabInfo>;

  /** Grammar Conjugation: base (dictionary) form shown as scaffold above the blanked verse. */
  conjugationBase?: string;
  /** Listening Drill: verse start time for PlayerContext.seekTo() + playVideo(). */
  verseStartMs?: number;
  /** Listening Drill blanked rendering + Sentence Order pool of tokens. */
  verseTokens?: Token[];
  /** Sentence Order: "Show hint" reveal target (English translation of the verse). */
  translation?: string;
}

export interface SessionConfig {
  mode: "short" | "full";
  /** short = 10, full = all vocab * 4 types capped at 40 */
  targetCount: number;
}

/**
 * Sentence Order per-verse token cap (Phase 10 Plan 05, CONTEXT-locked for v1).
 *
 * Verses with more than this many tokens are excluded from Sentence Order for
 * that song (per-verse filter, not per-song gate). The `audit:verse-tokens`
 * script reports per-song eligibility against this cap. Re-tuning is a
 * one-line edit here.
 */
export const SENTENCE_ORDER_TOKEN_CAP = 12;

// ---------------------------------------------------------------------------
// Fisher-Yates shuffle (unbiased — NOT arr.sort(() => Math.random() - 0.5))
// ---------------------------------------------------------------------------

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Field extraction per exercise type
// ---------------------------------------------------------------------------

function extractField(vocab: VocabEntry, type: ExerciseType): string {
  switch (type) {
    case "vocab_meaning":
      return localize(vocab.meaning, "en");
    case "meaning_vocab":
      return vocab.surface;
    case "reading_match":
      return vocab.romaji;
    case "fill_lyric":
      return vocab.surface;
    case "grammar_conjugation":
      // Grammar Conjugation questions are not produced by the per-vocab loop
      // in buildQuestions (they come from grammar_points), so this extractor
      // is only a fallback for defensive callers.
      return vocab.surface;
    case "listening_drill":
      // Plan 10-04: options are the same 4 vocab surfaces as fill_lyric
      // (correct + 3 distractors). Mirrors fill_lyric's field extraction.
      return vocab.surface;
    case "sentence_order":
      // Plan 10-05: Sentence Order is VERSE-centric, not vocab-centric — it
      // never calls extractField in practice. The dedicated sentence-order
      // loop inside buildQuestions fabricates questions directly from verses,
      // bypassing pickDistractors (tap-to-build has no 4-option structure).
      // Kept as a throw so a misuse from a new caller fails loudly.
      throw new Error("sentence_order extractField unused — buildQuestions handles sentence-order directly");
  }
}

// ---------------------------------------------------------------------------
// Verse lookup for Fill-the-Lyric
// ---------------------------------------------------------------------------

function findVerseForVocab(
  surface: string,
  verses: Verse[]
): { verseNumber: number; startMs: number } | null {
  for (const verse of verses) {
    if (verse.start_time_ms <= 0) continue;
    // Check if any token in the verse matches the surface form
    const hasToken = verse.tokens.some((t) => t.surface === surface);
    if (hasToken) {
      return { verseNumber: verse.verse_number, startMs: verse.start_time_ms };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Distractor selection
// ---------------------------------------------------------------------------

/** Pair of distractor surface string and its VocabInfo for tier rendering */
interface DistractorEntry {
  field: string;
  vocabInfo: VocabInfo;
}

/**
 * Returns exactly 3 distractor strings.
 * Strategy:
 *   1. Draw from same-song pool (excluding the correct answer)
 *   2. If < 3, pad from jlptPool (same JLPT level, excluding correct)
 *   3. If still < 3, pad from jlptPool ignoring level (adjacent levels)
 * Deduplicates: no distractor matches correctAnswer (trim + lowercase).
 * No duplicate distractors in the returned array.
 */
export function pickDistractors(
  correct: VocabEntry,
  type: ExerciseType,
  sameSongPool: VocabEntry[],
  jlptPool: VocabEntry[]
): string[] {
  return pickDistractorsWithVocab(correct, type, sameSongPool, jlptPool).map(
    (d) => d.field
  );
}

/**
 * Extended variant of pickDistractors that also returns the VocabInfo for each
 * distractor. Used by makeQuestion to populate Question.distractorVocab so that
 * TierText can render distractor options with the correct tier-aware display.
 *
 * @internal — not exported; only used within this file.
 */
function pickDistractorsWithVocab(
  correct: VocabEntry,
  type: ExerciseType,
  sameSongPool: VocabEntry[],
  jlptPool: VocabEntry[]
): DistractorEntry[] {
  const correctField = extractField(correct, type);
  const correctNorm = correctField.trim().toLowerCase();

  const isValid = (v: VocabEntry): boolean => {
    if (v.vocab_item_id === correct.vocab_item_id) return false;
    const field = extractField(v, type).trim().toLowerCase();
    return field !== correctNorm && field.length > 0;
  };

  const toVocabInfo = (v: VocabEntry): VocabInfo => ({
    surface: v.surface,
    reading: v.reading,
    romaji: v.romaji,
    vocab_item_id: v.vocab_item_id,
  });

  // 1. Same-song candidates (excluding correct vocab entry)
  const songCandidates: DistractorEntry[] = sameSongPool
    .filter(isValid)
    .map((v) => ({ field: extractField(v, type), vocabInfo: toVocabInfo(v) }));

  // Deduplicate within candidates
  const seen = new Set<string>();
  const unique: DistractorEntry[] = [];
  for (const c of songCandidates) {
    const norm = c.field.trim().toLowerCase();
    if (!seen.has(norm)) {
      seen.add(norm);
      unique.push(c);
    }
  }

  // 2. Pad from JLPT pool (same level first)
  if (unique.length < 3) {
    const sameLevelPool = jlptPool.filter(
      (v) => v.jlpt_level === correct.jlpt_level
    );
    for (const v of sameLevelPool) {
      if (unique.length >= 3) break;
      if (!isValid(v)) continue;
      const field = extractField(v, type);
      const norm = field.trim().toLowerCase();
      if (!seen.has(norm)) {
        seen.add(norm);
        unique.push({ field, vocabInfo: toVocabInfo(v) });
      }
    }
  }

  // 3. Pad from entire JLPT pool (any level) if still < 3
  if (unique.length < 3) {
    for (const v of jlptPool) {
      if (unique.length >= 3) break;
      if (!isValid(v)) continue;
      const field = extractField(v, type);
      const norm = field.trim().toLowerCase();
      if (!seen.has(norm)) {
        seen.add(norm);
        unique.push({ field, vocabInfo: toVocabInfo(v) });
      }
    }
  }

  // Shuffle and take exactly 3 (or fewer if pool is truly too small)
  return shuffle(unique).slice(0, 3);
}

// ---------------------------------------------------------------------------
// Explanation generation
// ---------------------------------------------------------------------------

function makeExplanation(vocab: VocabEntry, type: ExerciseType): string {
  const surface = vocab.surface;
  const meaning = localize(vocab.meaning, "en");
  const romaji = vocab.romaji;

  switch (type) {
    case "vocab_meaning":
      return `「${surface}」(${romaji}) means "${meaning}".`;
    case "meaning_vocab":
      return `"${meaning}" is written as 「${surface}」 (${romaji}).`;
    case "reading_match":
      return `「${surface}」is read as "${romaji}".`;
    case "fill_lyric":
      return `The missing word is 「${surface}」, meaning "${meaning}" (${romaji}).`;
    case "grammar_conjugation":
      // Explanation is generated alongside the question in the grammar-points
      // loop inside buildQuestions; this branch is the fallback when a caller
      // asks for a generic explanation from just the target vocab.
      return `「${surface}」 is the base form; select the correct conjugation for this verse.`;
    case "listening_drill":
      // Plan 10-04: mirrors fill_lyric — user heard the verse and needs to
      // identify the blanked surface. The explanation surfaces the answer
      // plus its meaning and reading (same framing as fill_lyric).
      return `The missing word is 「${surface}」, meaning "${meaning}" (${romaji}).`;
    case "sentence_order":
      // Plan 10-05: unused — the sentence-order loop in buildQuestions
      // generates the explanation inline (no vocab-centric framing).
      throw new Error("sentence_order makeExplanation unused — explanation is generated inline in buildQuestions");
  }
}

function makeDetailedExplanation(vocab: VocabEntry): string | undefined {
  const parts: string[] = [];
  if (vocab.example_from_song) {
    parts.push(`Example from the song: "${vocab.example_from_song}"`);
  }
  if (vocab.additional_examples && vocab.additional_examples.length > 0) {
    parts.push(`Additional example: "${vocab.additional_examples[0]}"`);
  }
  return parts.length > 0 ? parts.join(" ") : undefined;
}

// ---------------------------------------------------------------------------
// Single question factory
// ---------------------------------------------------------------------------

function makeQuestion(
  vocab: VocabEntry,
  type: ExerciseType,
  distractors: string[],
  verses: Verse[],
  distractorVocabEntries?: DistractorEntry[]
): Question | null {
  const surface = vocab.surface;
  const meaning = localize(vocab.meaning, "en");

  let prompt: string;
  let correctAnswer: string;
  let verseRef: Question["verseRef"] | undefined;
  // Phase 10 Plan 04 — Listening Drill carries the verse start time and token
  // list so ListeningDrillCard can blank the target surface + romaji.
  let verseStartMs: number | undefined;
  let verseTokens: Token[] | undefined;

  switch (type) {
    case "vocab_meaning":
      prompt =
        vocab.reading && vocab.reading !== surface
          ? `${surface} (${vocab.reading})`
          : surface;
      correctAnswer = meaning;
      break;
    case "meaning_vocab":
      prompt = meaning;
      correctAnswer = surface;
      break;
    case "reading_match":
      prompt = surface;
      correctAnswer = vocab.romaji;
      break;
    case "fill_lyric": {
      const ref = findVerseForVocab(surface, verses);
      if (!ref) return null; // No timed verse found for this word
      verseRef = ref;
      // Find the verse text and blank the surface form
      const verse = verses.find((v) => v.verse_number === ref.verseNumber)!;
      const verseText = verse.tokens.map((t) => t.surface).join("");
      prompt = verseText.replace(surface, "_____");
      correctAnswer = surface;
      break;
    }
    case "grammar_conjugation": {
      // Grammar Conjugation questions are built by a dedicated helper
      // (makeGrammarConjugationQuestion) called from buildQuestions with
      // (vocab, grammarPoint, jlptPool) context. This switch arm exists only
      // so TypeScript exhaustiveness holds when makeQuestion is invoked with a
      // grammar_conjugation type from a unit test or future ad-hoc caller.
      // It builds a degraded question with no distractor set (caller must
      // prefer makeGrammarConjugationQuestion for real data).
      prompt = surface;
      correctAnswer = surface;
      break;
    }
    case "listening_drill": {
      // Plan 10-04 — Listening Drill.
      //
      // Mirrors fill_lyric's verse-blank selection (findVerseForVocab requires
      // start_time_ms > 0). The card plays the verse audio via the
      // PlayerContext imperative API (Plan 10-02) and shows the verse text
      // with the target surface AND its romaji blanked.
      //
      // Returns null when the vocab has no timed verse (same semantics as
      // fill_lyric) so buildQuestions skips cleanly.
      const ref = findVerseForVocab(surface, verses);
      if (!ref) return null;
      verseRef = ref;
      const verse = verses.find((v) => v.verse_number === ref.verseNumber)!;
      verseStartMs = ref.startMs;
      verseTokens = verse.tokens;
      // Prompt is a visual cue for the card header (the card itself renders
      // the blanked verse inline via verseTokens + correctAnswer).
      prompt = "Listen to the verse — what's the missing word?";
      correctAnswer = surface;
      break;
    }
    case "sentence_order":
      // Plan 10-05: unused — the sentence-order loop in buildQuestions
      // fabricates verse-centric questions directly. makeQuestion is keyed
      // off a VocabEntry + type, which doesn't fit Sentence Order's
      // per-verse model. Kept as a defensive throw.
      throw new Error("sentence_order makeQuestion unused — buildQuestions runs its own sentence-order loop");
  }

  // Build distractorVocab map (field → VocabInfo) for TierText rendering
  // and FeedbackPanel mastery popovers (meaning_vocab and fill_lyric options
  // are vocab surfaces; reading_match and vocab_meaning options are strings).
  const distractorVocab: Record<string, VocabInfo> | undefined =
    distractorVocabEntries
      ? Object.fromEntries(
          distractorVocabEntries.map((d) => [d.field, d.vocabInfo])
        )
      : undefined;

  const vocabInfo: VocabInfo = {
    surface: vocab.surface,
    reading: vocab.reading,
    romaji: vocab.romaji,
    vocab_item_id: vocab.vocab_item_id,
  };

  return {
    id: crypto.randomUUID(),
    type,
    vocabItemId: vocab.vocab_item_id!,
    prompt,
    correctAnswer,
    distractors,
    explanation: makeExplanation(vocab, type),
    detailedExplanation: makeDetailedExplanation(vocab),
    mnemonic: vocab.mnemonic,
    kanji_breakdown: vocab.kanji_breakdown ?? null,
    verseRef,
    vocabInfo,
    distractorVocab,
    // Phase 10 Plan 04 — undefined for all non-listening_drill types (the
    // fields are optional on Question).
    verseStartMs,
    verseTokens,
  };
}

// ---------------------------------------------------------------------------
// Phase 10-03 — Grammar Conjugation question factory (per grammar point)
// ---------------------------------------------------------------------------
//
// Grammar Conjugation questions are driven by lesson.grammar_points (one
// question per structured grammar point whose form is in V1), NOT by the
// per-vocab loop. The factory here returns null for:
//   - Unstructured grammar points (9% — skipped cleanly per CONTEXT).
//   - Grammar points whose classified form isn't in V1_CONJUGATION_FORMS.
//   - Grammar points whose target-verse-surface isn't in a timed verse
//     (reuses fill_lyric verse-blank pattern; no timed verse = no verse prompt).
//   - Cases where pickConjugationOptions can't assemble 3 distractors.
//
// Caller (buildQuestions) iterates all grammar points and pushes non-null
// questions. Songs whose grammar points yield zero structured conjugations
// simply contribute zero grammar_conjugation questions — no throw.

function makeGrammarConjugationQuestion(
  grammarPoint: GrammarPoint,
  vocabulary: VocabEntry[],
  verses: Verse[],
  jlptPool: VocabEntry[],
): Question | null {
  const parsed = parseConjugationPath(grammarPoint.conjugation_path);
  if (!parsed || !parsed.is_structured) return null;

  const form = classifyConjugationForm(parsed);
  if (!V1_CONJUGATION_FORMS.includes(form)) return null;

  const base = stripGloss(parsed.base);
  const conjugatedSurface = stripGloss(parsed.conjugated);
  if (!base || !conjugatedSurface) return null;

  // Find the verse containing the conjugated surface so we can render a
  // verse-blank prompt (fill_lyric pattern). Skip if none is timed.
  const ref = findVerseForVocab(conjugatedSurface, verses);
  if (!ref) return null;
  const verse = verses.find((v) => v.verse_number === ref.verseNumber)!;
  const verseText = verse.tokens.map((t) => t.surface).join("");

  // Match the target vocab entry by base surface. The vocab may not be
  // present (grammar points can reference verbs that weren't added to the
  // vocab list); in that case fall back to a synthetic VocabEntry so
  // pickConjugationOptions has a valid target to diff against.
  const targetVocab: VocabEntry = vocabulary.find(
    (v) => stripGloss(v.surface) === base || v.surface === base,
  ) ?? {
    surface: base,
    reading: base,
    romaji: "",
    part_of_speech: "verb",
    jlpt_level: "unknown",
    meaning: { en: base },
    example_from_song: "",
    additional_examples: [],
  };

  const opts = pickConjugationOptions({
    targetVocab,
    grammarPoint,
    sameJlptPool: jlptPool,
  });
  if (!opts) return null;

  const prompt = verseText.replace(conjugatedSurface, "_____");

  const vocabInfo: VocabInfo = {
    surface: targetVocab.surface,
    reading: targetVocab.reading,
    romaji: targetVocab.romaji,
    vocab_item_id: targetVocab.vocab_item_id,
  };

  return {
    id: crypto.randomUUID(),
    type: "grammar_conjugation",
    // vocab_item_id is the per-vocab mastery anchor. Use the matched vocab's
    // UUID when available; otherwise emit empty-string (Plan 10-06
    // saveSessionResults must skip mastery writes when vocabItemId === "",
    // same sentinel used for sentence_order).
    vocabItemId: targetVocab.vocab_item_id ?? "",
    prompt,
    correctAnswer: opts.correct,
    distractors: opts.distractors,
    explanation: `「${opts.base}」 conjugates to 「${opts.correct}」 (${opts.form.replace(/_/g, " ")}) in this verse.`,
    conjugationBase: opts.base,
    verseRef: ref,
    vocabInfo,
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Build a shuffled list of exercise questions from a lesson.
 *
 * @param lesson     - The lesson data (vocabulary + verses)
 * @param mode       - "short" (10 questions) or "full" (all*4 capped at 40)
 * @param jlptPool   - Same-JLPT-level vocabulary from vocabGlobal for distractor fallback
 * @param typeFilter - Phase 10 Plan 06: optional allowlist of ExerciseTypes to emit.
 *                     When provided, the per-vocab loop and the per-verse /
 *                     per-grammar-point loops each consult this set and skip
 *                     types that aren't in the allowlist. Used by the Practice
 *                     tab's "Advanced Drills" mode to emit ONLY Ex 5/6/7 —
 *                     passing ["grammar_conjugation", "listening_drill",
 *                     "sentence_order"] produces a session whose questions are
 *                     drawn exclusively from Plans 10-03/04/05. Omitted (or
 *                     undefined) preserves the pre-Plan-06 behavior: Ex 1-4 +
 *                     Ex 5-7 all emit where eligible.
 */
export function buildQuestions(
  lesson: Lesson,
  mode: SessionConfig["mode"],
  jlptPool: VocabEntry[],
  typeFilter?: ExerciseType[]
): Question[] {
  // Only include vocab entries with a UUID identity
  const base = lesson.vocabulary.filter((v) => v.vocab_item_id);

  // Phase 10 Plan 06 — when a typeFilter is provided, the allowlist is the sole
  // authority for which types get emitted. Using a Set keeps the per-iteration
  // cost O(1) regardless of typeFilter length.
  const typeAllowlist = typeFilter ? new Set<ExerciseType>(typeFilter) : null;
  const typeAllowed = (t: ExerciseType): boolean =>
    typeAllowlist === null || typeAllowlist.has(t);

  const ALL_VOCAB_LOOP_TYPES: ExerciseType[] = [
    "vocab_meaning",
    "meaning_vocab",
    "reading_match",
    "fill_lyric",
    // Phase 10 Plan 04 — Listening Drill. Only emitted when at least one verse
    // has start_time_ms > 0 (makeQuestion returns null for vocab whose surface
    // doesn't appear in a timed verse, matching fill_lyric's skip semantics).
    "listening_drill",
  ];
  const types: ExerciseType[] = ALL_VOCAB_LOOP_TYPES.filter(typeAllowed);

  // Plan 10-04: clean-skip heuristic for songs with no timing data at all —
  // avoids looping through the generator when every listening_drill attempt
  // would return null anyway. Same guard shape as fill_lyric's length check.
  const hasTimedVerses = lesson.verses.some((v) => v.start_time_ms > 0);

  const questions: Question[] = [];

  for (const vocab of base) {
    for (const type of types) {
      // fill_lyric + listening_drill require at least 3 vocab entries (to form
      // 4 distinct options).
      if ((type === "fill_lyric" || type === "listening_drill") && base.length < 3) continue;
      // Listening Drill also requires at least one timed verse — otherwise the
      // card cannot seek/play and the drill is unwinnable.
      if (type === "listening_drill" && !hasTimedVerses) continue;

      const distractorEntries = pickDistractorsWithVocab(vocab, type, base, jlptPool);
      const distractors = distractorEntries.map((d) => d.field);
      const question = makeQuestion(vocab, type, distractors, lesson.verses, distractorEntries);
      if (question) {
        questions.push(question);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Phase 10 Plan 05 — Sentence Order questions (verse-centric, per-verse).
  //
  // One question per verse whose tokens.length <= SENTENCE_ORDER_TOKEN_CAP
  // (12, CONTEXT-locked). Over-cap verses are skipped cleanly (per-verse
  // filter, not per-song gate — a song with some short + some long verses
  // still produces sentence_order questions for the short ones).
  //
  // Options/distractors don't apply (tap-to-build has no 4-option structure).
  // The pool IS the verse's shuffled tokens, generated at render time by
  // SentenceOrderCard + the session store's initSentenceOrder action.
  //
  // If a song has zero eligible verses, buildQuestions emits zero
  // sentence_order questions (skip cleanly, no throw).
  //
  // Phase 10 Plan 06: honor the typeFilter — skip the entire loop when
  // sentence_order isn't in the allowlist. Prevents Practice-tab "Short / Full"
  // modes from accidentally getting Sentence Order questions once the
  // Advanced Drills mode wires a filter.
  // -------------------------------------------------------------------------
  if (typeAllowed("sentence_order")) {
  for (const verse of lesson.verses) {
    if (!Array.isArray(verse.tokens) || verse.tokens.length === 0) continue;
    if (verse.tokens.length > SENTENCE_ORDER_TOKEN_CAP) continue;

    const correctAnswer = verse.tokens.map((t) => t.surface).join("");
    // Translation hint target. The UI hides it by default and reveals on
    // "Show hint"; the reveal-hatch sets revealedReading=true -> FSRS rating=1
    // per the Phase 08.2-01 reveal-hatch pattern.
    const translation =
      verse.translations &&
      typeof verse.translations === "object" &&
      typeof verse.translations.en === "string"
        ? verse.translations.en
        : undefined;

    questions.push({
      id: crypto.randomUUID(),
      type: "sentence_order",
      // Sentence Order is verse-centric; there is no target vocab. Empty
      // string is a sentinel — Plan 10-06 saveSessionResults must skip
      // per-vocab mastery writes for this type.
      vocabItemId: "",
      prompt: "Tap the words in order to reconstruct the verse.",
      correctAnswer,
      distractors: [],
      explanation: `The verse reads: 「${correctAnswer}」.`,
      // vocabInfo is required on Question. Provide a minimal shape — the
      // SentenceOrderCard does NOT call TierText on a per-vocab target
      // (pool tokens render as plain surfaces).
      vocabInfo: {
        surface: correctAnswer,
        reading: correctAnswer,
        romaji: "",
      },
      verseTokens: verse.tokens,
      translation,
      verseRef:
        verse.start_time_ms > 0
          ? { verseNumber: verse.verse_number, startMs: verse.start_time_ms }
          : undefined,
    });
  }
  } // end sentence_order type-allowed guard

  // -------------------------------------------------------------------------
  // Phase 10-03 — Grammar Conjugation questions (per grammar point).
  //
  // Iterates lesson.grammar_points; each structured, V1-form-covered grammar
  // point with a timed verse hit produces one question. Unstructured grammar
  // points are skipped cleanly (CONTEXT-locked — 9% of catalog has
  // pattern-label paths; they do not emit Grammar Conjugation questions).
  //
  // Phase 10 Plan 06: honor the typeFilter — skip the entire grammar-points
  // loop when grammar_conjugation isn't in the allowlist.
  // -------------------------------------------------------------------------
  if (typeAllowed("grammar_conjugation")) {
    for (const gp of lesson.grammar_points ?? []) {
      const q = makeGrammarConjugationQuestion(gp, base, lesson.verses, jlptPool);
      if (q) questions.push(q);
    }
  }

  const shuffled = shuffle(questions);

  const MAX_FULL = 40;
  const count =
    mode === "short"
      ? Math.min(10, shuffled.length)
      : Math.min(MAX_FULL, shuffled.length);

  return shuffled.slice(0, count);
}
