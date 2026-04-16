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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnswerRecord {
  chosen: string;
  correct: boolean;
  timeMs: number;
}

interface ExerciseSessionState {
  songVersionId: string | null;
  questions: Question[];
  currentIndex: number;
  answers: Record<string, AnswerRecord>;
  startedAt: number | null;
  mode: "short" | "full" | null;
  _hasHydrated: boolean;
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
