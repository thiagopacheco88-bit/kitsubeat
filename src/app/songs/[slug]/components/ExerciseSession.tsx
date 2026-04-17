"use client";

import { useEffect, useRef, useState } from "react";
import { useExerciseSession } from "@/stores/exerciseSession";
import QuestionCard from "./QuestionCard";
import SessionSummary from "./SessionSummary";

/**
 * ExerciseSession — question loop orchestrator.
 *
 * Reads session state from Zustand store.
 * Renders: progress bar, question counter, current QuestionCard.
 * When all questions are answered, renders SessionSummary inline.
 */
export default function ExerciseSession({
  songSlug,
  songVersionId,
  userId,
  onRetry,
}: {
  songSlug: string;
  songVersionId: string;
  /** TODO: replace with Clerk userId from auth() */
  userId: string;
  onRetry: () => void;
}) {
  const store = useExerciseSession();
  const { questions, currentIndex, answers, mode, recordAnswer, advanceQuestion } =
    store;

  // Fade transition state — used to animate between questions
  const [visible, setVisible] = useState(true);

  const total = questions.length;
  const current = questions[currentIndex];
  const progressPct = total > 0 ? (currentIndex / total) * 100 : 0;

  // Bring the active question to the top of the viewport on advance / mount.
  const sessionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    sessionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [currentIndex]);

  // --- Session complete: show summary ---
  if (currentIndex >= total && total > 0) {
    return (
      <div ref={sessionRef} className="scroll-mt-16">
        <SessionSummary
          questions={questions}
          answers={answers}
          mode={mode ?? "short"}
          songSlug={songSlug}
          songVersionId={songVersionId}
          userId={userId}
          onRetry={onRetry}
          onClose={onRetry}
        />
      </div>
    );
  }

  if (!current) return null;

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
      setVisible(true);
    }, 300);
  };

  return (
    <div ref={sessionRef} className="flex flex-col gap-4 scroll-mt-16">
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
          userId={userId}
          songVersionId={songVersionId}
        />
      </div>
    </div>
  );
}
