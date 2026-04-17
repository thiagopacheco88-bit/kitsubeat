"use client";

import { useState } from "react";
import type { Question } from "@/lib/exercises/generator";

interface FeedbackPanelProps {
  question: Question;
  chosenAnswer: string;
  isCorrect: boolean;
  onContinue: () => void;
}

export default function FeedbackPanel({
  question,
  chosenAnswer,
  isCorrect,
  onContinue,
}: FeedbackPanelProps) {
  const [showDetail, setShowDetail] = useState(false);

  const handleContinue = () => {
    setShowDetail(false);
    onContinue();
  };

  // Wrong-answer explanation: what the user picked and why it's wrong
  const wrongChoiceNote =
    !isCorrect && chosenAnswer !== question.correctAnswer
      ? `「${chosenAnswer}」is not the answer being asked for here.`
      : null;

  return (
    <>
      {/* Inline feedback panel */}
      <div
        data-feedback={isCorrect ? "correct" : "wrong"}
        className={`mt-4 rounded-lg border p-4 ${
          isCorrect
            ? "border-green-500/30 bg-green-500/10"
            : "border-red-500/30 bg-red-500/10"
        }`}
      >
        {/* Status icon + result */}
        <div className="mb-2 flex items-center gap-2">
          {isCorrect ? (
            <span className="text-lg text-green-400">&#10003;</span>
          ) : (
            <span className="text-lg text-red-400">&#10007;</span>
          )}
          <span
            className={`font-semibold ${isCorrect ? "text-green-400" : "text-red-400"}`}
          >
            {isCorrect ? "Correct!" : "Not quite"}
          </span>
        </div>

        {/* Wrong answer: show correct answer first */}
        {!isCorrect && (
          <p className="mb-1 text-sm text-gray-300">
            <span className="font-medium text-green-400">Correct answer:</span>{" "}
            {question.correctAnswer}
          </p>
        )}

        {/* Wrong answer: explain why user's choice was wrong */}
        {wrongChoiceNote && (
          <p className="mb-2 text-sm text-gray-400">{wrongChoiceNote}</p>
        )}

        {/* Explanation */}
        <p className="text-sm text-gray-300">{question.explanation}</p>

        {/* Action row */}
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={handleContinue}
            className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            Continue
          </button>
          {question.detailedExplanation && (
            <button
              onClick={() => setShowDetail(true)}
              className="text-sm text-gray-400 underline hover:text-gray-200"
            >
              More
            </button>
          )}
        </div>
      </div>

      {/* Full-screen detail panel */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-xl bg-gray-900 p-6 shadow-2xl">
            {/* Question repeated */}
            <p className="mb-1 text-xs uppercase tracking-wider text-gray-500">
              Question
            </p>
            <p className="mb-4 text-lg font-semibold text-white">
              {question.prompt}
            </p>

            {/* Correct answer */}
            <p className="mb-1 text-xs uppercase tracking-wider text-gray-500">
              Answer
            </p>
            <p className="mb-4 text-base text-green-400">
              {question.correctAnswer}
            </p>

            {/* Detailed explanation */}
            <p className="mb-1 text-xs uppercase tracking-wider text-gray-500">
              Explanation
            </p>
            <p className="mb-2 text-sm text-gray-300">{question.explanation}</p>
            {question.detailedExplanation && (
              <p className="text-sm text-gray-400">
                {question.detailedExplanation}
              </p>
            )}

            {/* Continue button */}
            <button
              onClick={handleContinue}
              className="mt-6 w-full rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </>
  );
}
