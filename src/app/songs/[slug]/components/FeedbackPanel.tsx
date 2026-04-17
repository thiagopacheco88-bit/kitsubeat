"use client";

import type { Question } from "@/lib/exercises/generator";
import { localize } from "@/lib/types/lesson";
import { useExerciseSession } from "@/stores/exerciseSession";
import { usePlayer } from "./PlayerContext";
import TierText from "./TierText";
import MasteryDetailPopover from "./MasteryDetailPopover";
import KanjiBreakdownSection from "./KanjiBreakdownSection";

interface FeedbackPanelProps {
  question: Question;
  chosenAnswer: string;
  isCorrect: boolean;
  onContinue: () => void;
  /** The authenticated user's ID — used for mastery detail popovers */
  userId: string;
}

export default function FeedbackPanel({
  question,
  chosenAnswer,
  isCorrect,
  onContinue,
  userId,
}: FeedbackPanelProps) {
  const moreAccordionOpen = useExerciseSession((s) => s.moreAccordionOpen);
  const setMoreAccordionOpen = useExerciseSession((s) => s.setMoreAccordionOpen);
  const { translationLang } = usePlayer();

  // Wrong-answer explanation: what the user picked and why it's wrong
  const wrongChoiceNote =
    !isCorrect && chosenAnswer !== question.correctAnswer
      ? `「${chosenAnswer}」is not the answer being asked for here.`
      : null;

  // Distractor VocabInfo for wrong-pick callout popover (if available)
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

      {/* Wrong answer: show correct answer first */}
      {!isCorrect && (
        <p className="mb-1 text-sm text-gray-300">
          <span className="font-medium text-green-400">Correct answer:</span>{" "}
          {question.correctAnswer}
        </p>
      )}

      {/* Wrong answer: explain why user's choice was wrong.
          If distractorVocab is available, wrap in a mastery popover. */}
      {wrongChoiceNote && (
        <p className="mb-2 text-sm text-gray-400">
          {wrongVocab?.vocab_item_id ? (
            <MasteryDetailPopover
              vocabItemId={wrongVocab.vocab_item_id}
              userId={userId}
              trigger={
                <span className="text-red-400">
                  「{wrongVocab.surface}」
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
        {/* Meaning below the vocab surface block */}
        <p className="mt-1 text-sm text-gray-400">
          {typeof question.vocabInfo.surface !== "undefined"
            ? question.explanation
            : null}
        </p>
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

      {/* Inline accordion body — persists across questions via Zustand */}
      {hasMoreContent && moreAccordionOpen && (
        <div className="mt-3 flex flex-col gap-3" data-testid="feedback-more-accordion">
          {question.detailedExplanation && (
            <p className="text-sm text-gray-400">{question.detailedExplanation}</p>
          )}
          {question.mnemonic && (
            <div className="rounded-md border border-indigo-500/20 bg-indigo-900/20 p-3">
              <p className="mb-1 text-xs uppercase tracking-wider text-indigo-400">Memory tip</p>
              <p className="text-sm text-gray-300">{localize(question.mnemonic, translationLang)}</p>
            </div>
          )}
          {hasKanjiBreakdown && question.kanji_breakdown && (
            <KanjiBreakdownSection breakdown={question.kanji_breakdown} lang={translationLang} />
          )}
        </div>
      )}
    </div>
  );
}
