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

  // Phase 14 Plan 14-09 (D-PRE-10): JLPT-alpha semantic-color reuse pattern
  // (Plan 14-07/14-08 idiom): correct = jlpt-n5 alpha (green), wrong = accent
  // alpha (red, == jlpt-n1). Mnemonic panel uses jlpt-n4 alpha (blue, info)
  // matching Plan 14-05's mnemonic recipe. Continue CTA uses --color-accent
  // matching Button variant=primary visual weight. No new tokens introduced.
  return (
    <div
      data-feedback={isCorrect ? "correct" : "wrong"}
      className={`mt-4 rounded-[var(--radius-md)] border p-4 ${
        isCorrect
          ? "border-[var(--color-jlpt-n5-ring)] bg-[var(--color-jlpt-n5-bg)]"
          : "border-[var(--color-jlpt-n1-ring)] bg-[var(--color-jlpt-n1-bg)]"
      }`}
    >
      {/* Status icon + result */}
      <div className="mb-2 flex items-center gap-2">
        {isCorrect ? (
          <span className="text-lg text-[var(--color-jlpt-n5)]">&#10003;</span>
        ) : (
          <span className="text-lg text-[var(--color-accent)]">&#10007;</span>
        )}
        <span
          className={`font-semibold ${isCorrect ? "text-[var(--color-jlpt-n5)]" : "text-[var(--color-accent)]"}`}
        >
          {isCorrect ? "Correct!" : "Not quite"}
        </span>
      </div>

      {/* Wrong answer: show correct answer */}
      {!isCorrect && (
        <p className="mb-1 text-sm text-[var(--color-text-muted)]">
          <span className="font-medium text-[var(--color-jlpt-n5)]">Correct answer:</span>{" "}
          {question.correctAnswer}
        </p>
      )}

      {/* Wrong answer: wrong-pick callout */}
      {wrongChoiceNote && (
        <p className="mb-2 text-sm text-[var(--color-text-muted)]">
          {wrongVocab?.vocab_item_id ? (
            <MasteryDetailPopover
              vocabItemId={wrongVocab.vocab_item_id}
              userId={userId}
              trigger={
                <span className="text-[var(--color-accent)]">
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
      <div className="mb-3 rounded-[var(--radius-sm)] bg-[var(--color-card-2)] p-3">
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
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{question.explanation}</p>
      </div>

      {/* Explanation */}
      <p className="text-sm text-[var(--color-text-muted)]">{question.explanation}</p>

      {/* Action row */}
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={onContinue}
          className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-1.5 text-sm font-medium [color:white] transition-colors hover:opacity-90"
        >
          Continue
        </button>
        {hasMoreContent && (
          <button
            onClick={() => setMoreAccordionOpen(!moreAccordionOpen)}
            aria-expanded={moreAccordionOpen}
            className="text-sm text-[var(--color-text-muted)] underline hover:text-[var(--color-text)]"
          >
            {moreAccordionOpen ? "Hide details" : "More"}
          </button>
        )}
      </div>

      {/* More details accordion */}
      {hasMoreContent && moreAccordionOpen && (
        <div className="mt-3 flex flex-col gap-3" data-testid="review-feedback-more-accordion">
          {question.detailedExplanation && (
            <p className="text-sm text-[var(--color-text-muted)]">{question.detailedExplanation}</p>
          )}
          {question.mnemonic && (
            <div className="rounded-[var(--radius-sm)] border border-[var(--color-jlpt-n4-ring)] bg-[var(--color-jlpt-n4-bg)] p-3">
              <p className="mb-1 text-xs uppercase tracking-wider text-[var(--color-jlpt-n4)]">Memory tip</p>
              <p className="text-sm text-[var(--color-text-muted)]">
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
