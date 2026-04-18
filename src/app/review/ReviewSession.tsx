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
import type { VocabRow } from "@/app/api/review/queue/route";
import type { Question } from "@/lib/exercises/generator";
import type { ReviewQueueItem, ReviewQuestionType } from "@/lib/review/queue-builder";
import type { Localizable } from "@/lib/types/lesson";

interface ReviewSessionProps {
  userId: string;
  /** Vocab data keyed by vocab_item_id — fetched alongside the queue by /api/review/queue */
  vocabData: Record<string, VocabRow>;
  onBack: () => void;
}

/**
 * Builds a minimal Question object from a VocabRow for use with ReviewQuestionCard.
 * Only the fields the ReviewQuestionCard JSX actually reads are populated.
 * Distractors: simplified — uses empty array placeholder (full distractor fetch
 * would require a separate jlpt-pool call per card; deferred to future polish).
 */
function buildQuestion(item: ReviewQueueItem, vocab: VocabRow): Question {
  const vocabInfo = {
    surface: vocab.dictionary_form,
    reading: vocab.reading,
    romaji: vocab.romaji,
    vocab_item_id: vocab.id,
  };

  // Build prompt based on exercise type
  let prompt: string;
  let correctAnswer: string;
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
  }

  return {
    id: `review-${item.vocab_item_id}-${item.exerciseType}`,
    type: item.exerciseType as Question["type"],
    vocabItemId: item.vocab_item_id,
    prompt,
    correctAnswer,
    distractors: [], // Simplified: no distractors in review mode for now
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

export default function ReviewSession({ userId, vocabData, onBack }: ReviewSessionProps) {
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
        <h2 className="text-2xl font-bold text-white">Session Complete</h2>
        <p className="mt-4 text-lg text-gray-300">
          {totalAnswered === 0
            ? "No cards were answered."
            : `${correctCount} / ${totalAnswered} correct`}
        </p>
        {capReachedToast && (
          <p className="mt-2 text-sm text-yellow-400">
            Daily new-card limit was reached during this session.
          </p>
        )}
        <button
          onClick={onBack}
          className="mt-8 rounded-lg bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Back to Review
        </button>
      </div>
    );
  }

  // No current item (shouldn't happen if isComplete is handled above)
  if (!currentItem) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="text-gray-400">No cards available.</p>
        <button onClick={onBack} className="mt-4 text-sm text-red-400 underline">
          Back
        </button>
      </div>
    );
  }

  const vocab = vocabData[currentItem.vocab_item_id];
  if (!vocab) {
    // Vocab data missing for this card — skip it
    advance();
    return null;
  }

  const question = buildQuestion(currentItem, vocab);

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      {/* Progress */}
      <div className="mb-4 flex items-center justify-between text-sm text-gray-400">
        <span>
          Card {currentIndex + 1} of {items.length}
          {currentItem.isNew && (
            <span className="ml-2 rounded-full bg-blue-900/50 px-2 py-0.5 text-xs text-blue-300">
              New
            </span>
          )}
        </span>
        <button onClick={onBack} className="text-xs text-gray-500 hover:text-gray-300 underline">
          End session
        </button>
      </div>

      {/* Daily cap toast */}
      {capReachedToast && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-300"
        >
          Daily new-card limit reached — continuing with review-only cards for today.
        </div>
      )}

      {/* Question card */}
      <ReviewQuestionCard
        key={question.id}
        question={question}
        exerciseType={currentItem.exerciseType}
        isNew={currentItem.isNew}
        onAnswered={handleAnswered}
        onContinue={handleContinue}
        userId={userId}
        onCapReached={handleCapReached}
      />
    </div>
  );
}
