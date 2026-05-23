"use client";

/**
 * ReviewQuestionCard — thin wrapper of the QuestionCard visual shell for /review.
 *
 * Why a wrapper and not direct reuse of QuestionCard:
 * QuestionCard imports useExerciseSession() and calls recordVocabAnswer (the
 * per-song action). Direct reuse would either collide with the per-song session
 * state or require passing the songVersionId. Both are incorrect for the
 * cross-song review context.
 *
 * This file copies the QuestionCard JSX and swaps:
 * - useExerciseSession → useReviewSession (Task 2 store, no song context)
 * - recordVocabAnswer → recordReviewAnswer (Task 2 server action)
 * - The onAnswered callback signature matches the review session's recordAnswer shape.
 *
 * Refactoring QuestionCard to be store-agnostic is deferred to a future
 * shared-primitive phase (documented in 11-05-SUMMARY.md).
 */

import { useEffect, useMemo, useState, useRef } from "react";
import type { Question, VocabInfo } from "@/lib/exercises/generator";
import { useReviewSession } from "@/stores/reviewSession";
import { recordReviewAnswer } from "@/app/actions/review";
import TierText from "@/app/songs/[slug]/components/TierText";
import ReviewFeedbackPanel from "./ReviewFeedbackPanel";
import type { Tier } from "@/lib/fsrs/tier";
import type { ReviewQuestionType } from "@/lib/review/queue-builder";
import { shuffle } from "@/lib/exercises/generator";
import { speakJapanese, hasJapaneseVoice, onVoicesChanged } from "@/lib/tts";

interface ReviewQuestionCardProps {
  question: Question;
  /** The exercise type for this card (from the review queue — never fill_lyric) */
  exerciseType: ReviewQuestionType;
  /** true = this card came from the new-card bucket (affects budget accounting) */
  isNew: boolean;
  /** Phase 11.6: which FSRS card track is being answered. Passed through to recordReviewAnswer. */
  cardKind?: "romaji_meaning" | "kanji_kana";
  /** Called when user selects an answer (before continue) */
  onAnswered: (chosen: string, correct: boolean, timeMs: number) => void;
  /** Called when user clicks Continue in feedback panel */
  onContinue: () => void;
  /** The authenticated user's ID */
  userId: string;
  /** Callback when daily_new_card_cap_reached is thrown — signals ReviewSession to prune new cards */
  onCapReached?: () => void;
}


function SpeakerIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.241 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 01-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06zM15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.06 4.5 4.5 0 000-6.366.75.75 0 010-1.06z" />
    </svg>
  );
}

export default function ReviewQuestionCard({
  question,
  exerciseType,
  isNew,
  cardKind,
  onAnswered,
  onContinue,
  userId,
  onCapReached,
}: ReviewQuestionCardProps) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const feedbackRef = useRef<HTMLDivElement>(null);
  const [voiceReady, setVoiceReady] = useState(false);
  const lastAutoPlayedRef = useRef<string | null>(null);

  // Review session has no per-vocab tier tracking (simpler than exercise session).
  // Default to Tier 1 (full furigana) for all review cards — consistent crutch level.
  const targetTier: Tier = 1;

  // Pull into view after answering
  useEffect(() => {
    if (chosen !== null) {
      feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [chosen]);

  useEffect(() => {
    setVoiceReady(hasJapaneseVoice());
    return onVoicesChanged(() => setVoiceReady(hasJapaneseVoice()));
  }, []);

  // Auto-play when question is Japanese (vocab_meaning, reading_match).
  // voiceReady included so the play fires when voices load async on first mount.
  useEffect(() => {
    if (!voiceReady) return;
    if (exerciseType === "vocab_meaning" || exerciseType === "reading_match") {
      if (lastAutoPlayedRef.current !== question.id) {
        lastAutoPlayedRef.current = question.id;
        speakJapanese(question.vocabInfo.reading);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id, voiceReady]);

  // Auto-play correct answer when answer is Japanese (meaning_vocab)
  useEffect(() => {
    if (!voiceReady || chosen === null) return;
    if (exerciseType === "meaning_vocab") {
      speakJapanese(question.vocabInfo.reading);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosen]);

  // Shuffle options ONCE per question ID (stable across re-renders)
  const options = useMemo(
    () => shuffle([question.correctAnswer, ...question.distractors]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [question.id]
  );

  const handleSelect = (option: string) => {
    if (chosen !== null) return; // already answered

    const timeMs = Date.now() - startTimeRef.current;
    const correct = option === question.correctAnswer;
    setChosen(option);
    setIsCorrect(correct);
    // Notify parent (records answer in review store)
    onAnswered(option, correct, timeMs);

    // Fire-and-await FSRS persistence via review server action
    void (async () => {
      try {
        await recordReviewAnswer({
          vocabItemId: question.vocabItemId,
          exerciseType, // already excludes fill_lyric at type level
          cardKind,     // Phase 11.6: thread through to keyed (user_id, vocab_item_id, card_kind) upsert
          correct,
          revealedReading: false, // review session has no reveal-reading button
          responseTimeMs: timeMs,
          isNew,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message === "daily_new_card_cap_reached") {
          // Budget exhausted mid-session — signal ReviewSession to prune new cards.
          onCapReached?.();
        } else {
          console.error("recordReviewAnswer failed:", err);
          // Non-fatal for other errors: UI still proceeds.
        }
      }
    })();
  };

  // Phase 14 Plan 14-09 (D-PRE-10): MCQ feedback uses JLPT-alpha semantic-color
  // reuse pattern from Plan 14-07 (review's daily-cap toast) and Plan 14-08
  // (KanaQuestionCard MCQ): --color-jlpt-n5 alpha for correct (green), accent
  // alpha for wrong (red, == --color-jlpt-n1). Default + disabled states use
  // card-2 surface + border-strong + text-text-muted. No new --color-success
  // /--color-error tokens introduced.
  const getOptionStyle = (option: string): string => {
    if (chosen === null) {
      return "border-[var(--color-border-strong)] bg-[var(--color-card-2)] text-[var(--color-text)] hover:border-[var(--color-text-muted)] hover:bg-[var(--color-card)]";
    }
    if (option === question.correctAnswer) {
      return "border-[var(--color-jlpt-n5)] bg-[var(--color-jlpt-n5-bg)] text-[var(--color-text)]";
    }
    if (option === chosen && !isCorrect) {
      return "border-[var(--color-accent)] bg-[var(--color-jlpt-n1-bg)] text-[var(--color-text)]";
    }
    return "border-[var(--color-border)] bg-[var(--color-card-2)] text-[var(--color-text-dim)]";
  };

  const renderPrompt = () => {
    switch (exerciseType) {
      case "vocab_meaning":
        return (
          <TierText
            vocab={question.vocabInfo}
            tier={targetTier}
            mode="prompt"
          />
        );
      case "reading_match":
        return (
          <TierText
            vocab={question.vocabInfo}
            tier={targetTier}
            mode="prompt"
            forceKanjiOnly
          />
        );
      case "meaning_vocab":
        return (
          <span className="text-xl font-bold leading-snug text-[var(--color-text)]">
            {question.prompt}
          </span>
        );
    }
  };

  const renderOption = (option: string) => {
    switch (exerciseType) {
      case "vocab_meaning":
      case "reading_match":
        return <span>{option}</span>;
      case "meaning_vocab": {
        const isCorrectOption = option === question.correctAnswer;
        const vocabInfo: VocabInfo | undefined = isCorrectOption
          ? question.vocabInfo
          : question.distractorVocab?.[option];

        if (!vocabInfo) {
          return <span>{option}</span>;
        }
        return (
          <TierText
            vocab={vocabInfo}
            tier={targetTier}
            mode="option"
            forceKanjiOnly
          />
        );
      }
    }
  };

  return (
    <div data-question-id={question.id} data-question-type={exerciseType} className="flex flex-col gap-4">
      <p className="text-xs uppercase tracking-wider text-[var(--color-text-dim)]">
        {exerciseType.replace(/_/g, " ")}
      </p>

      <div className="flex items-start justify-between gap-2">
        <div className="text-xl font-bold leading-snug text-[var(--color-text)]">
          {renderPrompt()}
        </div>
        {voiceReady && (exerciseType === "vocab_meaning" || exerciseType === "reading_match") && (
          <button
            type="button"
            onClick={() => speakJapanese(question.vocabInfo.reading)}
            aria-label="Play pronunciation"
            className="inline-flex h-11 w-11 min-h-11 min-w-11 flex-shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-card-2)] hover:text-[var(--color-text)]"
          >
            <SpeakerIcon />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => handleSelect(option)}
            disabled={chosen !== null}
            className={`rounded-[var(--radius-md)] border px-4 py-3 text-left text-sm font-medium transition-colors ${getOptionStyle(option)}`}
          >
            {renderOption(option)}
          </button>
        ))}
      </div>

      {chosen !== null && voiceReady && exerciseType === "meaning_vocab" && (
        <button
          type="button"
          onClick={() => speakJapanese(question.vocabInfo.reading)}
          aria-label="Hear answer"
          className="inline-flex items-center gap-2 self-start rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-2)] px-3 py-2 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          <SpeakerIcon />
          Hear answer
        </button>
      )}

      {chosen !== null && (
        <div ref={feedbackRef} className="scroll-mb-4">
          <ReviewFeedbackPanel
            question={question}
            chosenAnswer={chosen}
            isCorrect={isCorrect}
            onContinue={onContinue}
            userId={userId}
          />
        </div>
      )}
    </div>
  );
}
