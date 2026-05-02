"use client";

import { useMemo, useState } from "react";
import type { GrammarSessionQuestion } from "@/lib/types/lesson";
import { localize } from "@/lib/types/lesson";
import { shuffle } from "@/lib/exercises/generator";
import { Button } from "@/components/ui/Button";

interface Props {
  question: GrammarSessionQuestion;
  /**
   * Fires when the user picks an option. The parent computes FSRS rating and
   * advances — this card only reports selection + correctness + elapsed ms.
   */
  onAnswered: (chosen: string, correct: boolean, timeMs: number) => void;
  onContinue: () => void;
  /** UI language for translations and hints. Defaults to English. */
  lang?: string;
}

/**
 * Grammar Session card for beginner + intermediate (mcq_fill_blank).
 *
 * Beginner shows the romaji aid below the JP prompt; intermediate hides it and
 * surfaces a JP ↔ translation toggle instead. Advanced uses GrammarWriteCard.
 */
export default function GrammarMcqCard({
  question,
  onAnswered,
  onContinue,
  lang = "en",
}: Props) {
  const { rule, level, exercise } = question;
  const [chosen, setChosen] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [startTime] = useState(() => Date.now());
  const [showTranslation, setShowTranslation] = useState(false);

  const options = useMemo(
    () => shuffle([exercise.correct_answer, ...(exercise.distractors ?? [])]),
    [exercise.id, exercise.correct_answer, exercise.distractors]
  );

  const translation = localize(exercise.prompt_translation, lang);
  const explanation = localize(rule.explanation, lang);

  function handlePick(option: string) {
    if (chosen !== null) return;
    const correct = option === exercise.correct_answer;
    setChosen(option);
    setIsCorrect(correct);
    onAnswered(option, correct, Date.now() - startTime);
  }

  const answered = chosen !== null;

  // Phase 14 Plan 14-05: difficulty levels mapped to JLPT alpha tints.
  // beginner=N5(green), intermediate=N3(amber), advanced=N1(red) — semantic
  // hue alignment from the JLPT N5..N1 progression already in the design
  // system (easy→hard).
  const levelClass =
    level === "beginner"
      ? "bg-[var(--color-jlpt-n5-bg)] ring-1 ring-[var(--color-jlpt-n5-ring)] text-[var(--color-text)]"
      : level === "intermediate"
        ? "bg-[var(--color-jlpt-n3-bg)] ring-1 ring-[var(--color-jlpt-n3-ring)] text-[var(--color-text)]"
        : "bg-[var(--color-jlpt-n1-bg)] ring-1 ring-[var(--color-jlpt-n1-ring)] text-[var(--color-text)]";

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
      {/* Rule + level header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wide text-[var(--color-text-dim)]">
            {rule.jlpt_reference} · {rule.name}
          </span>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${levelClass}`}
        >
          {level}
        </span>
      </div>

      {/* JP prompt — rendered as HTML so <ruby> furigana markup is honored.
          The prompt strings come from our own generator, not user input, so the
          HTML source is trusted. */}
      <div
        className="text-2xl leading-relaxed text-[var(--color-text)]"
        dangerouslySetInnerHTML={{ __html: exercise.prompt_jp_furigana }}
      />

      {/* Beginner: romaji aid always on. Intermediate / advanced: JP only. */}
      {level === "beginner" && exercise.prompt_romaji && (
        <div className="text-sm italic text-[var(--color-text-muted)]">
          {exercise.prompt_romaji}
        </div>
      )}

      {/* Intermediate: JP ↔ translation toggle */}
      {level === "intermediate" && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setShowTranslation((v) => !v)}
          className="self-start"
        >
          {showTranslation ? `Hide ${lang.toUpperCase()}` : `Show ${lang.toUpperCase()}`}
        </Button>
      )}
      {(level === "beginner" || (level === "intermediate" && showTranslation)) && (
        <div className="text-sm text-[var(--color-text-muted)]">{translation}</div>
      )}

      {exercise.hint && !answered && (
        <div className="text-xs text-[var(--color-text-dim)]">hint: {exercise.hint}</div>
      )}

      {/* Options */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((opt) => {
          const picked = chosen === opt;
          const isCorrectOption = opt === exercise.correct_answer;
          const showGreen = answered && isCorrectOption;
          const showRed = answered && picked && !isCorrectOption;
          return (
            <button
              key={opt}
              type="button"
              disabled={answered}
              onClick={() => handlePick(opt)}
              className={`rounded-lg border px-4 py-3 text-left text-base transition-colors ${
                showGreen
                  ? "border-[var(--color-jlpt-n5-ring)] bg-[var(--color-jlpt-n5-bg)] text-[var(--color-text)]"
                  : showRed
                    ? "border-[var(--color-accent)]/60 bg-[var(--color-accent)]/10 text-[var(--color-text)]"
                    : "border-[var(--color-border)] bg-[var(--color-card-2)] text-[var(--color-text)] hover:border-[var(--color-border-strong)]"
              } disabled:cursor-not-allowed`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {/* Feedback panel */}
      {answered && (
        <div className="flex flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
          <div className="text-sm text-[var(--color-text-muted)]">
            {isCorrect ? (
              <span className="text-[var(--color-jlpt-n5)]">Correct.</span>
            ) : (
              <span className="text-[var(--color-accent)]">
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
            variant="primary"
            size="sm"
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
