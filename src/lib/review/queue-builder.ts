/**
 * Review Queue Builder
 *
 * Pure function — no side effects, no network calls, no DB access.
 * Combines due + new cards into a session queue for the /review route.
 *
 * CONTEXT-LOCK: Fill-the-Lyric (fill_lyric) is NEVER emitted by this module.
 * Cross-song review cards lack verse context, so fill_lyric cannot be used.
 * The type restriction is enforced at the type level via Exclude<>.
 */

import type { ExerciseType } from "@/lib/exercises/generator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Exercise types permitted in cross-song review sessions.
 * Fill-the-Lyric is excluded — it requires verse context that is unavailable
 * in a decontextualized review session (CONTEXT-locked).
 */
export type ReviewQuestionType = Exclude<ExerciseType, "fill_lyric">;
// Equivalent: "vocab_meaning" | "meaning_vocab" | "reading_match"

export interface DueCardInput {
  vocab_item_id: string;
  /** FSRS state: 1=Learning, 2=Review, 3=Relearning */
  state: 0 | 1 | 2 | 3;
  due: Date;
}

export interface NewCardInput {
  vocab_item_id: string;
}

export interface ReviewQueueItem {
  vocab_item_id: string;
  exerciseType: ReviewQuestionType;
  /** true = card was in the "new" bucket (state=0, never seen) */
  isNew: boolean;
}

// ---------------------------------------------------------------------------
// Allowed exercise types for rotation
// ---------------------------------------------------------------------------

const REVIEW_EXERCISE_TYPES: ReviewQuestionType[] = [
  "vocab_meaning",
  "meaning_vocab",
  "reading_match",
];

// ---------------------------------------------------------------------------
// Hash function for deterministic exercise-type rotation
// ---------------------------------------------------------------------------

/**
 * Simple deterministic hash of a vocab_item_id string.
 * Returns a non-negative integer. Used to rotate exercise types across
 * repeated reviews of the same card — same ID always maps to the same slot
 * in REVIEW_EXERCISE_TYPES (mod 3), creating stable rotation.
 *
 * Algorithm: polynomial rolling hash (base 31), bitwise-OR 0 to keep 32-bit
 * signed integer, then Math.abs for non-negative index.
 */
export function hashVocabId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Assigns a deterministic exercise type to a vocab_item_id.
 * The type is stable across calls (same ID → same type), providing
 * predictable rotation over time.
 */
function assignExerciseType(vocabItemId: string): ReviewQuestionType {
  return REVIEW_EXERCISE_TYPES[hashVocabId(vocabItemId) % REVIEW_EXERCISE_TYPES.length];
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Combines due + new cards into a session queue.
 *
 * Ordering rules:
 * - Due cards come first (preserves upstream `due ASC` ordering).
 * - New cards are appended after due cards, bounded by `newCardBudget`.
 * - If `newCardBudget <= 0`, all new cards are dropped.
 *
 * Type assignment:
 * - Each card receives a single exercise type chosen deterministically from
 *   {vocab_meaning, meaning_vocab, reading_match} based on the vocab_item_id hash.
 * - Fill-the-Lyric is NEVER emitted (CONTEXT-locked, enforced at type level).
 *
 * @param due    Due cards returned by getDueReviewQueue (ordered due ASC upstream).
 * @param newCards  New (state=0, never-seen) cards for introduction.
 * @param newCardBudget  Maximum number of new cards to include. 0 = due-only mode.
 * @returns Ordered ReviewQueueItem[] — due first, then new (capped by budget).
 */
export function buildReviewQueue(
  due: DueCardInput[],
  newCards: NewCardInput[],
  newCardBudget: number
): ReviewQueueItem[] {
  const queue: ReviewQueueItem[] = [];

  // Due cards first — preserve upstream ordering (due ASC)
  for (const card of due) {
    queue.push({
      vocab_item_id: card.vocab_item_id,
      exerciseType: assignExerciseType(card.vocab_item_id),
      isNew: false,
    });
  }

  // New cards appended, bounded by budget
  const cappedNew = newCards.slice(0, Math.max(0, newCardBudget));
  for (const card of cappedNew) {
    queue.push({
      vocab_item_id: card.vocab_item_id,
      exerciseType: assignExerciseType(card.vocab_item_id),
      isNew: true,
    });
  }

  return queue;
}
