"use client";

import { useMemo, useState } from "react";
import type { GrammarSessionQuestion } from "@/lib/types/lesson";
import { localize } from "@/lib/types/lesson";
import { shuffle } from "@/lib/exercises/generator";

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

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-gray-800 bg-gray-900 p-5">
      {/* Rule + level header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wide text-gray-500">
            {rule.jlpt_reference} · {rule.name}
          </span>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
            level === "beginner"
              ? "bg-emerald-900/50 text-emerald-300"
              : level === "intermediate"
                ? "bg-amber-900/50 text-amber-300"
                : "bg-red-900/50 text-red-300"
          }`}
        >
          {level}
        </span>
      </div>

      {/* JP prompt — rendered as HTML so <ruby> furigana markup is honored.
          The prompt strings come from our own generator, not user input, so the
          HTML source is trusted. */}
      <div
        className="text-2xl leading-relaxed text-white"
        dangerouslySetInnerHTML={{ __html: exercise.prompt_jp_furigana }}
      />

      {/* Beginner: romaji aid always on. Intermediate / advanced: JP only. */}
      {level === "beginner" && exercise.prompt_romaji && (
        <div className="text-sm italic text-gray-400">
          {exercise.prompt_romaji}
        </div>
      )}

      {/* Intermediate: JP ↔ translation toggle */}
      {level === "intermediate" && (
        <button
          type="button"
          onClick={() => setShowTranslation((v) => !v)}
          className="self-start rounded-md border border-gray-700 bg-gray-800 px-2.5 py-1 text-xs text-gray-300 hover:bg-gray-700"
        >
          {showTranslation ? `Hide ${lang.toUpperCase()}` : `Show ${lang.toUpperCase()}`}
        </button>
      )}
      {(level === "beginner" || (level === "intermediate" && showTranslation)) && (
        <div className="text-sm text-gray-300">{translation}</div>
      )}

      {exercise.hint && !answered && (
        <div className="text-xs text-gray-500">hint: {exercise.hint}</div>
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
                  ? "border-emerald-500/60 bg-emerald-900/30 text-emerald-200"
                  : showRed
                    ? "border-red-500/60 bg-red-900/30 text-red-200"
                    : "border-gray-700 bg-gray-800 text-white hover:border-gray-500"
              } disabled:cursor-not-allowed`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {/* Feedback panel */}
      {answered && (
        <div className="flex flex-col gap-3 rounded-lg border border-gray-800 bg-gray-950 p-4">
          <div className="text-sm text-gray-300">
            {isCorrect ? (
              <span className="text-emerald-400">Correct.</span>
            ) : (
              <span className="text-red-400">
                Not quite — the answer is{" "}
                <span className="font-semibold text-white">
                  {exercise.correct_answer}
                </span>
                .
              </span>
            )}
          </div>
          <div className="text-xs text-gray-400">{explanation}</div>
          <button
            type="button"
            onClick={onContinue}
            className="self-end rounded-md bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
