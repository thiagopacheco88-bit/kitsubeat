"use client";

/**
 * ReviewFeedbackPanel — thin wrapper of the FeedbackPanel visual shell for /review.
 *
 * Why a wrapper and not direct reuse of FeedbackPanel:
 * FeedbackPanel imports useExerciseSession() (for moreAccordionOpen state)
 * AND usePlayer() (for translationLang from PlayerContext).
 * Neither is available in the /review context — there is no PlayerProvider
 * wrapping the /review route, and useExerciseSession must not be accessed
 * from the review session to avoid state collision.
 *
 * This file copies the FeedbackPanel JSX and:
 * - Replaces useExerciseSession → useReviewSession for accordion state.
 *   Note: reviewSession store does not track moreAccordionOpen; we manage
 *   accordion state locally with useState (simpler, no cross-question persistence
 *   needed in review mode).
 * - Removes usePlayer — translationLang defaults to "en" (review has no lang selector).
 *
 * Refactoring FeedbackPanel to be store-agnostic is deferred (11-05-SUMMARY.md).
 */

import { useState } from "react";
import type { Question } from "@/lib/exercises/generator";
import { localize } from "@/lib/types/lesson";
import TierText from "@/app/songs/[slug]/components/TierText";
import MasteryDetailPopover from "@/app/songs/[slug]/components/MasteryDetailPopover";
import KanjiBreakdownSection from "@/app/songs/[slug]/components/KanjiBreakdownSection";

interface ReviewFeedbackPanelProps {
  question: Question;
  chosenAnswer: string;
  isCorrect: boolean;
  onContinue: () => void;
  /** The authenticated user's ID — used for mastery detail popovers */
  userId: string;
}

/**
 * Default translation language for the review session.
 * No PlayerContext is available on /review — English is the safe default.
 */
const DEFAULT_LANG = "en" as const;

export default function ReviewFeedbackPanel({
  question,
  chosenAnswer,
  isCorrect,
  onContinue,
  userId,
}: ReviewFeedbackPanelProps) {
  // Local accordion state — review mode doesn't need cross-question persistence.
  const [moreAccordionOpen, setMoreAccordionOpen] = useState(false);

  const wrongChoiceNote =
    !isCorrect && chosenAnswer !== question.correctAnswer
      ? `The answer being asked for is not 「${chosenAnswer}」.`
      : null;

  const wrongVocab =
    !isCorrect && question.distractorVocab
      ? question.distractorVocab[chosenAnswer]
      : undefined;

  const hasKanjiBreakdown =
    question.kanji_breakdown != null &&
    question.kanji_breakdown.characters.length > 0;

  const hasMoreContent =
    !!question.detailedExplanation || !!question.mnemonic || hasKanjiBreakdown;

  return (
    <div
      data-feedback={isCorrect ? "correct" : "wrong"}
      className={`mt-4 rounded-lg border p-4 ${
        isCorrect
          ? "border-green-500/30 bg-green-500/10"
          : "border-red-500/30 bg-red-500/10"
      }`}
    >
      {/* Status icon + result */}
      <div className="mb-2 flex items-center gap-2">
        {isCorrect ? (
          <span className="text-lg text-green-400">&#10003;</span>
        ) : (
          <span className="text-lg text-red-400">&#10007;</span>
        )}
        <span
          className={`font-semibold ${isCorrect ? "text-green-400" : "text-red-400"}`}
        >
          {isCorrect ? "Correct!" : "Not quite"}
        </span>
      </div>

      {/* Wrong answer: show correct answer */}
      {!isCorrect && (
        <p className="mb-1 text-sm text-gray-300">
          <span className="font-medium text-green-400">Correct answer:</span>{" "}
          {question.correctAnswer}
        </p>
      )}

      {/* Wrong answer: wrong-pick callout */}
      {wrongChoiceNote && (
        <p className="mb-2 text-sm text-gray-400">
          {wrongVocab?.vocab_item_id ? (
            <MasteryDetailPopover
              vocabItemId={wrongVocab.vocab_item_id}
              userId={userId}
              trigger={
                <span className="text-red-400">
                  {wrongVocab.surface}
                </span>
              }
            />
          ) : (
            <span>「{chosenAnswer}」</span>
          )}
          {" "}is not the answer being asked for here.
        </p>
      )}

      {/* Vocab block — always Tier 1 (forceTier1), wrapped in mastery popover */}
      <div className="mb-3 rounded-md bg-gray-900/60 p-3">
        <MasteryDetailPopover
          vocabItemId={question.vocabItemId}
          userId={userId}
          trigger={
            <TierText
              vocab={question.vocabInfo}
              tier={3}
              forceTier1
              mode="feedback"
            />
          }
        />
        <p className="mt-1 text-sm text-gray-400">{question.explanation}</p>
      </div>

      {/* Explanation */}
      <p className="text-sm text-gray-300">{question.explanation}</p>

      {/* Action row */}
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={onContinue}
          className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
        >
          Continue
        </button>
        {hasMoreContent && (
          <button
            onClick={() => setMoreAccordionOpen(!moreAccordionOpen)}
            aria-expanded={moreAccordionOpen}
            className="text-sm text-gray-400 underline hover:text-gray-200"
          >
            {moreAccordionOpen ? "Hide details" : "More"}
          </button>
        )}
      </div>

      {/* More details accordion */}
      {hasMoreContent && moreAccordionOpen && (
        <div className="mt-3 flex flex-col gap-3" data-testid="review-feedback-more-accordion">
          {question.detailedExplanation && (
            <p className="text-sm text-gray-400">{question.detailedExplanation}</p>
          )}
          {question.mnemonic && (
            <div className="rounded-md border border-indigo-500/20 bg-indigo-900/20 p-3">
              <p className="mb-1 text-xs uppercase tracking-wider text-indigo-400">Memory tip</p>
              <p className="text-sm text-gray-300">
                {localize(question.mnemonic, DEFAULT_LANG)}
              </p>
            </div>
          )}
          {hasKanjiBreakdown && question.kanji_breakdown && (
            <KanjiBreakdownSection breakdown={question.kanji_breakdown} lang={DEFAULT_LANG} />
          )}
        </div>
      )}
    </div>
  );
}
