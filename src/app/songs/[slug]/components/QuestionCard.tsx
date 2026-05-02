"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { shuffle, type Question, type VocabInfo, type TrackKind } from "@/lib/exercises/generator";
import { useExerciseSession } from "@/stores/exerciseSession";
import { recordVocabAnswer } from "@/app/actions/exercises";
import TierText from "./TierText";
import FeedbackPanel from "./FeedbackPanel";
import type { Tier } from "@/lib/fsrs/tier";

interface QuestionCardProps {
  question: Question;
  /** Called when user selects an answer (before continue) */
  onAnswered: (chosen: string, correct: boolean, timeMs: number) => void;
  /** Called when user clicks Continue in feedback panel */
  onContinue: () => void;
  /** The authenticated user's ID — used for FSRS answer recording */
  userId: string;
  /** Song version UUID — used for FSRS answer recording */
  songVersionId: string;
  /**
   * Phase 11.6 SPEC-REQ-2: Active track from ExerciseSession. When "vocab" or
   * "grammar", TierText inverts surface hierarchy (romaji becomes the primary
   * teaching signal, kanji becomes a secondary cue) and meaning_vocab options
   * drop forceKanjiOnly so romaji shows on every option.
   */
  trackKind?: TrackKind;
}


export default function QuestionCard({
  question,
  onAnswered,
  onContinue,
  userId,
  songVersionId,
  trackKind,
}: QuestionCardProps) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const feedbackRef = useRef<HTMLDivElement>(null);

  // Pull tier state from the session store
  const { tiers, revealedQuestionIds, markRevealed, setTier } =
    useExerciseSession();

  // Tier for this question's target vocab (default Tier 1 for cold-start)
  const targetTier: Tier = (tiers[question.vocabItemId] ?? 1) as Tier;

  // Whether the user already tapped "Reveal reading" for this question
  const revealed = !!revealedQuestionIds[question.id];

  // Effective tier for the prompt after reveal
  const effectiveTier: Tier = revealed ? 1 : targetTier;

  // Pull the feedback panel (including Continue button) into view after answering.
  useEffect(() => {
    if (chosen !== null) {
      feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
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
    // Notify parent (records answer in store for session resume)
    onAnswered(option, correct, timeMs);

    // Fire-and-await FSRS persistence — non-blocking (UI shows feedback immediately)
    void (async () => {
      try {
        const result = await recordVocabAnswer({
          userId,
          vocabItemId: question.vocabItemId,
          songVersionId,
          exerciseType: question.type,
          correct,
          revealedReading: revealed,
          responseTimeMs: timeMs,
        });
        // Optimistic mid-session tier update so re-encounters show new tier
        setTier(question.vocabItemId, result.newTier);
      } catch (err) {
        console.error("recordVocabAnswer failed:", err);
        // Non-fatal: UI still proceeds; mastery update missed for this attempt
      }
    })();
  };

  const getOptionStyle = (option: string): string => {
    if (chosen === null) {
      // idle state
      return "border-[var(--color-border-strong)] bg-[var(--color-card-2)] text-[var(--color-text)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-card)]";
    }
    if (option === question.correctAnswer) {
      // always highlight correct in green (JLPT N5 alpha tint)
      return "border-[var(--color-jlpt-n5-ring)] bg-[var(--color-jlpt-n5-bg)] text-[var(--color-text)]";
    }
    if (option === chosen && !isCorrect) {
      // user's wrong choice in red (accent)
      return "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-text)]";
    }
    // other non-selected options: dimmed
    return "border-[var(--color-border)] bg-[var(--color-card-2)]/50 text-[var(--color-text-dim)]";
  };

  // ---------------------------------------------------------------------------
  // Prompt rendering — applies tier-aware display per exercise type
  // ---------------------------------------------------------------------------

  const renderPrompt = () => {
    switch (question.type) {
      case "vocab_meaning":
        // Show the target vocab at the user's tier. trackKind=vocab|grammar
        // bypasses tier reveal AND inverts surface hierarchy (romaji-primary).
        return (
          <TierText
            vocab={question.vocabInfo}
            tier={effectiveTier}
            mode="prompt"
            trackKind={trackKind}
          />
        );
      case "reading_match":
        // Always force kanji-only — furigana would leak the romaji answer
        return (
          <TierText
            vocab={question.vocabInfo}
            tier={effectiveTier}
            mode="prompt"
            forceKanjiOnly
          />
        );
      case "meaning_vocab":
      case "fill_lyric":
        // Prompt is a meaning string or verse with blank — render raw
        return (
          <span className="text-xl font-bold leading-snug text-[var(--color-text)]">
            {question.prompt}
          </span>
        );
    }
  };

  // ---------------------------------------------------------------------------
  // Option rendering — applies leak-override matrix per exercise type
  // ---------------------------------------------------------------------------

  const renderOption = (option: string) => {
    switch (question.type) {
      case "vocab_meaning":
        // Options are meaning strings — render raw
        return <span>{option}</span>;
      case "reading_match":
        // Options are romaji strings — render raw
        return <span>{option}</span>;
      case "meaning_vocab":
      case "fill_lyric": {
        // Options are vocab surfaces. For non-vocab/grammar tracks, force
        // kanji-only on all options to prevent furigana from leaking the answer.
        // For vocab/grammar tracks (SPEC-REQ-2), thread trackKind so TierText
        // inverts hierarchy (romaji-primary) — every option shows romaji
        // uniformly so there's no leak vs. a kanji-only option.
        const isCorrectOption = option === question.correctAnswer;
        const vocabInfo: VocabInfo | undefined = isCorrectOption
          ? question.vocabInfo
          : question.distractorVocab?.[option];

        if (!vocabInfo) {
          return <span>{option}</span>;
        }
        const isTrackBypass = trackKind === "vocab" || trackKind === "grammar";
        return (
          <TierText
            vocab={vocabInfo}
            tier={targetTier}
            mode="option"
            trackKind={trackKind}
            forceKanjiOnly={!isTrackBypass}
          />
        );
      }
    }
  };

  return (
    // data-question-id is a UUID — production-safe (reveals nothing about the answer).
    // Used by tests/e2e/exercise-resume-mid-session.spec.ts to track question identity
    // across reloads. The correct answer is NEVER exposed as a data-attribute — tests
    // read it via window.__kbExerciseStore (gated on NEXT_PUBLIC_APP_ENV === 'test').
    <div data-question-id={question.id} data-question-type={question.type} className="flex flex-col gap-4">
      {/* Question type label */}
      <p className="text-xs uppercase tracking-wider text-[var(--color-text-dim)]">
        {question.type.replace(/_/g, " ")}
      </p>

      {/* Question prompt */}
      <div className="text-xl font-bold leading-snug text-[var(--color-text)]">
        {renderPrompt()}
      </div>

      {/* Reveal reading button — visible only when unanswered, tier > 1, and not yet revealed */}
      {chosen === null && targetTier !== 1 && !revealed && (
        <button
          type="button"
          onClick={() => markRevealed(question.id)}
          className="self-start text-xs underline text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          Reveal reading
        </button>
      )}

      {/* Answer options — 2x2 grid on wide screens, single column on mobile */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => handleSelect(option)}
            disabled={chosen !== null}
            className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${getOptionStyle(option)}`}
          >
            {renderOption(option)}
          </button>
        ))}
      </div>

      {/* Inline feedback — shown after answering */}
      {chosen !== null && (
        <div ref={feedbackRef} className="scroll-mb-4">
          <FeedbackPanel
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
