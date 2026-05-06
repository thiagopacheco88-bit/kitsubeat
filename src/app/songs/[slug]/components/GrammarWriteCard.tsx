"use client";

import { useState } from "react";
import type { GrammarSessionQuestion } from "@/lib/types/lesson";
import { localize } from "@/lib/types/lesson";
import { romajiEquals } from "@/lib/exercises/romaji-normalize";
import { Button } from "@/components/ui/Button";

interface Props {
  question: GrammarSessionQuestion;
  onAnswered: (chosen: string, correct: boolean, timeMs: number) => void;
  onContinue: () => void;
  lang?: string;
}

/**
 * Grammar Session card for advanced level (write_romaji).
 *
 * Free-text romaji input. User's typed answer is compared to the bank's
 * correct_answer via romajiEquals (tolerates macron / Hepburn spelling drift).
 */
export default function GrammarWriteCard({
  question,
  onAnswered,
  onContinue,
  lang = "en",
}: Props) {
  const { rule, exercise } = question;
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [startTime] = useState(() => performance.now());

  const translation = localize(exercise.prompt_translation, lang);
  const explanation = localize(rule.explanation, lang);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitted) return;
    const trimmed = input.trim();
    if (!trimmed) return;
    const correct = romajiEquals(trimmed, exercise.correct_answer);
    setIsCorrect(correct);
    setSubmitted(true);
    onAnswered(trimmed, correct, Math.max(0, Math.round(performance.now() - startTime)));
  }

  return (
    <div className="flex flex-col gap-5 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card-ring)]">
      {/* JLPT + level only — rule name hidden so the gloss doesn't telegraph
          the answer. Same rationale as GrammarMcqCard. */}
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-[var(--color-text-dim)]">
          {rule.jlpt_reference}
        </span>
        <span className="rounded-[var(--radius-pill)] bg-[var(--color-accent)]/15 px-2 py-0.5 text-xs font-medium text-[var(--color-accent-readable)]">
          advanced
        </span>
      </div>

      <div
        className="text-2xl leading-relaxed text-[var(--color-text)]"
        dangerouslySetInnerHTML={{ __html: exercise.prompt_jp_furigana }}
      />

      {/* Translation is the only hint; advanced never shows romaji. */}
      <div className="text-sm text-[var(--color-text-muted)]">{translation}</div>

      {exercise.hint && !submitted && (
        <div className="text-xs text-[var(--color-text-dim)]">hint: {exercise.hint}</div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          disabled={submitted}
          placeholder="type the answer in romaji"
          onChange={(e) => setInput(e.target.value)}
          autoFocus
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className="min-h-11 flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-2)] px-3 py-2 text-base text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none disabled:opacity-60"
        />
        <Button
          type="submit"
          disabled={submitted || !input.trim()}
        >
          Check
        </Button>
      </form>

      {submitted && (
        <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
          <div className="text-sm text-[var(--color-text-muted)]">
            {isCorrect ? (
              <span className="text-[var(--color-jlpt-n5)]">Correct.</span>
            ) : (
              <span className="text-[var(--color-accent-readable)]">
                Not quite — the answer is{" "}
                <span className="font-semibold text-[var(--color-text)]">
                  {exercise.correct_answer}
                </span>
                .
              </span>
            )}
          </div>
          <div className="text-xs text-[var(--color-text-muted)]">{explanation}</div>
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
