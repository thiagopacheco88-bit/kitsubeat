"use client";

import { useState } from "react";
import type { Lesson, VocabEntry } from "@/lib/types/lesson";
import { buildQuestions } from "@/lib/exercises/generator";
import {
  useExerciseSession,
  isSessionForSong,
} from "@/stores/exerciseSession";
import ExerciseSession from "./ExerciseSession";

interface ExerciseTabProps {
  lesson: Lesson;
  songVersionId: string;
  songSlug: string;
  // TODO: replace with Clerk userId from auth()
  userId: string;
}

type TabState = "config" | "session";

export default function ExerciseTab({
  lesson,
  songVersionId,
  songSlug,
  userId,
}: ExerciseTabProps) {
  const store = useExerciseSession();
  const { _hasHydrated, startSession, clearSession } = store;

  const [tabState, setTabState] = useState<TabState>("config");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Hydration guard ---
  if (!_hasHydrated) {
    return (
      <div className="flex flex-col gap-4 py-8 animate-pulse">
        <div className="h-5 w-1/3 rounded bg-gray-800" />
        <div className="h-24 w-full rounded-lg bg-gray-800" />
        <div className="h-24 w-full rounded-lg bg-gray-800" />
      </div>
    );
  }

  // --- Resume existing session if it matches this song ---
  const hasActiveSession = isSessionForSong(store, songVersionId);

  const handleRetry = () => {
    clearSession();
    setTabState("config");
  };

  const sessionView = (
    <div className="py-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Practice</h2>
        <button
          onClick={handleRetry}
          className="text-xs text-gray-500 underline hover:text-gray-300"
        >
          Start over
        </button>
      </div>
      <ExerciseSession
        songSlug={songSlug}
        songVersionId={songVersionId}
        userId={userId}
        onRetry={handleRetry}
      />
    </div>
  );

  // If we just hydrated and have an active session, jump to session view
  if (hasActiveSession && tabState === "config") {
    return sessionView;
  }

  if (tabState === "session") {
    return sessionView;
  }

  // --- Config screen ---
  const vocabCount = lesson.vocabulary.filter((v) => v.vocab_item_id).length;
  const shortCount = Math.min(10, vocabCount * 4);
  const fullCount = Math.min(40, vocabCount * 4);

  const handleStart = async (mode: "short" | "full") => {
    setLoading(true);
    setError(null);

    try {
      // Fetch JLPT distractor pool
      let jlptPool: VocabEntry[] = [];
      if (lesson.jlpt_level) {
        const res = await fetch(
          `/api/exercises/jlpt-pool?jlpt_level=${lesson.jlpt_level}`
        );
        if (res.ok) {
          const data = await res.json();
          // Map API response to VocabEntry shape (partial — used only for distractors)
          jlptPool = (
            data as Array<{
              id: string;
              dictionary_form: string;
              reading: string;
              romaji: string;
              part_of_speech: string;
              meaning: string | Record<string, string>;
            }>
          ).map((item) => ({
            surface: item.dictionary_form,
            reading: item.reading,
            romaji: item.romaji,
            part_of_speech: item.part_of_speech as VocabEntry["part_of_speech"],
            jlpt_level: lesson.jlpt_level as VocabEntry["jlpt_level"],
            meaning:
              typeof item.meaning === "string"
                ? { en: item.meaning }
                : item.meaning,
            vocab_item_id: item.id,
            // Required fields with fallback defaults for distractor-only use
            example_from_song: "",
            additional_examples: [],
          }));
        }
      }

      // Build questions (pure, client-side)
      const questions = buildQuestions(lesson, mode, jlptPool);

      if (questions.length === 0) {
        setError("Not enough vocabulary in this song to build questions yet.");
        setLoading(false);
        return;
      }

      startSession(songVersionId, questions, mode);
      setTabState("session");
    } catch (err) {
      console.error("Failed to start exercise session:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-4">
      <h2 className="mb-6 text-lg font-semibold text-white">Practice</h2>

      {error && (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Quick Practice mode */}
        <div className="flex flex-col gap-3 rounded-xl border border-gray-700 bg-gray-900 p-5">
          <div>
            <h3 className="font-semibold text-white">Quick Practice</h3>
            <p className="mt-1 text-sm text-gray-400">
              {shortCount} questions &middot; ~2 min
            </p>
          </div>
          <p className="text-sm text-gray-500">
            A focused burst — perfect for a quick vocab refresh.
          </p>
          <button
            onClick={() => handleStart("short")}
            disabled={loading}
            className="mt-auto rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Start"}
          </button>
        </div>

        {/* Full Lesson mode */}
        <div className="flex flex-col gap-3 rounded-xl border border-gray-700 bg-gray-900 p-5">
          <div>
            <h3 className="font-semibold text-white">Full Lesson</h3>
            <p className="mt-1 text-sm text-gray-400">
              {fullCount} questions &middot; ~5–8 min
            </p>
          </div>
          <p className="text-sm text-gray-500">
            All vocab across all 4 exercise types — the complete workout.
          </p>
          <button
            onClick={() => handleStart("full")}
            disabled={loading}
            className="mt-auto rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Start"}
          </button>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-600">
        {vocabCount} vocabulary {vocabCount === 1 ? "item" : "items"} available
        in this lesson.
      </p>

      {/* Star criteria — guides learner to next achievement */}
      <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900/50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-white">
          Star Mastery Criteria
        </h3>
        <ul className="flex flex-col gap-2 text-sm text-gray-400">
          <li className="flex items-start gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400"
            >
              <path
                fillRule="evenodd"
                d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                clipRule="evenodd"
              />
            </svg>
            <span>
              <span className="text-white font-medium">Star 1:</span> Score 80%+
              on vocabulary exercises (meaning, reading, recognition)
            </span>
          </li>
          <li className="flex items-start gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400"
            >
              <path
                fillRule="evenodd"
                d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                clipRule="evenodd"
              />
            </svg>
            <span>
              <span className="text-white font-medium">Star 2:</span> Score 80%+
              on Fill-the-Lyric exercises
            </span>
          </li>
          <li className="flex items-start gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="mt-0.5 h-4 w-4 shrink-0 text-gray-600"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
              />
            </svg>
            <span className="text-gray-600">
              <span className="font-medium">Star 3:</span> Coming in a future
              update
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
