"use client";

import { useState, useRef, useCallback } from "react";
import type { Question } from "@/lib/exercises/generator";
import type { ExerciseType } from "@/lib/exercises/generator";
import { recordVocabAnswer } from "@/app/actions/exercises";
import { saveAnimeCarouselSession } from "@/app/actions/anime-carousel";
import type { AnimeCarouselSessionResult } from "@/app/actions/anime-carousel";

interface AnswerRecord {
  vocabItemId: string;
  exerciseType: ExerciseType;
  correct: boolean;
  responseTimeMs: number;
}

interface AnimeCarouselExerciseSessionProps {
  questions: Question[];
  animeSlug: string;
  userId: string | null;
  onComplete: (result: AnimeCarouselSessionResult) => void;
  onExit: () => void;
}

type AnswerState = "unanswered" | "correct" | "incorrect";

export default function AnimeCarouselExerciseSession({
  questions,
  animeSlug,
  userId,
  onComplete,
  onExit,
}: AnimeCarouselExerciseSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerState, setAnswerState] = useState<AnswerState>("unanswered");
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const questionStartTime = useRef(Date.now());

  const currentQuestion = questions[currentIndex];
  const progress = Math.round((currentIndex / questions.length) * 100);

  const allChoices = currentQuestion
    ? [currentQuestion.correctAnswer, ...currentQuestion.distractors].sort(() => Math.random() - 0.5)
    : [];

  const handleAnswer = useCallback(
    async (choice: string) => {
      if (answerState !== "unanswered") return;
      if (!currentQuestion) return;

      const elapsed = Date.now() - questionStartTime.current;
      const isCorrect = choice === currentQuestion.correctAnswer;

      setSelectedAnswer(choice);
      setAnswerState(isCorrect ? "correct" : "incorrect");

      const record: AnswerRecord = {
        vocabItemId: currentQuestion.vocabItemId,
        exerciseType: currentQuestion.type,
        correct: isCorrect,
        responseTimeMs: elapsed,
      };

      // Fire-and-forget FSRS update (same as song sessions)
      if (userId) {
        recordVocabAnswer({
          vocabItemId: currentQuestion.vocabItemId,
          songVersionId: null,
          exerciseType: currentQuestion.type,
          cardKind: "romaji_meaning",
          correct: isCorrect,
          responseTimeMs: elapsed,
        }).catch(console.error);
      }

      const updatedAnswers = [...answers, record];
      setAnswers(updatedAnswers);

      // Auto-advance after 1.5s
      setTimeout(async () => {
        if (currentIndex + 1 >= questions.length) {
          // Session complete — save and show summary
          setIsSaving(true);
          try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const result = await saveAnimeCarouselSession({
              animeSlug,
              answers: updatedAnswers,
              tz,
            });
            onComplete(result);
          } catch (err) {
            console.error("Failed to save session:", err);
            // Degrade gracefully: show summary with local counts
            onComplete({
              xpGained: 0,
              newLevel: undefined,
              streakDays: 0,
              correctCount: updatedAnswers.filter((a) => a.correct).length,
              totalCount: updatedAnswers.length,
            });
          } finally {
            setIsSaving(false);
          }
        } else {
          setCurrentIndex((i) => i + 1);
          setAnswerState("unanswered");
          setSelectedAnswer(null);
          questionStartTime.current = Date.now();
        }
      }, 1500);
    },
    [answerState, currentQuestion, currentIndex, questions.length, answers, animeSlug, userId, onComplete]
  );

  if (!currentQuestion) return null;

  if (isSaving) {
    return (
      <div className="flex items-center justify-center py-24 text-[var(--color-text-muted)]">
        Saving session...
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-6 py-6">
      {/* Header: progress + exit */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 rounded-full bg-[var(--color-border)] h-2 overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--color-accent)] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm text-[var(--color-text-muted)] shrink-0">
          {currentIndex + 1} / {questions.length}
        </span>
        <button
          onClick={onExit}
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          aria-label="Exit session"
        >
          &#x2715;
        </button>
      </div>

      {/* Question */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center">
        <p className="text-xs text-[var(--color-text-muted)] mb-2 uppercase tracking-wide">
          {currentQuestion.type === "vocab_meaning" ? "What does this mean?" : "Which word means...?"}
        </p>
        <p className="text-3xl font-bold text-[var(--color-text)]">{currentQuestion.prompt}</p>
      </div>

      {/* Answer choices */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {allChoices.map((choice) => {
          let variant = "border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-border-strong)]";
          if (answerState !== "unanswered") {
            if (choice === currentQuestion.correctAnswer) {
              variant = "border-green-500 bg-green-500/10 text-green-600";
            } else if (choice === selectedAnswer) {
              variant = "border-red-500 bg-red-500/10 text-red-600";
            } else {
              variant = "border-[var(--color-border)] text-[var(--color-text-muted)] opacity-50";
            }
          }
          return (
            <button
              key={choice}
              onClick={() => handleAnswer(choice)}
              disabled={answerState !== "unanswered"}
              className={`rounded-lg border p-3 text-sm font-medium transition-colors ${variant}`}
            >
              {choice}
            </button>
          );
        })}
      </div>

      {/* Explanation (shown after answer) */}
      {answerState !== "unanswered" && (
        <p className="text-sm text-[var(--color-text-muted)] text-center italic">
          {currentQuestion.explanation}
        </p>
      )}
    </div>
  );
}
