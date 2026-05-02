"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { shuffle, type Question } from "@/lib/exercises/generator";
import { useExerciseSession } from "@/stores/exerciseSession";
import { recordVocabAnswer } from "@/app/actions/exercises";
import FeedbackPanel from "./FeedbackPanel";

/**
 * Phase 10 Plan 03 — Grammar Conjugation card (Exercise 5).
 *
 * Renders:
 *   1. A subtle "grammar conjugation" header (same typography as
 *      QuestionCard's exercise-type label).
 *   2. The base-form scaffold above the blanked verse (e.g., 「食べる →」).
 *   3. The verse prompt with `_____` where the conjugated target goes —
 *      reuses the fill_lyric verse-blank visual, deliberately avoiding a
 *      parallel UI component for the prompt.
 *   4. Four tappable option buttons (correct + 3 distractors). Styling and
 *      state transitions mirror QuestionCard's option buttons so the user
 *      perceives one unified answer surface across all exercise types.
 *
 * Contract with ExerciseSession:
 *   - `onAnswered(chosen, correct, timeMs)` is called once per question
 *     (first click wins; subsequent clicks are ignored via the `chosen`
 *     state).
 *   - `onContinue` is invoked by the inline FeedbackPanel's Continue button.
 *   - `recordVocabAnswer` is fired-and-awaited for FSRS persistence. Failure
 *     is logged and swallowed (UI still advances) — same pattern as
 *     QuestionCard / ListeningDrillCard.
 */

interface ConjugationCardProps {
  question: Question;
  onAnswered: (chosen: string, correct: boolean, timeMs: number) => void;
  onContinue: () => void;
  userId: string;
  songVersionId: string;
}


export default function ConjugationCard({
  question,
  onAnswered,
  onContinue,
  userId,
  songVersionId,
}: ConjugationCardProps) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const feedbackRef = useRef<HTMLDivElement>(null);

  const setTier = useExerciseSession((s) => s.setTier);
  // Phase 11.6 D-15: thread server-returned versesDominatedNow into the
  // store so VerseDominatedAnimation (mounted in FeedbackPanel) fires the
  // overlay + confetti when this grammar_conjugation answer tips a verse.
  const setVersesDominatedNow = useExerciseSession(
    (s) => s.setVersesDominatedNow
  );

  // Stable option shuffle per question — correct + 3 distractors.
  const options = useMemo(
    () => shuffle([question.correctAnswer, ...question.distractors]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [question.id]
  );

  // Pull the feedback panel into view after answering.
  useEffect(() => {
    if (chosen !== null) {
      feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [chosen]);

  const handleSelect = (option: string) => {
    if (chosen !== null) return;
    const timeMs = Date.now() - startTimeRef.current;
    const correct = option === question.correctAnswer;
    setChosen(option);
    setIsCorrect(correct);
    onAnswered(option, correct, timeMs);

    // FSRS persistence — non-blocking, same shape as QuestionCard. When
    // vocabItemId is the empty-string sentinel (grammar_conjugation may land
    // here if the generator can't match the target verb to a vocab entry),
    // skip the recordVocabAnswer call to avoid noisy per-vocab writes against
    // a non-existent id.
    if (!question.vocabItemId) return;

    void (async () => {
      try {
        const result = await recordVocabAnswer({
          userId,
          vocabItemId: question.vocabItemId,
          songVersionId,
          exerciseType: question.type,
          correct,
          revealedReading: false,
          responseTimeMs: timeMs,
        });
        setTier(question.vocabItemId, result.newTier);
        // Phase 11.6 D-15: trigger verse-domination animation when this
        // answer tips a verse. Server returns [] on revisit (Plan 11.6-05
        // ON CONFLICT DO NOTHING) so this is fire-once per (user, verse).
        if (result.versesDominatedNow.length > 0) {
          setVersesDominatedNow(result.versesDominatedNow);
        }
      } catch (err) {
        console.error("recordVocabAnswer failed (grammar_conjugation):", err);
      }
    })();
  };

  const getOptionStyle = (option: string): string => {
    if (chosen === null) {
      return "border-[var(--color-border-strong)] bg-[var(--color-card-2)] text-[var(--color-text)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-card)]";
    }
    if (option === question.correctAnswer) {
      return "border-[var(--color-jlpt-n5-ring)] bg-[var(--color-jlpt-n5-bg)] text-[var(--color-text)]";
    }
    if (option === chosen && !isCorrect) {
      return "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-text)]";
    }
    return "border-[var(--color-border)] bg-[var(--color-card-2)]/50 text-[var(--color-text-dim)]";
  };

  return (
    <div
      data-question-id={question.id}
      data-question-type="grammar_conjugation"
      className="flex flex-col gap-4"
    >
      <p className="text-xs uppercase tracking-wider text-[var(--color-text-dim)]">
        grammar conjugation
      </p>

      {/* Base-form scaffold — e.g., "食べる →" */}
      {question.conjugationBase ? (
        <p
          data-conjugation-base={question.conjugationBase}
          className="text-sm text-[var(--color-text-muted)]"
        >
          <span className="font-semibold text-[var(--color-text)]">
            {question.conjugationBase}
          </span>{" "}
          <span className="text-[var(--color-text-dim)]">→</span>
        </p>
      ) : null}

      {/* Verse prompt with the target word blanked — same visual as
          fill_lyric's prompt rendering (classNames duplicated rather than
          extracted; the single line of shared style is lighter than adding a
          new helper component). */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <span className="text-xl font-bold leading-snug text-[var(--color-text)]">
          {question.prompt}
        </span>
      </div>

      {/* Answer options — 2x2 grid matching QuestionCard */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => handleSelect(option)}
            disabled={chosen !== null}
            className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${getOptionStyle(
              option
            )}`}
          >
            {option}
          </button>
        ))}
      </div>

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
