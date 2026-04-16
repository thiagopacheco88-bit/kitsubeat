"use client";

import { useState } from "react";
import { useExerciseSession } from "@/stores/exerciseSession";
import QuestionCard from "./QuestionCard";

/**
 * ExerciseSession — question loop orchestrator.
 *
 * Reads session state from Zustand store.
 * Renders: progress bar, question counter, current QuestionCard.
 * On completion, signals parent via onComplete callback.
 */
export default function ExerciseSession({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const store = useExerciseSession();
  const { questions, currentIndex, recordAnswer, advanceQuestion } = store;

  // Fade transition state — used to animate between questions
  const [visible, setVisible] = useState(true);

  const total = questions.length;
  const current = questions[currentIndex];

  if (!current) return null;

  const progressPct = total > 0 ? (currentIndex / total) * 100 : 0;

  const handleAnswered = (
    chosen: string,
    correct: boolean,
    timeMs: number
  ) => {
    recordAnswer(current.id, chosen, correct, timeMs);
  };

  const handleContinue = () => {
    // Fade out, advance, fade back in
    setVisible(false);
    setTimeout(() => {
      advanceQuestion();
      const nextIndex = currentIndex + 1;
      if (nextIndex >= total) {
        onComplete();
      } else {
        setVisible(true);
      }
    }, 300);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
        <div
          className="h-full rounded-full bg-red-600 transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Question counter */}
      <p className="text-sm text-gray-400">
        Question{" "}
        <span className="font-semibold text-white">{currentIndex + 1}</span> /{" "}
        {total}
      </p>

      {/* Question card with opacity transition */}
      <div
        className={`transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
      >
        <QuestionCard
          key={current.id}
          question={current}
          onAnswered={handleAnswered}
          onContinue={handleContinue}
        />
      </div>
    </div>
  );
}
