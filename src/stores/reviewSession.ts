/**
 * Review Session Store
 *
 * Zustand store with localStorage persistence for the /review cross-song session.
 * Mirrors the exerciseSession store pattern but without song context
 * (no songVersionId, songId, lessonId, or versionType).
 *
 * Key differences from exerciseSession:
 * - Items are ReviewQueueItem[] from the queue-builder (not Question[] from generator).
 * - No tiers, revealedQuestionIds, moreAccordionOpen, or learn-card state —
 *   the review session is simpler (no tier-gated reveals, no learn steps).
 * - removeNewCards() action for mid-session daily-cap handling.
 *
 * Persist key: "review-session-storage" (distinct from "kitsubeat-exercise-session").
 *
 * Session isolation: This store is ENTIRELY separate from useExerciseSession.
 * ReviewQuestionCard and ReviewFeedbackPanel MUST import from this store —
 * never from useExerciseSession — to avoid colliding with the per-song session state.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ReviewQueueItem } from "@/lib/review/queue-builder";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReviewAnswerRecord {
  correct: boolean;
  responseTimeMs: number;
}

interface ReviewSessionState {
  items: ReviewQueueItem[];
  currentIndex: number;
  /** Keyed by vocab_item_id — records the user's last answer for each card */
  answers: Record<string, ReviewAnswerRecord>;
  startedAt: number | null;
  _hasHydrated: boolean;
}

interface ReviewSessionActions {
  /**
   * Loads the queue and resets all session progress.
   * Called by ReviewLanding after fetching /api/review/queue.
   */
  load: (items: ReviewQueueItem[]) => void;

  /**
   * Records the answer for the current card (keyed by vocab_item_id).
   */
  recordAnswer: (vocabItemId: string, payload: ReviewAnswerRecord) => void;

  /**
   * Advances to the next card in the queue.
   */
  advance: () => void;

  /**
   * Removes all new cards (isNew=true) from the queue.
   * Called by ReviewSession when the daily_new_card_cap_reached error fires
   * mid-session — continues the session with due-only cards.
   *
   * Does NOT reset currentIndex; the session component MUST handle index
   * adjustment if the card at currentIndex was removed.
   */
  removeNewCards: () => void;

  /** Resets the session entirely (e.g., on Back button from summary screen). */
  reset: () => void;

  setHasHydrated: (v: boolean) => void;
}

type ReviewSessionStore = ReviewSessionState & ReviewSessionActions;

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState: ReviewSessionState = {
  items: [],
  currentIndex: 0,
  answers: {},
  startedAt: null,
  _hasHydrated: false,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useReviewSession = create<ReviewSessionStore>()(
  persist(
    (set) => ({
      ...initialState,

      load: (items) =>
        set({
          items,
          currentIndex: 0,
          answers: {},
          startedAt: Date.now(),
        }),

      recordAnswer: (vocabItemId, payload) =>
        set((state) => ({
          answers: {
            ...state.answers,
            [vocabItemId]: payload,
          },
        })),

      advance: () =>
        set((state) => ({
          currentIndex: state.currentIndex + 1,
        })),

      removeNewCards: () =>
        set((state) => {
          const filtered = state.items.filter((i) => !i.isNew);
          // Keep currentIndex within bounds after pruning.
          const nextIndex = Math.min(state.currentIndex, filtered.length);
          return { items: filtered, currentIndex: nextIndex };
        }),

      reset: () =>
        set({
          ...initialState,
          _hasHydrated: true, // preserve hydration status after reset
        }),

      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: "review-session-storage",
      storage: createJSONStorage(() => localStorage),
      // _hasHydrated is runtime-only — never persist it.
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
