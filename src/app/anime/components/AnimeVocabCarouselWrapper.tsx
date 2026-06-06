"use client";

import { useState } from "react";
import type { AnimeVocabItem } from "@/lib/db/queries";
import type { AnimeMetadata } from "@/lib/db/schema";
import type { Question } from "@/lib/exercises/generator";
import type { AnimeCarouselSessionResult } from "@/app/actions/anime-carousel";
import AnimeVocabCarousel from "./AnimeVocabCarousel";
import AnimeCarouselExerciseSession, { type WordResult } from "./AnimeCarouselExerciseSession";
import AnimeSessionSummary from "./AnimeSessionSummary";

type ViewMode = "carousel" | "session" | "summary";

interface AnimeVocabCarouselWrapperProps {
  words: AnimeVocabItem[];
  animeMeta: AnimeMetadata | null;
  animeSlug: string;
  locale: string;
  userId: string | null;
}

export default function AnimeVocabCarouselWrapper({
  words,
  animeMeta,
  animeSlug,
  locale,
  userId,
}: AnimeVocabCarouselWrapperProps) {
  const [mode, setMode] = useState<ViewMode>("carousel");
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([]);
  const [sessionResult, setSessionResult] = useState<AnimeCarouselSessionResult | null>(null);
  const [sessionWordResults, setSessionWordResults] = useState<WordResult[]>([]);

  function handleStartPractice(questions: Question[]) {
    setSessionQuestions(questions);
    setMode("session");
  }

  function handleSessionComplete(result: AnimeCarouselSessionResult, wordResults: WordResult[]) {
    setSessionResult(result);
    setSessionWordResults(wordResults);
    setMode("summary");
  }

  function handleBackToCarousel() {
    setMode("carousel");
    setSessionQuestions([]);
    setSessionResult(null);
    setSessionWordResults([]);
  }

  if (mode === "session") {
    return (
      <AnimeCarouselExerciseSession
        questions={sessionQuestions}
        animeSlug={animeSlug}
        userId={userId}
        onComplete={handleSessionComplete}
        onExit={handleBackToCarousel}
      />
    );
  }

  if (mode === "summary" && sessionResult) {
    return (
      <AnimeSessionSummary
        result={sessionResult}
        wordResults={sessionWordResults}
        onBackToCarousel={handleBackToCarousel}
      />
    );
  }

  return (
    <AnimeVocabCarousel
      words={words}
      animeMeta={animeMeta}
      locale={locale}
      onStartPractice={handleStartPractice}
    />
  );
}
