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
}

type TabState = "config" | "session" | "complete";

export default function ExerciseTab({ lesson, songVersionId }: ExerciseTabProps) {
  const store = useExerciseSession();
  const { _hasHydrated, startSession, clearSession } = store;

  const [tabState, setTabState] = useState<TabState>(() => {
    // Can't determine session state until hydrated — start with config
    return "config";
  });
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

  // If we just hydrated and have an active session, jump to session view
  // (Only do this check once — user can choose to restart from config)
  if (hasActiveSession && tabState === "config") {
    // Use a side-effect-free check: render session directly
    return (
      <div className="py-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Practice</h2>
          <button
            onClick={() => {
              clearSession();
              setTabState("config");
            }}
            className="text-xs text-gray-500 underline hover:text-gray-300"
          >
            Start over
          </button>
        </div>
        <ExerciseSession onComplete={() => setTabState("complete")} />
      </div>
    );
  }

  if (tabState === "session") {
    return (
      <div className="py-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Practice</h2>
          <button
            onClick={() => {
              clearSession();
              setTabState("config");
            }}
            className="text-xs text-gray-500 underline hover:text-gray-300"
          >
            Start over
          </button>
        </div>
        <ExerciseSession onComplete={() => setTabState("complete")} />
      </div>
    );
  }

  if (tabState === "complete") {
    return (
      <div className="py-8 text-center">
        <p className="mb-2 text-4xl">&#127881;</p>
        <h2 className="mb-2 text-xl font-bold text-white">Session Complete!</h2>
        <p className="mb-6 text-gray-400">
          Great work practicing with this song.
        </p>
        <button
          onClick={() => {
            clearSession();
            setTabState("config");
          }}
          className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
        >
          Practice Again
        </button>
      </div>
    );
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
          jlptPool = (data as Array<{
            id: string;
            dictionary_form: string;
            reading: string;
            romaji: string;
            part_of_speech: string;
            meaning: string | Record<string, string>;
          }>).map((item) => ({
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
        {vocabCount} vocabulary {vocabCount === 1 ? "item" : "items"} available in this lesson.
      </p>
    </div>
  );
}
