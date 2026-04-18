"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Question } from "@/lib/exercises/generator";
import { useExerciseSession } from "@/stores/exerciseSession";

/**
 * Phase 10 Plan 05 — Sentence Order card.
 *
 * Tap-to-build UI (NOT drag-and-drop — CONTEXT locked). Mobile-first.
 *
 * Flow:
 *   1. On mount, initSentenceOrder(question.id, verseTokens) stamps each
 *      token with a UUID + Fisher-Yates shuffle. No-op on reload if the pool
 *      already exists (persisted by zustand — mid-question refresh is safe).
 *   2. User taps pool tokens → appended to the answer row.
 *   3. User taps answer-row tokens → returned to the pool (last position).
 *   4. "Show hint" reveals question.translation below the answer row.
 *      One-way: once shown, UI does not hide it back. showHint() sets
 *      sentenceOrderHintShown[question.id]=true which maps to
 *      revealedReading=true via the onAnswer meta → FSRS rating=1
 *      (Phase 08.2-01 reveal-hatch).
 *   5. Submit is enabled only when the pool is empty (all tokens placed).
 *      answerStr = answer.map(t => t.surface).join(""); scoring is
 *      all-or-nothing (strict string equality with question.correctAnswer).
 *   6. Wrong-position feedback: after submit, mismatches are highlighted in
 *      red in the answer row.
 *
 * Pitfall 1 invariant: NO data-position / data-correct-index attributes in
 * the rendered DOM. Tokens are keyed by UUID (generated at shuffle time), so
 * devtools cannot read the correct-order index from the DOM.
 */

interface SentenceOrderCardProps {
  question: Question;
  /**
   * Called when user clicks Submit. `meta.revealedReading` propagates up to
   * ExerciseSession → recordVocabAnswer → ratingFor (FSRS rating=1 if true).
   */
  onAnswer: (
    answer: string,
    correct: boolean,
    timeMs: number,
    meta?: { revealedReading?: boolean }
  ) => void;
  /** Called after feedback, when user clicks Continue. */
  onContinue: () => void;
  /** External disable (e.g., during submit network in-flight). */
  disabled?: boolean;
}

export default function SentenceOrderCard({
  question,
  onAnswer,
  onContinue,
  disabled,
}: SentenceOrderCardProps) {
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const feedbackRef = useRef<HTMLDivElement>(null);

  const pool = useExerciseSession(
    (s) => s.sentenceOrderPool[question.id] ?? []
  );
  const answer = useExerciseSession(
    (s) => s.sentenceOrderAnswer[question.id] ?? []
  );
  const hintShown = useExerciseSession(
    (s) => s.sentenceOrderHintShown[question.id] === true
  );
  const _hasHydrated = useExerciseSession((s) => s._hasHydrated);
  const initSentenceOrder = useExerciseSession((s) => s.initSentenceOrder);
  const moveToAnswer = useExerciseSession((s) => s.moveToAnswer);
  const moveToPool = useExerciseSession((s) => s.moveToPool);
  const showHint = useExerciseSession((s) => s.showHint);

  // Initialize the shuffled pool once the store has hydrated from localStorage
  // (running init pre-hydration would overwrite a user's in-flight work on
  // reload). initSentenceOrder is a no-op if the pool already exists.
  useEffect(() => {
    if (!_hasHydrated) return;
    if (!question.verseTokens || question.verseTokens.length === 0) return;
    initSentenceOrder(question.id, question.verseTokens);
  }, [_hasHydrated, question.id, question.verseTokens, initSentenceOrder]);

  // ---------------------------------------------------------------------------
  // Wrong-position map — for post-submit highlight.
  // Compares the user's answer-row surfaces vs verseTokens' original order.
  // All-or-nothing scoring: any position wrong → whole question wrong; but
  // FeedbackPanel-equivalent strip below shows which positions were wrong.
  // ---------------------------------------------------------------------------
  const wrongPositions = useMemo(() => {
    if (!submitted) return new Set<number>();
    const original = (question.verseTokens ?? []).map((t) => t.surface);
    const set = new Set<number>();
    for (let i = 0; i < answer.length; i++) {
      if (answer[i].surface !== original[i]) set.add(i);
    }
    return set;
  }, [submitted, answer, question.verseTokens]);

  // Scroll feedback into view after submission (mirrors QuestionCard behavior).
  useEffect(() => {
    if (submitted) {
      feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [submitted]);

  const canSubmit = pool.length === 0 && answer.length > 0 && !submitted;

  const handleSubmit = () => {
    if (!canSubmit || disabled) return;
    const answerStr = answer.map((t) => t.surface).join("");
    const correct = answerStr === question.correctAnswer;
    const timeMs = Date.now() - startTimeRef.current;
    setIsCorrect(correct);
    setSubmitted(true);
    onAnswer(answerStr, correct, timeMs, { revealedReading: hintShown });
  };

  // ---------------------------------------------------------------------------
  // Shared token button styling helper.
  // In pre-submit state, both pool + answer tokens share a neutral style.
  // Post-submit, answer-row tokens switch to green/red based on correctness.
  // ---------------------------------------------------------------------------
  const tokenClassName = (slot: "pool" | "answer", isWrong?: boolean) => {
    if (slot === "answer" && submitted) {
      return isWrong
        ? "border-red-500 bg-red-500/10 text-white"
        : "border-green-500 bg-green-500/10 text-white";
    }
    return "border-gray-600 bg-gray-800 text-white hover:border-gray-400 hover:bg-gray-700";
  };

  return (
    <div
      data-question-id={question.id}
      data-question-type={question.type}
      className="flex flex-col gap-4"
    >
      {/* Question type label */}
      <p className="text-xs uppercase tracking-wider text-gray-500">
        sentence order
      </p>

      {/* Prompt */}
      <div className="text-lg font-semibold leading-snug text-white">
        {question.prompt}
      </div>

      {/* Answer row — the tokens the user has tapped, in order */}
      <div
        aria-label="Your answer"
        className="flex min-h-[60px] flex-wrap items-start gap-2 rounded-lg border border-dashed border-gray-700 bg-gray-900/40 p-3"
      >
        {answer.length === 0 && (
          <span className="text-sm text-gray-500">
            Tap words below to build the verse
          </span>
        )}
        {answer.map((token, i) => (
          <button
            key={token.uuid}
            type="button"
            data-token-uuid={token.uuid}
            disabled={submitted || disabled}
            onClick={() => moveToPool(question.id, token.uuid)}
            className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-80 ${tokenClassName(
              "answer",
              wrongPositions.has(i)
            )}`}
          >
            {token.surface}
          </button>
        ))}
      </div>

      {/* Pool row — remaining tokens */}
      <div
        aria-label="Word pool"
        className="flex flex-wrap items-start gap-2 rounded-lg border border-gray-800 bg-gray-900/20 p-3"
      >
        {pool.map((token) => (
          <button
            key={token.uuid}
            type="button"
            data-token-uuid={token.uuid}
            disabled={submitted || disabled}
            onClick={() => moveToAnswer(question.id, token.uuid)}
            className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${tokenClassName("pool")}`}
          >
            {token.surface}
          </button>
        ))}
        {pool.length === 0 && answer.length > 0 && !submitted && (
          <span className="text-sm text-gray-500">
            All words placed — ready to submit.
          </span>
        )}
      </div>

      {/* Show hint toggle — one-way reveal-hatch. */}
      {!submitted && question.translation && (
        <div className="flex flex-col gap-2">
          {!hintShown ? (
            <button
              type="button"
              onClick={() => showHint(question.id)}
              disabled={disabled}
              className="self-start text-xs underline text-gray-400 hover:text-gray-200"
            >
              Show hint (penalty: FSRS rating drops to 1)
            </button>
          ) : (
            <p className="self-start rounded-md border border-yellow-800/50 bg-yellow-900/20 px-3 py-2 text-xs text-yellow-200">
              Hint: {question.translation}
            </p>
          )}
        </div>
      )}

      {/* Submit button — enabled only when pool is empty */}
      {!submitted && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || disabled}
          className="self-start rounded-lg border border-red-600 bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:border-gray-700 disabled:bg-gray-800 disabled:text-gray-500"
        >
          Submit
        </button>
      )}

      {/* Feedback strip — all-or-nothing scoring + wrong-position visual in-row */}
      {submitted && (
        <div
          ref={feedbackRef}
          data-feedback={isCorrect ? "correct" : "wrong"}
          className={`mt-2 flex flex-col gap-3 rounded-lg border p-4 ${
            isCorrect
              ? "border-green-500/30 bg-green-500/10"
              : "border-red-500/30 bg-red-500/10"
          }`}
        >
          <div className="flex items-center gap-2">
            {isCorrect ? (
              <span className="text-lg text-green-400">&#10003;</span>
            ) : (
              <span className="text-lg text-red-400">&#10007;</span>
            )}
            <span
              className={`font-semibold ${
                isCorrect ? "text-green-400" : "text-red-400"
              }`}
            >
              {isCorrect ? "Correct!" : "Not quite"}
            </span>
          </div>

          {!isCorrect && (
            <p className="text-sm text-gray-300">
              <span className="font-medium text-green-400">Correct order:</span>{" "}
              {question.correctAnswer}
            </p>
          )}

          {!isCorrect && wrongPositions.size > 0 && (
            <p className="text-xs text-gray-400">
              {wrongPositions.size === 1
                ? "1 word was in the wrong place."
                : `${wrongPositions.size} words were in the wrong place.`}
            </p>
          )}

          {question.explanation && (
            <p className="text-xs text-gray-300">{question.explanation}</p>
          )}

          <button
            type="button"
            onClick={onContinue}
            className="self-end rounded-md border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-gray-400 hover:bg-gray-700"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
