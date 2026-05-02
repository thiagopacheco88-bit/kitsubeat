"use client";

/**
 * ReviewSession — cross-song SRS review session loop.
 *
 * Expects the review store to be hydrated (via ReviewLanding.load()) before mount.
 * Renders one card at a time using ReviewQuestionCard (which calls recordReviewAnswer).
 *
 * Race-handling for daily_new_card_cap_reached (MANDATORY per plan):
 * If recordReviewAnswer throws "daily_new_card_cap_reached" mid-session:
 * 1. ReviewQuestionCard calls onCapReached() callback.
 * 2. ReviewSession calls removeNewCards() to prune isNew=true items from the queue.
 * 3. Refetches budget from GET /api/review/budget to confirm server's view.
 * 4. Shows a non-blocking toast: "Daily new-card limit reached — continuing with review-only cards".
 * 5. If no due cards remain either, ends the session immediately.
 */

import { useState, useCallback } from "react";
import { useReviewSession } from "@/stores/reviewSession";
import ReviewQuestionCard from "./ReviewQuestionCard";
import VocabTypedCard from "@/app/songs/[slug]/components/VocabTypedCard";
import { pickDistractors } from "@/lib/exercises/generator";
import { vocabRowToVocabEntry } from "@/lib/review/distractors";
import { recordReviewAnswer } from "@/app/actions/review";
import type { VocabRow } from "@/app/api/review/queue/route";
import type { Question } from "@/lib/exercises/generator";
import type { ReviewQueueItem, ReviewQuestionType } from "@/lib/review/queue-builder";
import type { Localizable } from "@/lib/types/lesson";
import { Button } from "@/components/ui/Button";

interface ReviewSessionProps {
  userId: string;
  /** Vocab data keyed by vocab_item_id — fetched alongside the queue by /api/review/queue */
  vocabData: Record<string, VocabRow>;
  /** JLPT distractor pools keyed by level — fetched alongside the queue by /api/review/queue */
  jlptPools?: Record<string, VocabRow[]>;
  onBack: () => void;
}

/**
 * Module-level flag to prevent console.warn spam when a vocab row has no
 * jlpt_level — only warn once per page load.
 */
let warnedNullLevel = false;

/**
 * Builds a minimal Question object from a VocabRow for use with ReviewQuestionCard.
 * Only the fields the ReviewQuestionCard JSX actually reads are populated.
 *
 * Distractors are selected via pickDistractors using the jlptPools entry matching
 * the vocab's jlpt_level. sameSongPool is [] by design — cross-song review has no
 * "same song" context; the jlpt-level pool provides sufficient distractor candidates.
 *
 * If vocab.jlpt_level is null or the pool returns < 3 distractors, a single
 * console.warn fires (once per session) and the card renders with fewer options —
 * an acceptable edge case per 11-VERIFICATION.md.
 */
function buildQuestion(
  item: ReviewQueueItem,
  vocab: VocabRow,
  jlptPools: Record<string, VocabRow[]>
): Question {
  const vocabInfo = {
    surface: vocab.dictionary_form,
    reading: vocab.reading,
    romaji: vocab.romaji,
    vocab_item_id: vocab.id,
  };

  // Build prompt and correctAnswer based on exercise type.
  let prompt = "";
  let correctAnswer = "";
  switch (item.exerciseType as ReviewQuestionType) {
    case "vocab_meaning":
      prompt = vocab.dictionary_form;
      correctAnswer = extractMeaning(vocab.meaning);
      break;
    case "meaning_vocab":
      prompt = extractMeaning(vocab.meaning);
      correctAnswer = vocab.dictionary_form;
      break;
    case "reading_match":
      prompt = vocab.dictionary_form;
      correctAnswer = vocab.romaji;
      break;
    case "vocab_typed":
      // Phase 11.6: kanji_kana track — prompt is kanji surface, correct answer is romaji
      prompt = vocab.dictionary_form;
      correctAnswer = vocab.romaji;
      break;
  }

  // Resolve distractor pool for this card's JLPT level.
  const poolRows = vocab.jlpt_level ? (jlptPools[vocab.jlpt_level] ?? []) : [];
  if (!vocab.jlpt_level && !warnedNullLevel) {
    warnedNullLevel = true;
    console.warn(
      "[ReviewSession] vocab with no jlpt_level; distractors will be empty:",
      vocab.id
    );
  }

  // Convert VocabRow entries to VocabEntry for pickDistractors.
  const correctEntry = vocabRowToVocabEntry(vocab);
  const poolEntries = poolRows.map(vocabRowToVocabEntry);

  // sameSongPool is [] — cross-song review has no "same song" context.
  const distractors = pickDistractors(
    correctEntry,
    item.exerciseType as Question["type"],
    [],
    poolEntries
  );

  if (distractors.length < 3 && !warnedNullLevel) {
    warnedNullLevel = true;
    console.warn(
      "[ReviewSession] pickDistractors returned fewer than 3 distractors for vocab:",
      vocab.id,
      "jlpt_level:",
      vocab.jlpt_level,
      "pool size:",
      poolRows.length
    );
  }

  return {
    id: `review-${item.vocab_item_id}-${item.exerciseType}`,
    type: item.exerciseType as Question["type"],
    vocabItemId: item.vocab_item_id,
    prompt,
    correctAnswer,
    distractors,
    explanation: `${vocab.dictionary_form} (${vocab.reading}) — ${extractMeaning(vocab.meaning)}`,
    vocabInfo,
    mnemonic: vocab.mnemonic ? (vocab.mnemonic as Localizable) : undefined,
    kanji_breakdown: vocab.kanji_breakdown as Question["kanji_breakdown"] ?? null,
  };
}

function extractMeaning(meaning: unknown): string {
  if (!meaning) return "";
  if (typeof meaning === "string") return meaning;
  const m = meaning as Record<string, string>;
  return m["en"] ?? m[Object.keys(m)[0]] ?? "";
}

export default function ReviewSession({ userId, vocabData, jlptPools = {}, onBack }: ReviewSessionProps) {
  const { items, currentIndex, answers, advance, removeNewCards, load } = useReviewSession();
  const [capReachedToast, setCapReachedToast] = useState(false);
  const [answered, setAnswered] = useState<{ chosen: string; correct: boolean; timeMs: number } | null>(null);

  const currentItem = items[currentIndex];
  const isComplete = currentIndex >= items.length;

  const handleCapReached = useCallback(async () => {
    // Prune new cards from the queue
    removeNewCards();

    // Refetch budget to confirm server's view
    try {
      await fetch("/api/review/budget");
    } catch {
      // Non-critical — toast is shown regardless
    }

    // Show non-blocking toast
    setCapReachedToast(true);
    setTimeout(() => setCapReachedToast(false), 8000);
  }, [removeNewCards]);

  const handleAnswered = useCallback((chosen: string, correct: boolean, timeMs: number) => {
    setAnswered({ chosen, correct, timeMs });
    // Note: recordAnswer in the store is called after recordReviewAnswer succeeds in ReviewQuestionCard.
    // For the summary we track answers keyed by vocabItemId.
    useReviewSession.getState().recordAnswer(currentItem?.vocab_item_id ?? "", {
      correct,
      responseTimeMs: timeMs,
    });
  }, [currentItem?.vocab_item_id]);

  const handleContinue = useCallback(() => {
    setAnswered(null);
    advance();
  }, [advance]);

  // Summary screen
  if (isComplete) {
    const totalAnswered = Object.keys(answers).length;
    const correctCount = Object.values(answers).filter((a) => a.correct).length;

    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-[var(--color-text)]">Session Complete</h2>
        <p className="mt-4 text-lg text-[var(--color-text-muted)]">
          {totalAnswered === 0
            ? "No cards were answered."
            : `${correctCount} / ${totalAnswered} correct`}
        </p>
        {capReachedToast && (
          <p className="mt-2 text-sm text-[var(--color-jlpt-n3)]">
            Daily new-card limit was reached during this session.
          </p>
        )}
        <Button
          variant="primary"
          size="md"
          onClick={onBack}
          className="mt-8"
        >
          Back to Review
        </Button>
      </div>
    );
  }

  // No current item (shouldn't happen if isComplete is handled above)
  if (!currentItem) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="text-[var(--color-text-muted)]">No cards available.</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mt-4 underline"
        >
          Back
        </Button>
      </div>
    );
  }

  const vocab = vocabData[currentItem.vocab_item_id];
  if (!vocab) {
    // Vocab data missing for this card — skip it
    advance();
    return null;
  }

  const question = buildQuestion(currentItem, vocab, jlptPools);

  // Phase 11.6: kanji_kana cards use VocabTypedCard (romaji typed-input).
  // romaji_meaning cards use the existing MCQ ReviewQuestionCard.
  const isKanjiKana =
    currentItem.card_kind === "kanji_kana" ||
    currentItem.exerciseType === "vocab_typed";

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      {/* Progress */}
      <div className="mb-4 flex items-center justify-between text-sm text-[var(--color-text-muted)]">
        <span>
          Card {currentIndex + 1} of {items.length}
          {currentItem.isNew && (
            <span className="ml-2 rounded-[var(--radius-pill)] bg-[var(--color-jlpt-n4-bg)] ring-1 ring-[var(--color-jlpt-n4-ring)] px-2 py-0.5 text-xs text-[var(--color-jlpt-n4)]">
              New
            </span>
          )}
        </span>
        <button
          onClick={onBack}
          className="text-xs text-[var(--color-text-dim)] hover:text-[var(--color-text-muted)] underline"
        >
          End session
        </button>
      </div>

      {/* Daily cap toast */}
      {capReachedToast && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 rounded-[var(--radius-md)] border border-[var(--color-jlpt-n3-ring)] bg-[var(--color-jlpt-n3-bg)] p-3 text-sm text-[var(--color-jlpt-n3)]"
        >
          Daily new-card limit reached — continuing with review-only cards for today.
        </div>
      )}

      {/* Phase 11.6: kanji_kana cards → VocabTypedCard; romaji_meaning → ReviewQuestionCard */}
      {isKanjiKana ? (
        <VocabTypedCard
          key={question.id}
          question={question}
          onAnswered={(chosen, correct, timeMs) => {
            handleAnswered(chosen, correct, timeMs);
            // Record FSRS answer for kanji_kana card via review server action
            void (async () => {
              try {
                await recordReviewAnswer({
                  userId,
                  vocabItemId: currentItem.vocab_item_id,
                  exerciseType: currentItem.exerciseType,
                  cardKind: currentItem.card_kind,
                  correct,
                  responseTimeMs: timeMs,
                  isNew: currentItem.isNew,
                });
              } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                if (message === "daily_new_card_cap_reached") {
                  void handleCapReached();
                } else {
                  console.error("recordReviewAnswer (kanji_kana) failed:", err);
                }
              }
            })();
          }}
          onContinue={handleContinue}
        />
      ) : (
        <ReviewQuestionCard
          key={question.id}
          question={question}
          exerciseType={currentItem.exerciseType}
          isNew={currentItem.isNew}
          onAnswered={handleAnswered}
          onContinue={handleContinue}
          userId={userId}
          onCapReached={handleCapReached}
          cardKind={currentItem.card_kind}
        />
      )}
    </div>
  );
}
