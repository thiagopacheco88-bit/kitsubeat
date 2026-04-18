"use client";

import { useEffect, useState } from "react";
import type { Lesson, VocabEntry } from "@/lib/types/lesson";
import type { ExerciseType } from "@/lib/exercises/generator";
import { buildQuestions } from "@/lib/exercises/generator";
import {
  useExerciseSession,
  isSessionForSong,
} from "@/stores/exerciseSession";
import { getEffectiveCap, getUserPrefs } from "@/app/actions/userPrefs";
import { getAdvancedDrillAccess } from "@/app/actions/exercises";
import ExerciseSession from "./ExerciseSession";
import AdvancedDrillsUpsellModal from "./AdvancedDrillsUpsellModal";

interface ExerciseTabProps {
  lesson: Lesson;
  songVersionId: string;
  songSlug: string;
  // TODO: replace with Clerk userId from auth()
  userId: string;
}

type TabState = "config" | "session";
type Mode = "short" | "full" | "advanced_drills";

/**
 * Advanced Drills mode emits ONLY the Phase 10 quota-gated exercise types.
 * Passed as a typeFilter to buildQuestions — the generator's per-vocab and
 * per-verse / per-grammar-point loops honor the allowlist.
 */
const ADVANCED_DRILL_TYPES: ExerciseType[] = [
  "grammar_conjugation",
  "listening_drill",
  "sentence_order",
];

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
  const [skipLearning, setSkipLearning] = useState(false);

  // Phase 10 Plan 06 — tab-open upsell state. Holds the family whose quota was
  // exhausted at Advanced Drills click time; null = no modal. The gate check
  // runs as part of handleStart("advanced_drills") and never throws — it
  // either allows through or sets this state.
  const [upsell, setUpsell] = useState<{
    family: "listening" | "advanced_drill";
    quotaUsed: number;
    quotaLimit: number;
  } | null>(null);

  // --- Resume path: re-fetch prefs so skipLearning is accurate for the remaining questions.
  // Do NOT re-fetch the effective cap — the filtering decision was already baked
  // into the persisted questions array.
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
        <div className="h-5 w-1/3 rounded bg-gray-800" />
        <div className="h-24 w-full rounded-lg bg-gray-800" />
        <div className="h-24 w-full rounded-lg bg-gray-800" />
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
        <h2 className="text-lg font-semibold text-white">Practice</h2>
        <button
          onClick={handleRetry}
          className="text-xs text-gray-500 underline hover:text-gray-300"
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

  // --- Config screen ---
  const vocabCount = lesson.vocabulary.filter((v) => v.vocab_item_id).length;
  const shortCount = Math.min(10, vocabCount * 4);
  const fullCount = Math.min(40, vocabCount * 4);

  const handleStart = async (mode: Mode) => {
    setLoading(true);
    setError(null);
    setUpsell(null);

    try {
      // Phase 10 Plan 06 — Advanced Drills mode requires the tab-open gate check
      // BEFORE any question generation. If either quota family is exhausted the
      // corresponding upsell modal renders and we bail without starting the
      // session.
      //
      // UI invariant: ExerciseTab NEVER imports EXERCISE_FEATURE_FLAGS or
      // checkExerciseAccess directly. All gate decisions flow through the
      // getAdvancedDrillAccess server action (thin wrapper in
      // src/app/actions/exercises.ts) — preserves the Phase 08.1-07 single-gate
      // regression contract.
      if (mode === "advanced_drills") {
        const access = await getAdvancedDrillAccess(userId, songVersionId);
        // Listening Drill is non-negotiable for Star 3 — if its family is
        // exhausted, show that upsell first (10-song cap is the more generous
        // of the two, so hitting it is the rarer event).
        if (!access.listeningAllowed) {
          setUpsell({
            family: "listening",
            quotaUsed: access.listeningQuotaLimit,
            quotaLimit: access.listeningQuotaLimit,
          });
          setLoading(false);
          return;
        }
        if (!access.advancedAllowed) {
          setUpsell({
            family: "advanced_drill",
            quotaUsed: access.advancedQuotaLimit,
            quotaLimit: access.advancedQuotaLimit,
          });
          setLoading(false);
          return;
        }
        // Both gates open → fall through to buildQuestions with Advanced
        // Drills filter.
      }

      // Fetch user prefs, effective cap, and JLPT distractor pool in parallel.
      // getEffectiveCap is the authoritative cap value — free users always get
      // DEFAULT_NEW_CARD_CAP regardless of what's stored on users.new_card_cap.
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
          // Map API response to VocabEntry shape (partial — used only for distractors)
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
            // Required fields with fallback defaults for distractor-only use
            example_from_song: "",
            additional_examples: [],
          }));
        })(),
      ]);

      // Remember skipLearning for the session view (controls learn-card rendering).
      setSkipLearning(prefs.skipLearning);

      // Pre-fetch FSRS tiers + states for ALL lesson vocab_item_ids before we
      // filter. We need states to know which words are new (0) vs review (1/2)
      // vs relearning (3). The cap filter excludes new+relearning beyond cap;
      // review/learning words always pass through untouched.
      const allVocabIds = lesson.vocabulary
        .map((v) => v.vocab_item_id)
        .filter((id): id is string => !!id);

      let tierMap: Record<string, 1 | 2 | 3> = {};
      let stateMap: Record<string, 0 | 1 | 2 | 3> = {};

      if (allVocabIds.length > 0) {
        // Chunk to 200 IDs per batch (API limit). Most songs fit in one call.
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

      // Apply per-session cap: keep only the first `effectiveCap` new/relearning
      // vocab. Review + learning words always pass through. Words excluded here
      // never enter the session at all — they're deferred to the next session.
      //
      // Order: preserve the lesson's vocabulary order — the first N new/relearning
      // words in document order are kept. Random shuffling happens later in
      // buildQuestions(). This is predictable for users and doesn't require an
      // extra server-side ordering contract.
      const newAndRelearningIds: string[] = [];
      for (const v of lesson.vocabulary) {
        const id = v.vocab_item_id;
        if (!id) continue;
        const state = stateMap[id] ?? 0;
        if (state === 0 || state === 3) newAndRelearningIds.push(id);
      }
      const allowedNewIds = new Set(
        newAndRelearningIds.slice(0, effectiveCap)
      );

      const filteredVocab = lesson.vocabulary.filter((v) => {
        if (!v.vocab_item_id) return false; // no id => can't track mastery, exclude (matches existing vocabCount calc)
        const state = stateMap[v.vocab_item_id] ?? 0;
        if (state === 0 || state === 3) {
          return allowedNewIds.has(v.vocab_item_id);
        }
        return true; // learning (1) + review (2) always pass through
      });

      // Build questions from the capped vocab.
      //
      // Phase 10 Plan 06: Advanced Drills mode passes a type allowlist so the
      // generator's per-vocab loop and the per-verse / per-grammar-point loops
      // emit ONLY Ex 5/6/7. Short / Full modes omit the filter (preserves
      // pre-Plan-06 behavior — Ex 1-4 + eligible Ex 5-7 all emit).
      const typeFilter =
        mode === "advanced_drills" ? ADVANCED_DRILL_TYPES : undefined;
      const engineMode: "short" | "full" =
        mode === "advanced_drills" ? "full" : mode;
      const questions = buildQuestions(
        { ...lesson, vocabulary: filteredVocab },
        engineMode,
        jlptPool,
        typeFilter
      );

      if (questions.length === 0) {
        setError(
          mode === "advanced_drills"
            ? "No Advanced Drill questions can be generated for this song yet (needs timed verses and structured grammar points)."
            : "Not enough vocabulary in this song to build questions yet. Try skipping the new-word cap from your profile."
        );
        setLoading(false);
        return;
      }

      // Start session, then populate tiers + states.
      // startSession FIRST (resets tiers/states slices), then setTiers/setVocabStates
      // so the freshly-fetched data survives the reset.
      startSession(songVersionId, questions, engineMode);
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
      <h2 className="mb-6 text-lg font-semibold text-white">Practice</h2>

      {error && (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

        {/*
         * Phase 10 Plan 06 — Advanced Drills mode card.
         *
         * Always rendered (CONTEXT-locked). The gate decides whether the session
         * starts: click → getAdvancedDrillAccess server action → upsell modal
         * on quota exhaustion OR full session otherwise.
         */}
        <div className="flex flex-col gap-3 rounded-xl border border-purple-700/50 bg-gray-900 p-5">
          <div>
            <h3 className="font-semibold text-white">Advanced Drills</h3>
            <p className="mt-1 text-sm text-gray-400">
              Grammar · Listening · Sentence Order
            </p>
          </div>
          <p className="text-sm text-gray-500">
            The 3-star workout — conjugation, listening, and sentence-reordering
            questions.
          </p>
          <button
            onClick={() => handleStart("advanced_drills")}
            disabled={loading}
            data-testid="advanced-drills-start"
            className="mt-auto rounded-lg border border-purple-500/50 bg-purple-900/40 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-800/50 disabled:opacity-50"
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
              <span className="text-white font-medium">Star 3:</span> Score 80%+
              on Listening Drill exercises
            </span>
          </li>
        </ul>
      </div>

      {upsell && (
        <AdvancedDrillsUpsellModal
          family={upsell.family}
          quotaUsed={upsell.quotaUsed}
          quotaLimit={upsell.quotaLimit}
          onClose={() => setUpsell(null)}
          onUpgrade={() => {
            // Upgrade link routes to /profile via Next/Link — nothing else to
            // do here; the modal dismisses itself as the page navigates.
            setUpsell(null);
          }}
        />
      )}
    </div>
  );
}
