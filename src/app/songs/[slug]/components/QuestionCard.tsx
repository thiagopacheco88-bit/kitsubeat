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
  const startTimeRef = useRef<number>(0);
  const feedbackRef = useRef<HTMLDivElement>(null);

  // Pull tier state from the session store
  const { tiers, revealedQuestionIds, markRevealed, setTier } =
    useExerciseSession();
  // Phase 11.6 D-15: thread server-returned versesDominatedNow into the
  // store so VerseDominatedAnimation (mounted in FeedbackPanel) fires the
  // overlay + confetti when an answer here tips a verse to dominated.
  const setVersesDominatedNow = useExerciseSession(
    (s) => s.setVersesDominatedNow
  );

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

  useEffect(() => {
    startTimeRef.current = performance.now();
  }, [question.id]);

  // Shuffle options ONCE per question ID (stable across re-renders)
  const options = useMemo(
    () => shuffle([question.correctAnswer, ...question.distractors]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [question.id]
  );

  const handleSelect = (option: string) => {
    if (chosen !== null) return; // already answered

    // eslint-disable-next-line react-hooks/purity -- event timestamp, not render output
    const timeMs = Math.max(0, Math.round(performance.now() - startTimeRef.current));
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
        // Phase 11.6 D-15: trigger verse-domination animation when this
        // answer tips one or more verses. Server returns [] on revisit
        // (Plan 11.6-05 ON CONFLICT DO NOTHING) so this is fire-once per
        // (user, verse) by construction.
        if (result.versesDominatedNow.length > 0) {
          setVersesDominatedNow(result.versesDominatedNow);
        }
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
    <div
      data-question-id={question.id}
      data-question-type={question.type}
      className="flex flex-col gap-4 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card-ring)] sm:p-5"
    >
      <div className="flex flex-col gap-2 rounded-[var(--radius-lg)] bg-[var(--color-card-2)] p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
          {question.type.replace(/_/g, " ")}
        </p>
        <div className="text-xl font-bold leading-snug text-[var(--color-text)]">
          {renderPrompt()}
        </div>
      </div>

      {/* Reveal reading button — visible only when unanswered, tier > 1, and not yet revealed */}
      {chosen === null && targetTier !== 1 && !revealed && (
        <button
          type="button"
          onClick={() => markRevealed(question.id)}
          className="min-h-11 self-start rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-2)] px-3 py-2 text-xs font-semibold text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
        >
          Reveal reading
        </button>
      )}

      {/* Answer options — 2x2 grid on wide screens, single column on mobile */}
      <ul role="list" aria-label="Answer choices" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <li key={option} role="listitem">
            <button
              type="button"
              onClick={() => handleSelect(option)}
              disabled={chosen !== null}
              aria-pressed={chosen === option}
              className={`min-h-[44px] w-full rounded-[var(--radius-lg)] border px-4 py-3 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 ${getOptionStyle(option)}`}
            >
              {renderOption(option)}
            </button>
          </li>
        ))}
      </ul>

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
