"use client";

import { useState } from "react";
import type { GrammarSessionQuestion } from "@/lib/types/lesson";
import { localize } from "@/lib/types/lesson";
import { romajiEquals } from "@/lib/exercises/romaji-normalize";

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
  const [startTime] = useState(() => Date.now());

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
    onAnswered(trimmed, correct, Date.now() - startTime);
  }

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-gray-800 bg-gray-900 p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-gray-500">
          {rule.jlpt_reference} · {rule.name}
        </span>
        <span className="rounded-full bg-red-900/50 px-2 py-0.5 text-[11px] font-medium text-red-300">
          advanced
        </span>
      </div>

      <div
        className="text-2xl leading-relaxed text-white"
        dangerouslySetInnerHTML={{ __html: exercise.prompt_jp_furigana }}
      />

      {/* Translation is the only hint; advanced never shows romaji. */}
      <div className="text-sm text-gray-400">{translation}</div>

      {exercise.hint && !submitted && (
        <div className="text-xs text-gray-500">hint: {exercise.hint}</div>
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
          className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-base text-white placeholder:text-gray-600 focus:border-red-500 focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={submitted || !input.trim()}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          Check
        </button>
      </form>

      {submitted && (
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
