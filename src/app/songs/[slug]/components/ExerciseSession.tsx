"use client";

import { useEffect, useRef, useState } from "react";
import type { Lesson } from "@/lib/types/lesson";
import { localize } from "@/lib/types/lesson";
import { useExerciseSession } from "@/stores/exerciseSession";
import QuestionCard from "./QuestionCard";
import SessionSummary from "./SessionSummary";
import LearnCard from "./LearnCard";
import { usePlayer } from "./PlayerContext";

/**
 * ExerciseSession — question loop orchestrator.
 *
 * Reads session state from Zustand store.
 * Renders: progress bar, question counter, current QuestionCard.
 * When all questions are answered, renders SessionSummary inline.
 *
 * Phase 08.4: inserts a LearnCard before the first QuestionCard for any
 * new (state=0) or relearning (state=3) vocab word, unless skipLearning=true.
 */
export default function ExerciseSession({
  lesson,
  songSlug,
  songVersionId,
  userId,
  onRetry,
  skipLearning,
}: {
  lesson: Lesson;
  songSlug: string;
  songVersionId: string;
  /** TODO: replace with Clerk userId from auth() */
  userId: string;
  onRetry: () => void;
  /** Phase 08.4: when true, never render the LearnCard — go straight to QuestionCard. */
  skipLearning: boolean;
}) {
  const store = useExerciseSession();
  const { questions, currentIndex, answers, mode, recordAnswer, advanceQuestion } =
    store;

  // Phase 08.4: learn-card state slices
  const learnedVocabIds = useExerciseSession((s) => s.learnedVocabIds);
  const vocabStates = useExerciseSession((s) => s.vocabStates);
  const markLearnCardShown = useExerciseSession((s) => s.markLearnCardShown);
  const markVocabIntroduced = useExerciseSession((s) => s.markVocabIntroduced);
  const introducedNewVocabIds = useExerciseSession((s) => s.introducedNewVocabIds);

  // Translation language for localizing learn card meaning
  const { translationLang } = usePlayer();

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

  // Phase 08.4: JIT learn card.
  // Render LearnCard instead of QuestionCard when:
  //   - user has skipLearning=false
  //   - current question's vocab is New (state=0) or Relearning (state=3)
  //   - learnedVocabIds[vocabItemId] is not already set (first encounter this session)
  //
  // When LearnCard mounts we also markVocabIntroduced so the cap accounting is correct
  // for re-encounters of the same word in later questions (e.g., meaning_vocab +
  // reading_match for the same vocab both count as one introduction).
  const vocabItemId = current.vocabItemId;
  const currentState = vocabStates[vocabItemId] ?? 0;
  const isNewOrRelearning = currentState === 0 || currentState === 3;
  const alreadyLearned = !!learnedVocabIds[vocabItemId];
  const shouldShowLearnCard = !skipLearning && isNewOrRelearning && !alreadyLearned;

  if (shouldShowLearnCard) {
    // Look up the matching VocabEntry for display-only fields the Question doesn't carry.
    const vocabEntry = lesson.vocabulary.find(
      (v) => v.vocab_item_id === vocabItemId
    );
    const partOfSpeech = vocabEntry?.part_of_speech ?? "";
    const jlptLevel = vocabEntry?.jlpt_level ?? null;
    const meaningText = vocabEntry
      ? localize(vocabEntry.meaning, translationLang)
      : "";

    return (
      <div ref={sessionRef} className="flex flex-col gap-4 scroll-mt-16">
        {/* Progress bar + counter stay in place so users see they haven't advanced */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full rounded-full bg-red-600 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-sm text-gray-400">
          Question{" "}
          <span className="font-semibold text-white">{currentIndex + 1}</span> /{" "}
          {total}
        </p>
        <LearnCard
          question={current}
          partOfSpeech={partOfSpeech}
          jlptLevel={jlptLevel}
          meaningText={meaningText}
          lang={translationLang}
          onDismiss={() => {
            markLearnCardShown(vocabItemId);
            if (!introducedNewVocabIds[vocabItemId]) {
              markVocabIntroduced(vocabItemId);
            }
          }}
        />
      </div>
    );
  }

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
