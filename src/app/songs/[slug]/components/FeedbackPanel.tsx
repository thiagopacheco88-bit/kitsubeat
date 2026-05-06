"use client";

import { useState } from "react";
import type { Question } from "@/lib/exercises/generator";
import { localize } from "@/lib/types/lesson";
import { useExerciseSession } from "@/stores/exerciseSession";
import { usePlayer } from "./PlayerContext";
import TierText from "./TierText";
import MasteryDetailPopover from "./MasteryDetailPopover";
import KanjiBreakdownSection from "./KanjiBreakdownSection";
import { Button } from "@/components/ui/Button";
import VerseDominatedAnimation from "./VerseDominatedAnimation";

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
  // Phase 11.4: silent-fail flag for the optional Unsplash image (D-07).
  const [imageFailed, setImageFailed] = useState(false);

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
    !!question.detailedExplanation ||
    !!question.mnemonic ||
    hasKanjiBreakdown;

  return (
    <div
      data-feedback={isCorrect ? "correct" : "wrong"}
      className={`mt-4 rounded-[var(--radius-xl)] border p-4 shadow-[var(--shadow-card-ring)] ${
        isCorrect
          ? "border-[var(--color-jlpt-n5-ring)] bg-[var(--color-jlpt-n5-bg)]"
          : "border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10"
      }`}
    >
      {/* Phase 11.6 D-15 — verse-domination animation overlay.
          Subscribes to useExerciseSession.versesDominatedNow; fires once per
          (user, verse) when the server marks a verse dominated on the latest
          answer. Mounted at the top so the confetti origin sits at the
          FeedbackPanel's vertical centre. */}
      <VerseDominatedAnimation />

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

      {/* Phase 11.4: optional Unsplash image — always visible when image_url present.
          Originally inside the More accordion (D-04) but promoted to top-level on
          UAT feedback to make it discoverable without an extra tap. 112x112 numeric
          attrs prevent CLS; silent collapse on fetch error per D-07. */}
      {question.image_url && !imageFailed && (
        <div className="mb-3 flex justify-center">
          <img
            src={question.image_url}
            alt={question.meaning_en ?? ""}
            width={112}
            height={112}
            loading="lazy"
            onError={() => {
              console.warn(
                `[FeedbackPanel] image failed: ${question.image_url} (${question.vocabItemId})`
              );
              setImageFailed(true);
            }}
            data-testid="feedback-image"
            className="aspect-square w-28 h-28 rounded-md object-cover"
          />
        </div>
      )}

      {/* Wrong answer: show correct answer first */}
      {!isCorrect && (
        <p className="mb-1 text-sm text-[var(--color-text-muted)]">
          <span className="font-medium text-[var(--color-jlpt-n5)]">Correct answer:</span>{" "}
          {question.correctAnswer}
        </p>
      )}

      {/* Wrong answer: explain why user's choice was wrong.
          If distractorVocab is available, wrap in a mastery popover. */}
      {wrongChoiceNote && (
        <p className="mb-2 text-sm text-[var(--color-text-muted)]">
          {wrongVocab?.vocab_item_id ? (
            <MasteryDetailPopover
              vocabItemId={wrongVocab.vocab_item_id}
              userId={userId}
              trigger={
                <span className="text-[var(--color-accent)]">
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
      <div className="mb-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)]/60 p-3">
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
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {typeof question.vocabInfo.surface !== "undefined"
            ? question.explanation
            : null}
        </p>
      </div>

      {/* Explanation */}
      <p className="text-sm text-[var(--color-text-muted)]">{question.explanation}</p>

      {/* Action row */}
      <div className="mt-3 flex items-center gap-3">
        <Button
          variant="primary"
          size="sm"
          onClick={onContinue}
        >
          Continue
        </Button>
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

      {/* Inline accordion body — persists across questions via Zustand */}
      {hasMoreContent && moreAccordionOpen && (
        <div className="mt-3 flex flex-col gap-3" data-testid="feedback-more-accordion">
          {question.detailedExplanation && (
            <p className="text-sm text-[var(--color-text-muted)]">{question.detailedExplanation}</p>
          )}
          {question.mnemonic && (
            <div className="rounded-md border border-[var(--color-jlpt-n4-ring)] bg-[var(--color-jlpt-n4-bg)] p-3">
              <p className="mb-1 text-xs uppercase tracking-wider" style={{ color: "var(--color-jlpt-n4)" }}>Memory tip</p>
              <p className="text-sm text-[var(--color-text-muted)]">{localize(question.mnemonic, translationLang)}</p>
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
