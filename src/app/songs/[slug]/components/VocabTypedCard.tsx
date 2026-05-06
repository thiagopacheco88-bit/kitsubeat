"use client";

import { useState, useRef, useEffect } from "react";
import type { Question } from "@/lib/exercises/generator";
import { romajiEquals } from "@/lib/exercises/romaji-normalize";
import { Button } from "@/components/ui/Button";
import KanjiBreakdownSection from "./KanjiBreakdownSection";

interface Props {
  question: Question;
  onAnswered: (chosen: string, correct: boolean, timeMs: number) => void;
  onContinue: () => void;
  lang?: string;
}

/**
 * VocabTypedCard — Phase 11.6 SPEC-REQ-7 / SPEC-REQ-3
 *
 * Romaji typed-input exercise for Kanji track and Advanced Drills.
 * Pattern mirrors GrammarWriteCard verbatim with the prompt swapped to
 * kanji surface + image + meaning hint.
 *
 * Security notes:
 *   - User input is rendered via React value={input} — auto-escaped, no XSS.
 *   - Image URL is server-generated (/vocab-images/<UUID>.png or Unsplash CDN).
 *     Uses plain <img loading="lazy"> per Phase 11.4 D-06 (NOT next/image).
 *   - Kanji surface comes from server-generated lesson content (same surface as
 *     GrammarWriteCard prompt_jp_furigana per PATTERNS.md). React auto-escaping.
 *   - Empty / whitespace input: early-exit in handleSubmit before grading (T-11.6-09-03).
 */
export default function VocabTypedCard({
  question,
  onAnswered,
  onContinue,
  lang = "en",
}: Props) {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const startTimeRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when the question changes (session advances to next word)
  useEffect(() => {
    // Existing card lifecycle intentionally resets the local answer state when
    // the session advances to a new question.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInput("");
    setSubmitted(false);
    setIsCorrect(false);
    setImageFailed(false);
    startTimeRef.current = performance.now();
    // Auto-focus the input for fast typing on each new question
    inputRef.current?.focus();
  }, [question.id]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitted) return;
    const trimmed = input.trim();
    // T-11.6-09-03: empty input never grades as correct
    if (!trimmed) return;
    const correct = romajiEquals(trimmed, question.correctAnswer);
    setIsCorrect(correct);
    setSubmitted(true);
    onAnswered(trimmed, correct, Math.max(0, Math.round(performance.now() - startTimeRef.current)));
  }

  const meaningText = question.meaning_en ?? question.vocabInfo.romaji ?? "";
  const hasKanjiBreakdown =
    question.kanji_breakdown != null &&
    question.kanji_breakdown.characters.length > 0;

  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-card-ring)]">
      {/* Image above the prompt — Phase 11.4 D-06 pattern: plain <img loading="lazy">, NOT next/image */}
      {question.image_url && !imageFailed && (
        <div className="mb-2 flex justify-center">
          <img
            src={question.image_url}
            alt={meaningText || "vocabulary mnemonic"}
            width={224}
            height={224}
            loading="lazy"
            onError={() => setImageFailed(true)}
            data-testid="vocab-typed-image"
            className="aspect-square w-56 h-56 rounded-md object-cover"
          />
        </div>
      )}

      {/* Prompt: kanji surface + meaning hint */}
      <div className="text-center">
        <p
          data-testid="vocab-typed-surface"
          className="text-3xl font-semibold text-[var(--color-text)]"
        >
          {question.vocabInfo.surface}
        </p>
        {meaningText && (
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">{meaningText}</p>
        )}
      </div>

      {/* Optional kanji breakdown for Kanji track — shown inline (not accordion) */}
      {hasKanjiBreakdown && question.kanji_breakdown && (
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-card-2)] p-3">
          <KanjiBreakdownSection breakdown={question.kanji_breakdown} lang={lang} />
        </div>
      )}

      {/* Romaji input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          disabled={submitted}
          placeholder="type the reading in romaji"
          onChange={(e) => setInput(e.target.value)}
          autoFocus
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          data-testid="vocab-typed-input"
          className="min-h-11 flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-2)] px-3 py-2 text-base text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none disabled:opacity-60"
        />
        <Button
          type="submit"
          disabled={submitted || !input.trim()}
        >
          Check
        </Button>
      </form>

      {/* Feedback — correct / not quite, with Continue button */}
      {submitted && (
        <div
          className={`flex flex-col gap-3 rounded-[var(--radius-lg)] border bg-[var(--color-bg)] p-4 ${
            isCorrect ? "border-[var(--color-jlpt-n5-ring)]" : "border-[var(--color-accent)]/40"
          }`}
          data-testid="vocab-typed-feedback"
        >
          <div className="text-sm text-[var(--color-text-muted)]">
            {isCorrect ? (
              <span className="text-[var(--color-jlpt-n5)]">Correct.</span>
            ) : (
              <span className="text-[var(--color-accent-readable)]">
                Not quite — the answer is{" "}
                <span className="font-semibold text-[var(--color-text)]">
                  {question.correctAnswer}
                </span>
                .
              </span>
            )}
          </div>
          {/* Furigana of the correct reading for learning reinforcement */}
          {!isCorrect && (
            <div className="text-xs text-[var(--color-text-dim)]">
              Reading:{" "}
              <span className="text-[var(--color-text-muted)]">{question.vocabInfo.reading}</span>
            </div>
          )}
          <Button
            type="button"
            onClick={onContinue}
            size="sm"
            className="self-end"
          >
            Continue
          </Button>
        </div>
      )}
    </div>
  );
}
