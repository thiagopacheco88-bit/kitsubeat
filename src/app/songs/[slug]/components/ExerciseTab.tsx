"use client";

import { useEffect, useState } from "react";
import type { Lesson, VocabEntry } from "@/lib/types/lesson";
import type { TrackKind, LengthMode } from "@/lib/exercises/generator";
import { buildQuestions } from "@/lib/exercises/generator";
import {
  useExerciseSession,
  isSessionForSong,
} from "@/stores/exerciseSession";
import { getEffectiveCap, getUserPrefs } from "@/app/actions/userPrefs";
import ExerciseSession from "./ExerciseSession";

interface ExerciseTabProps {
  lesson: Lesson;
  songVersionId: string;
  songSlug: string;
  // TODO: replace with Clerk userId from auth()
  userId: string;
  /**
   * Phase 11.6 SPEC-REQ-16: computed at SSR via hasKanji(). When false, the
   * Kanji track card is hidden (all-kana song). Defaults to true if not provided
   * (backwards-compatible — shows Kanji card for songs that pre-date this prop).
   */
  hasKanjiBearingVocab?: boolean;
}

type TabState = "config" | "session";

// ---------------------------------------------------------------------------
// TrackCard — single mode card with Short/Long toggle
// ---------------------------------------------------------------------------

interface TrackCardProps {
  title: string;
  trackKind: TrackKind;
  description: string;
  lengthMode: LengthMode;
  onLengthChange: (mode: LengthMode) => void;
  onStart: () => void;
  loading: boolean;
}

function TrackCard({
  title,
  description,
  lengthMode,
  onLengthChange,
  onStart,
  loading,
}: TrackCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
      <div>
        <h3 className="font-semibold text-[var(--color-text)]">{title}</h3>
        <p className="mt-1 text-sm text-[var(--color-text-dim)]">{description}</p>
      </div>

      {/* Short / Long length toggle */}
      <div
        className="flex gap-2"
        role="radiogroup"
        aria-label="Session length"
      >
        <button
          role="radio"
          aria-checked={lengthMode === "short"}
          onClick={() => onLengthChange("short")}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            lengthMode === "short"
              ? "bg-[var(--color-accent)] text-white"
              : "bg-[var(--color-card-2)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]"
          }`}
        >
          Short (10)
        </button>
        <button
          role="radio"
          aria-checked={lengthMode === "long"}
          onClick={() => onLengthChange("long")}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            lengthMode === "long"
              ? "bg-[var(--color-accent)] text-white"
              : "bg-[var(--color-card-2)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]"
          }`}
        >
          Long (25)
        </button>
      </div>

      <button
        onClick={onStart}
        disabled={loading}
        className="mt-auto rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
      >
        {loading ? "Loading..." : "Start"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ExerciseTab
// ---------------------------------------------------------------------------

export default function ExerciseTab({
  lesson,
  songVersionId,
  songSlug,
  userId,
  hasKanjiBearingVocab = true,
}: ExerciseTabProps) {
  const store = useExerciseSession();
  const { _hasHydrated, startSession, clearSession } = store;

  const [tabState, setTabState] = useState<TabState>("config");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skipLearning, setSkipLearning] = useState(false);

  // Per-track length preferences (independent within the session)
  const [vocabLength, setVocabLength] = useState<LengthMode>("short");
  const [grammarLength, setGrammarLength] = useState<LengthMode>("short");
  const [kanjiLength, setKanjiLength] = useState<LengthMode>("short");
  const [advancedLength] = useState<LengthMode>("long");

  // --- Resume path: re-fetch prefs so skipLearning is accurate for the remaining questions.
  const hasActiveSession = isSessionForSong(store, songVersionId);
  useEffect(() => {
    if (!_hasHydrated) return;
    if (!hasActiveSession) return;
    let cancelled = false;
    (async () => {
      const prefs = await getUserPrefs(userId);
      if (!cancelled) setSkipLearning(prefs.skipLearning);
    })();
    return () => {
      cancelled = true;
    };
  }, [_hasHydrated, hasActiveSession, userId]);

  // --- Hydration guard (after hooks — React rules require all hooks called unconditionally) ---
  if (!_hasHydrated) {
    return (
      <div className="flex flex-col gap-4 py-8 animate-pulse">
        <div className="h-5 w-1/3 rounded bg-[var(--color-card-2)]" />
        <div className="h-24 w-full rounded-lg bg-[var(--color-card-2)]" />
        <div className="h-24 w-full rounded-lg bg-[var(--color-card-2)]" />
      </div>
    );
  }

  const handleRetry = () => {
    clearSession();
    setTabState("config");
  };

  const sessionView = (
    <div className="py-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Practice</h2>
        <button
          onClick={handleRetry}
          className="text-xs text-[var(--color-text-dim)] underline hover:text-[var(--color-text-muted)]"
        >
          Return
        </button>
      </div>
      <ExerciseSession
        lesson={lesson}
        songSlug={songSlug}
        songVersionId={songVersionId}
        userId={userId}
        onRetry={handleRetry}
        skipLearning={skipLearning}
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

  // ---------------------------------------------------------------------------
  // Config screen
  // ---------------------------------------------------------------------------

  /**
   * handleStart — common entry point for all four tracks.
   *
   * Vocab/Grammar tracks use the Phase 11.6 pool-based buildQuestions overload
   * (BuildQuestionsPoolInput) with trackKind + lengthMode. Advanced Drills uses
   * the same overload with trackKind="advanced_drills".
   *
   * The legacy per-quota Advanced Drills gate (getAdvancedDrillAccess) is REMOVED
   * for this plan — Plan 11.6-07 will wire the 80%-per-track unlock gate instead.
   */
  const handleStart = async (trackKind: TrackKind, lengthMode: LengthMode) => {
    setLoading(true);
    setError(null);

    try {
      const [prefs, effectiveCap, jlptPool] = await Promise.all([
        getUserPrefs(userId),
        getEffectiveCap(userId),
        (async (): Promise<VocabEntry[]> => {
          if (!lesson.jlpt_level) return [];
          const res = await fetch(
            `/api/exercises/jlpt-pool?jlpt_level=${lesson.jlpt_level}`
          );
          if (!res.ok) return [];
          const data = await res.json();
          return (
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
            example_from_song: "",
            additional_examples: [],
          }));
        })(),
      ]);

      setSkipLearning(prefs.skipLearning);

      // Fetch FSRS tiers + states for all vocab_item_ids before capping
      const allVocabIds = lesson.vocabulary
        .map((v) => v.vocab_item_id)
        .filter((id): id is string => !!id);

      let tierMap: Record<string, 1 | 2 | 3> = {};
      let stateMap: Record<string, 0 | 1 | 2 | 3> = {};

      if (allVocabIds.length > 0) {
        for (let i = 0; i < allVocabIds.length; i += 200) {
          const chunk = allVocabIds.slice(i, i + 200);
          const res = await fetch(
            `/api/exercises/vocab-tiers?ids=${chunk.join(",")}&userId=${encodeURIComponent(userId)}`
          );
          if (res.ok) {
            const data = (await res.json()) as {
              tiers: Record<string, 1 | 2 | 3>;
              states: Record<string, 0 | 1 | 2 | 3>;
            };
            tierMap = { ...tierMap, ...data.tiers };
            stateMap = { ...stateMap, ...data.states };
          }
        }
      }

      // Apply per-session cap (same cap logic as legacy path)
      const newAndRelearningIds: string[] = [];
      for (const v of lesson.vocabulary) {
        const id = v.vocab_item_id;
        if (!id) continue;
        const state = stateMap[id] ?? 0;
        if (state === 0 || state === 3) newAndRelearningIds.push(id);
      }
      const allowedNewIds = new Set(newAndRelearningIds.slice(0, effectiveCap));

      const filteredVocab = lesson.vocabulary.filter((v) => {
        if (!v.vocab_item_id) return false;
        const state = stateMap[v.vocab_item_id] ?? 0;
        if (state === 0 || state === 3) return allowedNewIds.has(v.vocab_item_id);
        return true;
      });

      // Phase 11.6 Plan 04: pool-based buildQuestions with trackKind + lengthMode
      const questions = buildQuestions({
        vocab: filteredVocab,
        verses: lesson.verses,
        grammarPoints: lesson.grammar_points,
        jlptPool,
        trackKind,
        lengthMode,
      });

      if (questions.length === 0) {
        setError(
          "Not enough questions can be generated for this track yet. Try a different track or check back later."
        );
        setLoading(false);
        return;
      }

      // Phase 11.6: use "short" session mode for the legacy startSession signature.
      // The actual cap is controlled by lengthMode in buildQuestions above.
      startSession(songVersionId, questions, "short");
      store.setTiers(tierMap);
      store.setVocabStates(stateMap);

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
      <h2 className="mb-6 text-lg font-semibold text-[var(--color-text)]">Practice</h2>

      {error && (
        <p className="mb-4 rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-4 py-2 text-sm text-[var(--color-accent)]">
          {error}
        </p>
      )}

      {/* Phase 11.6 SPEC-REQ-1: Four-track grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Vocabulary track — romaji-emphasized, tier bypass active */}
        <TrackCard
          title="Vocabulary"
          trackKind="vocab"
          description="Romaji + meaning recognition · romaji is the teaching signal"
          lengthMode={vocabLength}
          onLengthChange={setVocabLength}
          onStart={() => handleStart("vocab", vocabLength)}
          loading={loading}
        />

        {/* Grammar track — conjugation drills, romaji-emphasized */}
        <TrackCard
          title="Grammar"
          trackKind="grammar"
          description="Conjugation drills · romaji + meaning guided"
          lengthMode={grammarLength}
          onLengthChange={setGrammarLength}
          onStart={() => handleStart("grammar", grammarLength)}
          loading={loading}
        />

        {/* Kanji track — conditional on song having kanji-bearing vocab (SPEC-REQ-16) */}
        {hasKanjiBearingVocab && (
          <TrackCard
            title="Kanji"
            trackKind="kanji"
            description="Read kanji aloud — type the romaji reading"
            lengthMode={kanjiLength}
            onLengthChange={setKanjiLength}
            onStart={() => handleStart("kanji", kanjiLength)}
            loading={loading}
          />
        )}
      </div>

      {/* Three-ring slot — Plan 11.6-07 implements TrackProgressRings here */}
      {/* <TrackProgressRings vocab={...} grammar={...} kanji={...} /> */}

      {/* Advanced Drills card — Plan 11.6-07 wires 80%-per-track unlock gate */}
      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-card)] p-5">
        <div>
          <h3 className="font-semibold text-[var(--color-text)]">Advanced Drills</h3>
          <p className="mt-1 text-sm text-[var(--color-text-dim)]">
            Mixed-track session — unlocked at 80% progress per track.
          </p>
        </div>
        <p className="text-sm text-[var(--color-text-dim)]">
          Grammar · Listening · Sentence Order — the 3-star workout.
        </p>
        <button
          onClick={() => handleStart("advanced_drills", advancedLength)}
          disabled={loading}
          className="mt-auto rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
          data-testid="advanced-drills-start"
        >
          {loading ? "Loading..." : "Start"}
        </button>
      </div>

      <p className="mt-4 text-xs text-[var(--color-text-dim)]">
        {lesson.vocabulary.filter((v) => v.vocab_item_id).length} vocabulary{" "}
        {lesson.vocabulary.filter((v) => v.vocab_item_id).length === 1
          ? "item"
          : "items"}{" "}
        available in this lesson.
      </p>
    </div>
  );
}
