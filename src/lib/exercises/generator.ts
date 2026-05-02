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
// Phase 11.6 Plan 04: lag-test scheduler + JLPT sort + kanji codepoint helper
import { buildSessionSequence, sortByJlpt, type SessionItem } from "./scheduler";
import { hasKanji } from "./kanji";

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
  | "sentence_order"       // Ex 7 — Sentence Order
  | "vocab_typed";         // Phase 11.6 SPEC-REQ-7 — Kanji track romaji typed input

// ---------------------------------------------------------------------------
// Phase 11.6 — Track kinds + length modes (SPEC-REQ-3, SPEC-REQ-7, SPEC-REQ-12)
// ---------------------------------------------------------------------------

export type TrackKind = "vocab" | "grammar" | "kanji" | "advanced_drills";
export type LengthMode = "short" | "long";

// CONTEXT D-20: lengthCap per LengthMode
const LENGTH_CAP: Record<LengthMode, number> = { short: 10, long: 25 };

// CONTEXT D-18: minIntroToTestGap is 3 (strict invariant)
const MIN_INTRO_TO_TEST_GAP = 3;

// SPEC R3: which exercise types are eligible per track
//
// fill_lyric is intentionally OMITTED from the Vocab track — it requires
// per-verse vocabulary domination as a prerequisite (open: redesign as a
// "victory lap" exercise that emits only after verse_domination=true and
// renders the verse in romaji with translation visible). Until then, it
// stays available only in advanced_drills.
//
// reading_match (kanji surface → pick romaji) is a kanji-recognition test
// and belongs in the Kanji track, NOT the Vocab track. The Vocab track is
// romaji ↔ meaning recognition only.
const TRACK_TYPES: Record<TrackKind, ExerciseType[]> = {
  vocab: ["vocab_meaning", "meaning_vocab"],
  grammar: ["grammar_conjugation"],
  kanji: ["vocab_typed", "reading_match"],
  advanced_drills: [
    "vocab_meaning",
    "meaning_vocab",
    "vocab_typed",
    "grammar_conjugation",
    "listening_drill",
    "sentence_order",
  ],
};

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
  /** Phase 11.6: JLPT level of the target vocab (for lag-test JLPT sort). Null for non-vocab questions. */
  jlpt_level?: "N5" | "N4" | "N3" | "N2" | "N1" | null;
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
  /** Phase 11.4: Unsplash CDN URL for the target vocab; absent when no image curated. */
  image_url?: string;
  /** Phase 11.4: English meaning string, pre-resolved by page.tsx via localize(meaning, 'en'). Used for <img alt> per D-08. */
  meaning_en?: string;
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
    case "vocab_typed":
      // Phase 11.6: vocab_typed is a typed-input exercise (no MC distractors).
      // extractField returns the romaji reading used as the correct answer.
      return vocab.reading;
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
    case "vocab_typed":
      // Phase 11.6: typed romaji input exercise — explanation shows the correct reading.
      return `「${surface}」 is read as "${romaji}". Type the romaji reading.`;
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
    case "vocab_typed":
      // Phase 11.6: vocab_typed is handled by makeVocabTypedQuestion; this
      // branch covers ad-hoc callers invoking makeQuestion directly with vocab_typed.
      prompt = vocab.surface;
      correctAnswer = vocab.reading;
      break;
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
    image_url: vocab.image_url,
    meaning_en: vocab.meaning_en,
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
// Phase 11.6 — vocab_typed question factory (SPEC-REQ-7)
// ---------------------------------------------------------------------------
//
// Builds a Question where correctAnswer is the romaji reading.
// Distractors are empty — this is a typed input exercise, not multiple-choice.
// The romajiEquals comparator from romaji-normalize.ts runs at submit time.

function makeVocabTypedQuestion(vocab: VocabEntry): Question {
  const vocabInfo: VocabInfo = {
    surface: vocab.surface,
    reading: vocab.reading,
    romaji: vocab.romaji,
    vocab_item_id: vocab.vocab_item_id,
  };

  return {
    id: crypto.randomUUID(),
    type: "vocab_typed",
    vocabItemId: vocab.vocab_item_id ?? "",
    jlpt_level: vocab.jlpt_level === "unknown" ? null : vocab.jlpt_level,
    prompt: vocab.surface,
    correctAnswer: vocab.reading, // romajiEquals comparator runs at submit
    distractors: [],              // typed input, no MC options
    explanation: `Type the reading of 「${vocab.surface}」 in romaji.`,
    detailedExplanation: makeDetailedExplanation(vocab),
    mnemonic: vocab.mnemonic,
    kanji_breakdown: vocab.kanji_breakdown ?? null,
    image_url: vocab.image_url,
    meaning_en: vocab.meaning_en,
    vocabInfo,
  };
}

// ---------------------------------------------------------------------------
// Phase 11.6 — buildQuestionsFromPool: new object-parameter form
// ---------------------------------------------------------------------------
//
// This overload is the Phase 11.6 entry point used by ExerciseTab when a
// trackKind is provided. It accepts a plain vocab array + verses instead of a
// full Lesson object so it can be called from the server action layer without
// materializing the full lesson shape.
//
// Input shape:
//   vocab         — eligible vocab entries (caller provides; kanji filter applied here)
//   verses        — verse list (required for fill_lyric / listening_drill; can be [])
//   grammarPoints — optional grammar points for grammar_conjugation emissions
//   jlptPool      — JLPT distractor pool (same semantics as existing buildQuestions)
//   typeFilter    — explicit allowlist (bypasses TRACK_TYPES default when provided)
//   trackKind     — Phase 11.6 track enum; drives TRACK_TYPES selection + kanji filter
//   lengthMode    — "short" (10) or "long" (25); defaults to no cap
//   dueReviews    — due-for-review items (D-19); generator caller pre-fetches
//
// Backwards compatibility: When trackKind is absent (or this overload is not
// used), the existing Lesson-based buildQuestions behavior is UNCHANGED.

export interface BuildQuestionsPoolInput {
  vocab: VocabEntry[];
  verses: Verse[];
  grammarPoints?: GrammarPoint[];
  jlptPool?: VocabEntry[];
  typeFilter?: ExerciseType[];
  trackKind?: TrackKind;
  lengthMode?: LengthMode;
  dueReviews?: VocabEntry[];
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Phase 13 — Sentence Order mastery gate.
 *
 * Ex 7 (Sentence Order) is Advanced-Drills-only and requires the learner to
 * have mastered the vocabulary of the candidate verse AND all grammar rules
 * the song teaches. The grammar half is song-level (any unmastered rule
 * blocks Ex 7 entirely); the vocab half is per-verse (verses with unmastered
 * tokens are filtered out). Both halves are computed by the ExerciseTab before
 * this generator is called.
 *
 * - `allGrammarMastered` — false = song has unmastered grammar, skip Ex 7
 *                          entirely. true = proceed to per-verse vocab gate.
 *                          Pass `true` for songs with zero grammar rules.
 * - `masteredVocabIds`   — set of vocab_item_ids at FSRS state >= 2 (Review).
 *                          Verses whose tokens are NOT all in this set are
 *                          skipped by the per-verse gate. Pass `null` to
 *                          disable the vocab gate (current behavior for
 *                          unauthenticated or legacy callers).
 */
export interface SentenceOrderGate {
  allGrammarMastered: boolean;
  masteredVocabIds: Set<string> | null;
}

export function buildQuestions(input: BuildQuestionsPoolInput): Question[];

export function buildQuestions(
  lesson: Lesson,
  mode: SessionConfig["mode"],
  jlptPool: VocabEntry[],
  typeFilter?: ExerciseType[],
  sentenceOrderGate?: SentenceOrderGate
): Question[];

/**
 * Build a shuffled list of exercise questions from a lesson.
 *
 * @param lesson             - The lesson data (vocabulary + verses)
 * @param mode               - "short" (10 questions) or "full" (all*4 capped at 40)
 * @param jlptPool           - Same-JLPT-level vocabulary from vocabGlobal for distractor fallback
 * @param typeFilter         - Optional allowlist of ExerciseTypes to emit. When
 *                             provided, the per-vocab loop and the per-verse /
 *                             per-grammar-point loops each consult this set and
 *                             skip types that aren't in the allowlist. Used by
 *                             Advanced Drills (["grammar_conjugation",
 *                             "listening_drill", "sentence_order"]) and Quick /
 *                             Full Practice (vocab-only). Omitted preserves
 *                             the pre-Phase-13 behavior: Ex 1-4 + Ex 5-7 all
 *                             emit where eligible.
 * @param sentenceOrderGate  - Phase 13: mastery gate for Ex 7. Pass from
 *                             ExerciseTab after fetching user vocab + grammar
 *                             mastery. Omitted = gate disabled (legacy).
 */
export function buildQuestions(
  lessonOrInput: Lesson | BuildQuestionsPoolInput,
  mode?: SessionConfig["mode"],
  jlptPool?: VocabEntry[],
  typeFilter?: ExerciseType[],
  sentenceOrderGate?: SentenceOrderGate
): Question[] {
  // ---------------------------------------------------------------------------
  // Phase 11.6 pool-based overload dispatch
  // When first arg has a `vocab` property it is a BuildQuestionsPoolInput.
  // ---------------------------------------------------------------------------
  if ("vocab" in lessonOrInput) {
    return buildQuestionsFromPool(lessonOrInput);
  }

  // ---------------------------------------------------------------------------
  // Legacy Lesson-based path (backwards compatible)
  // ---------------------------------------------------------------------------
  const lesson = lessonOrInput as Lesson;
  const resolvedMode = mode ?? "short";
  const resolvedJlptPool = jlptPool ?? [];

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

      const distractorEntries = pickDistractorsWithVocab(vocab, type, base, resolvedJlptPool);
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
  // Phase 13 song-level grammar gate — if the learner has any unmastered
  // grammar rule for this song, Ex 7 is entirely skipped. When the gate is
  // absent, allGrammarMastered defaults to true (legacy behavior).
  const grammarGateOpen = sentenceOrderGate?.allGrammarMastered ?? true;
  const vocabGateSet = sentenceOrderGate?.masteredVocabIds ?? null;
  if (!grammarGateOpen) {
    // Skip the whole Ex 7 loop — the learner hasn't earned it yet.
  } else {
  const verseVocabByToken = (() => {
    // Build a surface → vocab_item_id lookup from the lesson's vocabulary so we
    // can gate per-verse without expanding tokens with their own ids. Tokens
    // without a matching vocab entry (particles, kana-only) are treated as
    // always-mastered — the gate only blocks on content words.
    const map = new Map<string, string | undefined>();
    for (const v of lesson.vocabulary) {
      if (!map.has(v.surface)) map.set(v.surface, v.vocab_item_id);
    }
    return map;
  })();

  for (const verse of lesson.verses) {
    if (!Array.isArray(verse.tokens) || verse.tokens.length === 0) continue;
    if (verse.tokens.length > SENTENCE_ORDER_TOKEN_CAP) continue;

    // Phase 13 per-verse vocab gate — every content-word token in the verse
    // must map to a vocab_item_id that is in masteredVocabIds. Particles / kana
    // tokens (no vocab_item_id) pass through.
    if (vocabGateSet) {
      const allTokensMastered = verse.tokens.every((t) => {
        const id = verseVocabByToken.get(t.surface);
        if (!id) return true; // not a tracked vocab item
        return vocabGateSet.has(id);
      });
      if (!allTokensMastered) continue;
    }

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
  } // end grammarGateOpen else-branch (Phase 13)
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
      const q = makeGrammarConjugationQuestion(gp, base, lesson.verses, resolvedJlptPool);
      if (q) questions.push(q);
    }
  }

  const shuffled = shuffle(questions);

  const MAX_FULL = 40;
  const count =
    resolvedMode === "short"
      ? Math.min(10, shuffled.length)
      : Math.min(MAX_FULL, shuffled.length);

  return shuffled.slice(0, count);
}

// ---------------------------------------------------------------------------
// Phase 11.6 — buildQuestionsFromPool (pool-based overload implementation)
// ---------------------------------------------------------------------------
//
// Implements the new object-parameter form of buildQuestions. Called when
// the caller passes a BuildQuestionsPoolInput. All Phase 11.6 track logic
// lives here; the Lesson-based path above is unchanged.

function buildQuestionsFromPool(input: BuildQuestionsPoolInput): Question[] {
  const {
    vocab,
    verses,
    grammarPoints = [],
    jlptPool = [],
    typeFilter,
    trackKind,
    lengthMode,
    dueReviews = [],
  } = input;

  // Only include vocab entries with a UUID identity
  const baseVocab = vocab.filter((v) => v.vocab_item_id);

  // -------------------------------------------------------------------------
  // Step 1: Filter vocab pool based on trackKind
  // Kanji track: only kanji-bearing vocab (SPEC R3)
  // -------------------------------------------------------------------------
  let eligibleVocab = baseVocab;
  if (trackKind === "kanji") {
    eligibleVocab = eligibleVocab.filter((v) => hasKanji(v.surface));
  }

  // -------------------------------------------------------------------------
  // Step 2: Determine effective type filter
  // typeFilter param takes precedence; otherwise TRACK_TYPES drives selection
  // -------------------------------------------------------------------------
  const trackTypes = trackKind ? TRACK_TYPES[trackKind] : null;
  const effectiveTypes = typeFilter
    ? new Set<ExerciseType>(typeFilter)
    : trackTypes
    ? new Set<ExerciseType>(trackTypes)
    : null; // null = all types (backwards-compat default)

  const typeAllowed = (t: ExerciseType): boolean =>
    effectiveTypes === null || effectiveTypes.has(t);

  const questions: Question[] = [];

  // -------------------------------------------------------------------------
  // Step 3a: Advanced Drills — 1:1:1 mixed-track emission (SPEC-REQ-12)
  // -------------------------------------------------------------------------
  if (trackKind === "advanced_drills") {
    return buildAdvancedDrillsSession(eligibleVocab, verses, grammarPoints, jlptPool, lengthMode);
  }

  // -------------------------------------------------------------------------
  // Step 3b: Kanji track — emit vocab_typed for every kanji-bearing vocab
  // -------------------------------------------------------------------------
  if (trackKind === "kanji") {
    for (const vocab of eligibleVocab) {
      questions.push(makeVocabTypedQuestion(vocab));
    }
  } else {
    // -----------------------------------------------------------------------
    // Step 3c: Vocab / Grammar / other tracks — use standard per-vocab loop
    // -----------------------------------------------------------------------
    const hasTimedVerses = verses.some((v) => v.start_time_ms > 0);
    const ALL_VOCAB_LOOP_TYPES: ExerciseType[] = [
      "vocab_meaning",
      "meaning_vocab",
      "reading_match",
      "fill_lyric",
      "listening_drill",
    ];
    const activeTypes = ALL_VOCAB_LOOP_TYPES.filter(typeAllowed);

    for (const vocab of eligibleVocab) {
      for (const type of activeTypes) {
        if ((type === "fill_lyric" || type === "listening_drill") && eligibleVocab.length < 3) continue;
        if (type === "listening_drill" && !hasTimedVerses) continue;

        const distractorEntries = pickDistractorsWithVocab(vocab, type, eligibleVocab, jlptPool);
        const distractors = distractorEntries.map((d) => d.field);
        const question = makeQuestion(vocab, type, distractors, verses, distractorEntries);
        if (question) questions.push(question);
      }
    }

    // Grammar conjugation
    if (typeAllowed("grammar_conjugation")) {
      for (const gp of grammarPoints) {
        const q = makeGrammarConjugationQuestion(gp, eligibleVocab, verses, jlptPool);
        if (q) questions.push(q);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Step 4: Lag-test + JLPT sort wrap via buildSessionSequence (D-17, D-18)
  // -------------------------------------------------------------------------
  const lengthCap = lengthMode ? LENGTH_CAP[lengthMode] : Number.MAX_SAFE_INTEGER;

  // Build SessionItem[] from emitted questions
  const introsItems: SessionItem[] = questions.map((q) => ({
    vocabItemId: q.vocabItemId,
    jlptLevel: (q.jlpt_level ?? null) as SessionItem["jlptLevel"],
    isNew: true,
  }));

  const reviewsItems: SessionItem[] = dueReviews
    .filter((v) => v.vocab_item_id)
    .map((v) => ({
      vocabItemId: v.vocab_item_id!,
      jlptLevel: (v.jlpt_level === "unknown" ? null : v.jlpt_level) as import("./scheduler").JlptLevel,
      isNew: false,
    }));

  const sequenced = buildSessionSequence({
    intros: introsItems,
    reviews: reviewsItems,
    lengthCap,
    minIntroToTestGap: MIN_INTRO_TO_TEST_GAP,
  });

  // Reorder questions to match the sequenced output
  const questionByVocabId = new Map<string, Question>();
  for (const q of questions) {
    if (q.vocabItemId) questionByVocabId.set(q.vocabItemId, q);
  }

  const reordered: Question[] = [];
  for (const seq of sequenced) {
    if (seq.kind === "intro" || seq.kind === "test" || seq.kind === "review") {
      const match = questionByVocabId.get(seq.item.vocabItemId);
      if (match) reordered.push(match);
    }
  }

  // Fallback: if sequencer skipped items (e.g., vocabItemId mismatch), return shuffled
  if (reordered.length === 0 && questions.length > 0) {
    return shuffle(questions).slice(0, lengthCap);
  }

  return reordered;
}

// ---------------------------------------------------------------------------
// Phase 11.6 — Advanced Drills session builder (SPEC-REQ-12)
// ---------------------------------------------------------------------------
//
// Mixes vocab-MC, kanji-typed, and grammar-conjugation ~1:1:1 (+/-20%).
// At least 30% of questions must be vocab_typed.
// Round-robin interleaves sub-pools until cap is met.

function buildAdvancedDrillsSession(
  allVocab: VocabEntry[],
  verses: Verse[],
  grammarPoints: GrammarPoint[],
  jlptPool: VocabEntry[],
  lengthMode: LengthMode | undefined
): Question[] {
  const lengthCap = lengthMode ? LENGTH_CAP[lengthMode] : 25;

  // Sub-pool A: kanji-bearing vocab → vocab_typed questions
  const kanjiVocab = allVocab.filter((v) => hasKanji(v.surface));
  const kanjiQs: Question[] = kanjiVocab.map(makeVocabTypedQuestion);

  // Sub-pool B: all vocab → multiple-choice vocab questions (vocab_meaning)
  const vocabQs: Question[] = [];
  for (const vocab of allVocab) {
    const distractorEntries = pickDistractorsWithVocab(vocab, "vocab_meaning", allVocab, jlptPool);
    const distractors = distractorEntries.map((d) => d.field);
    const q = makeQuestion(vocab, "vocab_meaning", distractors, verses, distractorEntries);
    if (q) vocabQs.push(q);
  }

  // Sub-pool C: grammar conjugation questions
  const grammarQs: Question[] = [];
  for (const gp of grammarPoints) {
    const q = makeGrammarConjugationQuestion(gp, allVocab, verses, jlptPool);
    if (q) grammarQs.push(q);
  }

  // Round-robin interleave: pop 1 from each pool in sequence
  const shuffledKanji = shuffle(kanjiQs);
  const shuffledVocab = shuffle(vocabQs);
  const shuffledGrammar = shuffle(grammarQs);

  const pools: Question[][] = [shuffledVocab, shuffledKanji, shuffledGrammar].filter((p) => p.length > 0);
  const mixed: Question[] = [];
  let poolIdx = 0;

  while (mixed.length < lengthCap) {
    let emitted = false;
    // Try each pool in round-robin once
    const startIdx = poolIdx;
    for (let attempts = 0; attempts < pools.length; attempts++) {
      const pi = (startIdx + attempts) % pools.length;
      const pool = pools[pi];
      if (pool.length > 0) {
        mixed.push(pool.shift()!);
        poolIdx = (pi + 1) % pools.length;
        emitted = true;
        break;
      }
    }
    if (!emitted) break; // all pools exhausted
  }

  // Enforce >=30% typed (SPEC-REQ-12): convert some vocab_meaning to vocab_typed if needed
  const typedCount = mixed.filter((q) => q.type === "vocab_typed").length;
  const typedThreshold = Math.ceil(mixed.length * 0.30);

  if (typedCount < typedThreshold && kanjiVocab.length > 0) {
    let needed = typedThreshold - typedCount;
    for (let i = 0; i < mixed.length && needed > 0; i++) {
      if (mixed[i].type === "vocab_meaning") {
        // Find matching kanji vocab
        const matchingKanji = kanjiVocab.find((v) => v.vocab_item_id === mixed[i].vocabItemId);
        if (matchingKanji) {
          mixed[i] = makeVocabTypedQuestion(matchingKanji);
          needed--;
        } else if (kanjiVocab.length > 0) {
          // Pick any kanji vocab not already in mixed
          const usedIds = new Set(mixed.map((q) => q.vocabItemId));
          const available = kanjiVocab.filter((v) => !usedIds.has(v.vocab_item_id!));
          if (available.length > 0) {
            mixed[i] = makeVocabTypedQuestion(available[0]);
            needed--;
          }
        }
      }
    }
  }

  return mixed;
}
