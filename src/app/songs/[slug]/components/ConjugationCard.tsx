"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Question } from "@/lib/exercises/generator";
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

/** Fisher-Yates shuffle (unbiased). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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
      } catch (err) {
        console.error("recordVocabAnswer failed (grammar_conjugation):", err);
      }
    })();
  };

  const getOptionStyle = (option: string): string => {
    if (chosen === null) {
      return "border-gray-600 bg-gray-800 text-white hover:border-gray-400 hover:bg-gray-700";
    }
    if (option === question.correctAnswer) {
      return "border-green-500 bg-green-500/10 text-white";
    }
    if (option === chosen && !isCorrect) {
      return "border-red-500 bg-red-500/10 text-white";
    }
    return "border-gray-700 bg-gray-800/50 text-gray-500";
  };

  return (
    <div
      data-question-id={question.id}
      data-question-type="grammar_conjugation"
      className="flex flex-col gap-4"
    >
      <p className="text-xs uppercase tracking-wider text-gray-500">
        grammar conjugation
      </p>

      {/* Base-form scaffold — e.g., "食べる →" */}
      {question.conjugationBase ? (
        <p
          data-conjugation-base={question.conjugationBase}
          className="text-sm text-gray-400"
        >
          <span className="font-semibold text-gray-200">
            {question.conjugationBase}
          </span>{" "}
          <span className="text-gray-500">→</span>
        </p>
      ) : null}

      {/* Verse prompt with the target word blanked — same visual as
          fill_lyric's prompt rendering (classNames duplicated rather than
          extracted; the single line of shared style is lighter than adding a
          new helper component). */}
      <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
        <span className="text-xl font-bold leading-snug text-white">
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
