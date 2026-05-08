"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Question } from "@/lib/exercises/generator";
import { useExerciseSession } from "@/stores/exerciseSession";
import { Button } from "@/components/ui/Button";

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
 *      sentenceOrderHintShown[question.id]=true for UI state only —
 *      revealing the hint carries no scoring penalty.
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
  /** Called when user clicks Submit. Hint reveal carries no scoring penalty. */
  onAnswer: (
    answer: string,
    correct: boolean,
    timeMs: number
  ) => void;
  /** Called after feedback, when user clicks Continue. */
  onContinue: () => void;
  /** External disable (e.g., during submit network in-flight). */
  disabled?: boolean;
}

type TokenDisplay = "surface" | "reading" | "romaji";

export default function SentenceOrderCard({
  question,
  onAnswer,
  onContinue,
  disabled,
}: SentenceOrderCardProps) {
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [tokenDisplay, setTokenDisplay] = useState<TokenDisplay>("surface");
  const startTimeRef = useRef<number>(Date.now());
  const feedbackRef = useRef<HTMLDivElement>(null);

  // Surface → {reading, romaji} lookup used by the Kanji/Kana/Romaji toggle.
  // The shuffled pool tokens only carry surface (see SentenceOrderToken in the
  // store), so we resolve reading/romaji from the question's verseTokens here.
  // Duplicate surfaces in a verse (e.g., particle の appearing twice) map to
  // the same reading/romaji, so first-match is correct.
  const tokenLookup = useMemo(() => {
    const map: Record<string, { reading: string; romaji: string }> = {};
    for (const t of question.verseTokens ?? []) {
      if (!map[t.surface]) {
        map[t.surface] = { reading: t.reading, romaji: t.romaji };
      }
    }
    return map;
  }, [question.verseTokens]);

  const renderTokenLabel = (surface: string): string => {
    if (tokenDisplay === "surface") return surface;
    const entry = tokenLookup[surface];
    if (!entry) return surface;
    const field = tokenDisplay === "reading" ? entry.reading : entry.romaji;
    return field || surface;
  };

  // Select the raw Record<string, Token[]> then derive by id — returning
  // `s.sentenceOrderPool[question.id] ?? []` inline would allocate a new []
  // each render for pre-init states, tripping React 19's getSnapshot-cache
  // warning. Slicing the Record by id is stable.
  const poolMap = useExerciseSession((s) => s.sentenceOrderPool);
  const answerMap = useExerciseSession((s) => s.sentenceOrderAnswer);
  const pool = poolMap[question.id];
  const answer = answerMap[question.id];
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
    const ans = answer ?? [];
    for (let i = 0; i < ans.length; i++) {
      if (ans[i].surface !== original[i]) set.add(i);
    }
    return set;
  }, [submitted, answer, question.verseTokens]);

  // Scroll feedback into view after submission (mirrors QuestionCard behavior).
  // JSDOM doesn't implement scrollIntoView — guard to keep unit tests green.
  useEffect(() => {
    if (submitted && typeof feedbackRef.current?.scrollIntoView === "function") {
      feedbackRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [submitted]);

  const poolView = pool ?? [];
  const answerView = answer ?? [];
  const canSubmit =
    poolView.length === 0 && answerView.length > 0 && !submitted;

  const handleSubmit = () => {
    if (!canSubmit || disabled) return;
    const answerStr = answerView.map((t) => t.surface).join("");
    const correct = answerStr === question.correctAnswer;
    const timeMs = Date.now() - startTimeRef.current;
    setIsCorrect(correct);
    setSubmitted(true);
    onAnswer(answerStr, correct, timeMs);
  };

  // ---------------------------------------------------------------------------
  // Shared token button styling helper.
  // In pre-submit state, both pool + answer tokens share a neutral style.
  // Post-submit, answer-row tokens switch to green/red based on correctness.
  //
  // Phase 14 Plan 14-05: green/red are semantic correctness signals; we map
  // green → JLPT N5 alpha tint (already a green-12%/25% token pair in the
  // design system) and red → --color-accent with alpha so the token system
  // covers feedback colors without introducing new success/error tokens.
  // ---------------------------------------------------------------------------
  const tokenClassName = (slot: "pool" | "answer", isWrong?: boolean) => {
    if (slot === "answer" && submitted) {
      return isWrong
        ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-text)]"
        : "border-[var(--color-jlpt-n5-ring)] bg-[var(--color-jlpt-n5-bg)] text-[var(--color-text)]";
    }
    return "border-[var(--color-border-strong)] bg-[var(--color-card-2)] text-[var(--color-text)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-card)]";
  };

  return (
    <div
      data-question-id={question.id}
      data-question-type={question.type}
      className="flex flex-col gap-4"
    >
      {/* Question type label */}
      <p className="text-xs uppercase tracking-wider text-[var(--color-text-dim)]">
        sentence order
      </p>

      {/* Prompt */}
      <div className="text-lg font-semibold leading-snug text-[var(--color-text)]">
        {question.prompt}
      </div>

      {/* Display toggle — Kanji / Kana / Romaji.
          Switches the text shown on every token button without touching the
          stored surface (scoring is always all-or-nothing on surface order). */}
      <div
        role="group"
        aria-label="Token display"
        className="flex items-center gap-1 self-start rounded-md border border-[var(--color-border)] bg-[var(--color-card)]/60 p-1 text-xs"
      >
        {(
          [
            { value: "surface", label: "漢字" },
            { value: "reading", label: "かな" },
            { value: "romaji", label: "Romaji" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTokenDisplay(opt.value)}
            aria-pressed={tokenDisplay === opt.value}
            disabled={disabled}
            className={`rounded px-2 py-1 transition-colors ${
              tokenDisplay === opt.value
                ? "bg-[var(--color-card-2)] text-[var(--color-text)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Answer row — the tokens the user has tapped, in order */}
      <div
        aria-label="Your answer"
        className="flex min-h-15 flex-wrap items-start gap-2 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-card)]/40 p-3"
      >
        {answerView.length === 0 && (
          <span className="text-sm text-[var(--color-text-dim)]">
            Tap words below to build the verse
          </span>
        )}
        {answerView.map((token, i) => (
          <button
            key={token.uuid}
            type="button"
            data-token-uuid={token.uuid}
            disabled={submitted || disabled}
            onClick={() => moveToPool(question.id, token.uuid)}
            aria-pressed={true}
            className={`min-h-[44px] rounded-md border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 disabled:opacity-80 ${tokenClassName(
              "answer",
              wrongPositions.has(i)
            )}`}
          >
            {renderTokenLabel(token.surface)}
          </button>
        ))}
      </div>

      {/* Pool row — remaining tokens */}
      <div
        aria-label="Word pool"
        className="flex flex-wrap items-start gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]/20 p-3"
      >
        {poolView.map((token) => (
          <button
            key={token.uuid}
            type="button"
            data-token-uuid={token.uuid}
            disabled={submitted || disabled}
            onClick={() => moveToAnswer(question.id, token.uuid)}
            aria-pressed={false}
            className={`min-h-[44px] rounded-md border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 disabled:opacity-60 ${tokenClassName("pool")}`}
          >
            {renderTokenLabel(token.surface)}
          </button>
        ))}
        {poolView.length === 0 && answerView.length > 0 && !submitted && (
          <span className="text-sm text-[var(--color-text-dim)]">
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
              className="self-start text-xs underline text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              Show hint
            </button>
          ) : (
            <p className="self-start rounded-md border border-[var(--color-jlpt-n3-ring)] bg-[var(--color-jlpt-n3-bg)] px-3 py-2 text-xs text-[var(--color-text)]">
              Hint: {question.translation}
            </p>
          )}
        </div>
      )}

      {/* Submit button — enabled only when pool is empty */}
      {!submitted && (
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={handleSubmit}
          disabled={!canSubmit || disabled}
          className="self-start"
        >
          Submit
        </Button>
      )}

      {/* Feedback strip — all-or-nothing scoring + wrong-position visual in-row */}
      {submitted && (
        <div
          ref={feedbackRef}
          data-feedback={isCorrect ? "correct" : "wrong"}
          className={`mt-2 flex flex-col gap-3 rounded-lg border p-4 ${
            isCorrect
              ? "border-[var(--color-jlpt-n5-ring)] bg-[var(--color-jlpt-n5-bg)]"
              : "border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10"
          }`}
        >
          <div className="flex items-center gap-2">
            {isCorrect ? (
              <span className="text-lg text-[var(--color-jlpt-n5)]">&#10003;</span>
            ) : (
              <span className="text-lg text-[var(--color-accent)]">&#10007;</span>
            )}
            <span
              className={`font-semibold ${
                isCorrect ? "text-[var(--color-jlpt-n5)]" : "text-[var(--color-accent)]"
              }`}
            >
              {isCorrect ? "Correct!" : "Not quite"}
            </span>
          </div>

          {!isCorrect && (
            <p className="text-sm text-[var(--color-text-muted)]">
              <span className="font-medium text-[var(--color-jlpt-n5)]">Correct order:</span>{" "}
              {question.correctAnswer}
            </p>
          )}

          {!isCorrect && wrongPositions.size > 0 && (
            <p className="text-xs text-[var(--color-text-muted)]">
              {wrongPositions.size === 1
                ? "1 word was in the wrong place."
                : `${wrongPositions.size} words were in the wrong place.`}
            </p>
          )}

          {question.explanation && (
            <p className="text-xs text-[var(--color-text-muted)]">{question.explanation}</p>
          )}

          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onContinue}
            className="self-end"
          >
            Continue
          </Button>
        </div>
      )}
    </div>
  );
}
