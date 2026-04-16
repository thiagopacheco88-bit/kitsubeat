/**
 * Exercise Question Generator
 *
 * Pure functions — no side effects, no network calls, no DB access.
 * Transforms lesson vocabulary into shuffled, typed questions with
 * intelligent distractor selection.
 */

import { localize } from "@/lib/types/lesson";
import type { Lesson, VocabEntry, Verse } from "@/lib/types/lesson";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExerciseType =
  | "vocab_meaning"
  | "meaning_vocab"
  | "reading_match"
  | "fill_lyric";

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
  /** For Fill-the-Lyric: the verse reference for audio seek */
  verseRef?: {
    verseNumber: number;
    startMs: number;
  };
}

export interface SessionConfig {
  mode: "short" | "full";
  /** short = 10, full = all vocab * 4 types capped at 40 */
  targetCount: number;
}

// ---------------------------------------------------------------------------
// Fisher-Yates shuffle (unbiased — NOT arr.sort(() => Math.random() - 0.5))
// ---------------------------------------------------------------------------

function shuffle<T>(arr: T[]): T[] {
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
  const correctField = extractField(correct, type);
  const correctNorm = correctField.trim().toLowerCase();

  const isValid = (v: VocabEntry): boolean => {
    if (v.vocab_item_id === correct.vocab_item_id) return false;
    const field = extractField(v, type).trim().toLowerCase();
    return field !== correctNorm && field.length > 0;
  };

  // 1. Same-song candidates (excluding correct vocab entry)
  const songCandidates = sameSongPool
    .filter(isValid)
    .map((v) => extractField(v, type));

  // Deduplicate within candidates
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const c of songCandidates) {
    const norm = c.trim().toLowerCase();
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
        unique.push(field);
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
        unique.push(field);
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
  verses: Verse[]
): Question | null {
  const surface = vocab.surface;
  const meaning = localize(vocab.meaning, "en");

  let prompt: string;
  let correctAnswer: string;
  let verseRef: Question["verseRef"] | undefined;

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
  }

  return {
    id: crypto.randomUUID(),
    type,
    vocabItemId: vocab.vocab_item_id!,
    prompt,
    correctAnswer,
    distractors,
    explanation: makeExplanation(vocab, type),
    detailedExplanation: makeDetailedExplanation(vocab),
    verseRef,
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
 */
export function buildQuestions(
  lesson: Lesson,
  mode: SessionConfig["mode"],
  jlptPool: VocabEntry[]
): Question[] {
  // Only include vocab entries with a UUID identity
  const base = lesson.vocabulary.filter((v) => v.vocab_item_id);

  const types: ExerciseType[] = [
    "vocab_meaning",
    "meaning_vocab",
    "reading_match",
    "fill_lyric",
  ];

  const questions: Question[] = [];

  for (const vocab of base) {
    for (const type of types) {
      // fill_lyric requires at least 3 vocab entries (to form 4 distinct options)
      if (type === "fill_lyric" && base.length < 3) continue;

      const distractors = pickDistractors(vocab, type, base, jlptPool);
      const question = makeQuestion(vocab, type, distractors, lesson.verses);
      if (question) {
        questions.push(question);
      }
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
