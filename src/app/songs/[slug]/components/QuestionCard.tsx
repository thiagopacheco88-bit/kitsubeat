"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import type { Question } from "@/lib/exercises/generator";
import FeedbackPanel from "./FeedbackPanel";

interface QuestionCardProps {
  question: Question;
  /** Called when user selects an answer (before continue) */
  onAnswered: (chosen: string, correct: boolean, timeMs: number) => void;
  /** Called when user clicks Continue in feedback panel */
  onContinue: () => void;
}

/** Fisher-Yates shuffle (unbiased) */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function QuestionCard({
  question,
  onAnswered,
  onContinue,
}: QuestionCardProps) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const feedbackRef = useRef<HTMLDivElement>(null);

  // Pull the feedback panel (including Continue button) into view after answering.
  useEffect(() => {
    if (chosen !== null) {
      feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [chosen]);

  // Shuffle options ONCE per question ID (stable across re-renders)
  const options = useMemo(
    () => shuffle([question.correctAnswer, ...question.distractors]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [question.id]
  );

  const handleSelect = (option: string) => {
    if (chosen !== null) return; // already answered

    const timeMs = Date.now() - startTimeRef.current;
    const correct = option === question.correctAnswer;
    setChosen(option);
    setIsCorrect(correct);
    onAnswered(option, correct, timeMs);
  };

  const getOptionStyle = (option: string): string => {
    if (chosen === null) {
      // idle state
      return "border-gray-600 bg-gray-800 text-white hover:border-gray-400 hover:bg-gray-700";
    }
    if (option === question.correctAnswer) {
      // always highlight correct in green
      return "border-green-500 bg-green-500/10 text-white";
    }
    if (option === chosen && !isCorrect) {
      // user's wrong choice in red
      return "border-red-500 bg-red-500/10 text-white";
    }
    // other non-selected options: dimmed
    return "border-gray-700 bg-gray-800/50 text-gray-500";
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Question type label */}
      <p className="text-xs uppercase tracking-wider text-gray-500">
        {question.type.replace(/_/g, " ")}
      </p>

      {/* Question prompt */}
      <p className="text-xl font-bold leading-snug text-white">
        {question.prompt}
      </p>

      {/* Answer options — 2x2 grid on wide screens, single column on mobile */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => handleSelect(option)}
            disabled={chosen !== null}
            className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${getOptionStyle(option)}`}
          >
            {option}
          </button>
        ))}
      </div>

      {/* Inline feedback — shown after answering */}
      {chosen !== null && (
        <div ref={feedbackRef} className="scroll-mb-4">
          <FeedbackPanel
            question={question}
            chosenAnswer={chosen}
            isCorrect={isCorrect}
            onContinue={onContinue}
          />
        </div>
      )}
    </div>
  );
}
