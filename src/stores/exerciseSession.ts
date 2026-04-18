/**
 * Exercise Session Store
 *
 * Zustand store with localStorage persistence for exercise session state.
 * Survives browser refreshes and tab closes.
 *
 * Pattern: persist middleware wraps session state.
 * Hydration guard: _hasHydrated prevents rendering stale server-state.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Question } from "@/lib/exercises/generator";
import type { Token } from "@/lib/types/lesson";
import type { Tier } from "@/lib/fsrs/tier";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnswerRecord {
  chosen: string;
  correct: boolean;
  timeMs: number;
}

/**
 * Phase 10 Plan 05 — Sentence Order per-token shape.
 *
 * Each token is stamped with a UUID at shuffle time so the DOM never leaks a
 * correct-position index (Pitfall 1 — no data-position / data-correct-index
 * attributes). UUIDs are generated inside initSentenceOrder via
 * crypto.randomUUID().
 */
export interface SentenceOrderToken {
  uuid: string;
  surface: string;
}

interface ExerciseSessionState {
  songVersionId: string | null;
  questions: Question[];
  currentIndex: number;
  answers: Record<string, AnswerRecord>;
  startedAt: number | null;
  mode: "short" | "full" | null;
  _hasHydrated: boolean;
  /** Per-vocab display tiers keyed by vocabItemId. Persisted so a paused session
   *  resumes at the correct tier without a re-fetch. */
  tiers: Record<string, Tier>;
  /** Question IDs where the user tapped "Reveal reading" — keyed by question.id. */
  revealedQuestionIds: Record<string, true>;
  /** Phase 08.3: whether the More details accordion is open — persists across questions within a session. */
  moreAccordionOpen: boolean;
  /** Phase 08.4: vocabItemIds whose learn card has been shown this session.
   *  Persisted so a reload mid-session doesn't re-show the card for a word already taught. */
  learnedVocabIds: Record<string, true>;
  /** Phase 08.4: vocabItemIds introduced as new/relearning this session.
   *  Tracks cap accounting across repeated question encounters of the same word.
   *  Persisted so reloads don't double-count. */
  introducedNewVocabIds: Record<string, true>;
  /** Phase 08.4: raw FSRS state per vocab (0|1|2|3), from the extended /api/exercises/vocab-tiers response.
   *  Needed to distinguish New (0) from Relearning (3) for learn-card trigger (Plan 04). */
  vocabStates: Record<string, 0 | 1 | 2 | 3>;
  /**
   * Phase 10 Plan 04: Listening Drill replay count per question (keyed by
   * question.id). Telemetry only — NOT fed to FSRS (CONTEXT-locked: replays
   * are unlimited and carry no penalty). Reset per session.
   */
  listeningReplays: Record<string, number>;
  /**
   * Phase 10 Plan 05: Sentence Order shuffled pool keyed by question.id.
   * Tokens stamped with UUIDs at shuffle time (no correct-position leak in
   * DOM). Survives question navigation within a session; reset on
   * startSession.
   */
  sentenceOrderPool: Record<string, SentenceOrderToken[]>;
  /**
   * Phase 10 Plan 05: Sentence Order answer row keyed by question.id.
   * Grows as the user taps pool tokens; shrinks as they tap an answer token
   * back to the pool. Submit button enabled only when the pool is empty.
   */
  sentenceOrderAnswer: Record<string, SentenceOrderToken[]>;
  /**
   * Phase 10 Plan 05: "Show hint" reveal-hatch flag per question.id.
   * Presence = shown. Maps to revealedReading=true for FSRS (rating=1) per
   * the Phase 08.2-01 reveal-hatch pattern. One-way — once shown, does not
   * hide again within the session.
   */
  sentenceOrderHintShown: Record<string, true>;
}

interface ExerciseSessionActions {
  startSession: (
    songVersionId: string,
    questions: Question[],
    mode: "short" | "full"
  ) => void;
  recordAnswer: (
    questionId: string,
    chosen: string,
    correct: boolean,
    timeMs: number
  ) => void;
  advanceQuestion: () => void;
  clearSession: () => void;
  setHasHydrated: (v: boolean) => void;
  /** Bulk-set tiers after prefetch from /api/exercises/vocab-tiers */
  setTiers: (tiers: Record<string, Tier>) => void;
  /** Optimistically update a single vocab's tier after recordVocabAnswer response */
  setTier: (vocabItemId: string, tier: Tier) => void;
  /** Record that the user tapped "Reveal reading" for a question */
  markRevealed: (questionId: string) => void;
  setMoreAccordionOpen: (v: boolean) => void;
  /** Phase 08.4: flag that the learn card for a given vocab has been shown this session. */
  markLearnCardShown: (vocabItemId: string) => void;
  /** Phase 08.4: flag that a new/relearning vocab has been introduced (for cap accounting). */
  markVocabIntroduced: (vocabItemId: string) => void;
  /** Phase 08.4: bulk-set raw FSRS states after the vocab-tiers batch fetch. */
  setVocabStates: (states: Record<string, 0 | 1 | 2 | 3>) => void;
  /**
   * Phase 10 Plan 04: increment the replay count for a listening_drill
   * question. No FSRS impact — telemetry only (CONTEXT: unlimited replays).
   */
  incrementListeningReplay: (questionId: string) => void;
  /**
   * Phase 10 Plan 05: initialize the shuffled pool for a sentence_order
   * question. Applies Fisher-Yates shuffle to the verse tokens and stamps
   * each with a UUID via crypto.randomUUID(). No-op if the pool already has
   * an entry for this questionId (reload-safe via zustand persist — the
   * shuffled order survives a mid-question refresh).
   */
  initSentenceOrder: (questionId: string, verseTokens: Token[]) => void;
  /**
   * Phase 10 Plan 05: move a pool token to the end of the answer row by UUID.
   * Preserves UUID identity. No-op if the token isn't in the pool.
   */
  moveToAnswer: (questionId: string, uuid: string) => void;
  /**
   * Phase 10 Plan 05: return an answer-row token to the end of the pool by
   * UUID. No-op if the token isn't in the answer row.
   */
  moveToPool: (questionId: string, uuid: string) => void;
  /**
   * Phase 10 Plan 05: mark the hint as shown for a sentence_order question.
   * One-way — the revealedReading=true flag propagates via onAnswer meta.
   */
  showHint: (questionId: string) => void;
}

type ExerciseSessionStore = ExerciseSessionState & ExerciseSessionActions;

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState: ExerciseSessionState = {
  songVersionId: null,
  questions: [],
  currentIndex: 0,
  answers: {},
  startedAt: null,
  mode: null,
  _hasHydrated: false,
  tiers: {},
  revealedQuestionIds: {},
  moreAccordionOpen: false,
  learnedVocabIds: {},
  introducedNewVocabIds: {},
  vocabStates: {},
  listeningReplays: {},
  // Phase 10 Plan 05 — Sentence Order session slices.
  sentenceOrderPool: {},
  sentenceOrderAnswer: {},
  sentenceOrderHintShown: {},
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useExerciseSession = create<ExerciseSessionStore>()(
  persist(
    (set) => ({
      ...initialState,

      startSession: (songVersionId, questions, mode) =>
        set({
          songVersionId,
          questions,
          currentIndex: 0,
          answers: {},
          startedAt: Date.now(),
          mode,
          // Reset tier and reveal state so a new session doesn't inherit stale data.
          // ExerciseTab calls setTiers() immediately after startSession() with the
          // freshly-fetched tiers, so this reset is safe.
          tiers: {},
          revealedQuestionIds: {},
          moreAccordionOpen: false, // Phase 08.3: reset across sessions
          // Phase 08.4: reset learn-card + cap-accounting + raw states on each new session
          learnedVocabIds: {},
          introducedNewVocabIds: {},
          vocabStates: {},
          // Phase 10 Plan 04: reset listening-drill replay counters on each
          // new session (same lifecycle as moreAccordionOpen — no cross-session
          // bleed; telemetry is session-scoped).
          listeningReplays: {},
          // Phase 10 Plan 05: reset sentence_order pool / answer / hint state
          // so a new session never inherits a previous session's shuffle.
          sentenceOrderPool: {},
          sentenceOrderAnswer: {},
          sentenceOrderHintShown: {},
        }),

      recordAnswer: (questionId, chosen, correct, timeMs) =>
        set((state) => ({
          answers: {
            ...state.answers,
            [questionId]: { chosen, correct, timeMs },
          },
        })),

      advanceQuestion: () =>
        set((state) => ({
          currentIndex: state.currentIndex + 1,
        })),

      clearSession: () =>
        set({
          ...initialState,
          _hasHydrated: true, // preserve hydration status after clear
        }),

      setHasHydrated: (v) => set({ _hasHydrated: v }),

      setTiers: (tiers) => set({ tiers }),

      setTier: (vocabItemId, tier) =>
        set((state) => ({
          tiers: { ...state.tiers, [vocabItemId]: tier },
        })),

      markRevealed: (questionId) =>
        set((state) => ({
          revealedQuestionIds: { ...state.revealedQuestionIds, [questionId]: true },
        })),

      setMoreAccordionOpen: (v) => set({ moreAccordionOpen: v }),

      markLearnCardShown: (vocabItemId) =>
        set((state) => ({
          learnedVocabIds: { ...state.learnedVocabIds, [vocabItemId]: true },
        })),

      markVocabIntroduced: (vocabItemId) =>
        set((state) => ({
          introducedNewVocabIds: { ...state.introducedNewVocabIds, [vocabItemId]: true },
        })),

      setVocabStates: (states) => set({ vocabStates: states }),

      incrementListeningReplay: (questionId) =>
        set((state) => ({
          listeningReplays: {
            ...state.listeningReplays,
            [questionId]: (state.listeningReplays[questionId] ?? 0) + 1,
          },
        })),

      // ------------------------------------------------------------------
      // Phase 10 Plan 05 — Sentence Order actions.
      // Pool/answer slices are keyed by question.id; the UUIDs stamped here
      // are the ONLY way tokens are addressed in the UI — no positional
      // index is ever exposed via DOM attrs.
      // ------------------------------------------------------------------

      initSentenceOrder: (questionId, verseTokens) =>
        set((state) => {
          // Reload-safe: if the pool already exists (e.g., user refreshed
          // mid-question), don't re-shuffle — preserve the user's work.
          if (state.sentenceOrderPool[questionId]) return state;

          // Stamp each token with a fresh UUID, then apply Fisher-Yates so the
          // DOM never reveals the source verse order. (We use a local copy of
          // the shuffle algorithm because the generator module's shuffle is
          // not exported.)
          const stamped: SentenceOrderToken[] = verseTokens.map((t) => ({
            uuid: crypto.randomUUID(),
            surface: t.surface,
          }));
          for (let i = stamped.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [stamped[i], stamped[j]] = [stamped[j], stamped[i]];
          }
          return {
            sentenceOrderPool: {
              ...state.sentenceOrderPool,
              [questionId]: stamped,
            },
            sentenceOrderAnswer: {
              ...state.sentenceOrderAnswer,
              [questionId]: [],
            },
          };
        }),

      moveToAnswer: (questionId, uuid) =>
        set((state) => {
          const pool = state.sentenceOrderPool[questionId] ?? [];
          const answer = state.sentenceOrderAnswer[questionId] ?? [];
          const token = pool.find((t) => t.uuid === uuid);
          if (!token) return state;
          return {
            sentenceOrderPool: {
              ...state.sentenceOrderPool,
              [questionId]: pool.filter((t) => t.uuid !== uuid),
            },
            sentenceOrderAnswer: {
              ...state.sentenceOrderAnswer,
              [questionId]: [...answer, token],
            },
          };
        }),

      moveToPool: (questionId, uuid) =>
        set((state) => {
          const pool = state.sentenceOrderPool[questionId] ?? [];
          const answer = state.sentenceOrderAnswer[questionId] ?? [];
          const token = answer.find((t) => t.uuid === uuid);
          if (!token) return state;
          return {
            sentenceOrderAnswer: {
              ...state.sentenceOrderAnswer,
              [questionId]: answer.filter((t) => t.uuid !== uuid),
            },
            sentenceOrderPool: {
              ...state.sentenceOrderPool,
              [questionId]: [...pool, token],
            },
          };
        }),

      showHint: (questionId) =>
        set((state) => ({
          sentenceOrderHintShown: {
            ...state.sentenceOrderHintShown,
            [questionId]: true,
          },
        })),
    }),
    {
      name: "kitsubeat-exercise-session",
      storage: createJSONStorage(() => localStorage),
      // _hasHydrated is runtime-only — never persist it
      partialize: (state) => {
        const { _hasHydrated, ...rest } = state;
        void _hasHydrated;
        return rest;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        }
      },
    }
  )
);

// ---------------------------------------------------------------------------
// Test-only window hook (Phase 08.1-06)
// ---------------------------------------------------------------------------
//
// Exposes the Zustand store on `window.__kbExerciseStore` for Playwright E2E
// tests so they can read the current question's correctAnswer without us
// rendering it as a `data-correct` attribute in production DOM (trivially
// cheatable via devtools).
//
// Gate is a SINGLE condition: `process.env.NEXT_PUBLIC_APP_ENV === 'test'`.
// In dev (NEXT_PUBLIC_APP_ENV unset) and production (NEXT_PUBLIC_APP_ENV='production'
// or 'staging'), `window.__kbExerciseStore` is `undefined` — answer-leak guard.
//
// Why NEXT_PUBLIC_*: Next.js inlines NEXT_PUBLIC_* env vars at build time so
// the comparison evaluates to `false` in the production bundle and the dead
// code is tree-shaken — the store reference never reaches the client.
//
// Audit: `grep -n "__kbExerciseStore" src/stores/exerciseSession.ts` should
// show this single assignment inside one `=== 'test'` comparison; no `||`,
// no `process.env.NODE_ENV` fallback.
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_APP_ENV === "test") {
  (window as unknown as { __kbExerciseStore: typeof useExerciseSession }).__kbExerciseStore = useExerciseSession;
}

// ---------------------------------------------------------------------------
// Helper: guard against stale cross-song sessions
// ---------------------------------------------------------------------------

/**
 * Returns true if the store has an active session for the given song version.
 *
 * Conditions:
 * - songVersionId matches
 * - questions array is non-empty
 * - currentIndex has not gone past the end
 *
 * ExerciseTab must call clearSession() when this returns false.
 */
export function isSessionForSong(
  store: ExerciseSessionState,
  songVersionId: string
): boolean {
  return (
    store.songVersionId === songVersionId &&
    store.questions.length > 0 &&
    store.currentIndex < store.questions.length
  );
}
