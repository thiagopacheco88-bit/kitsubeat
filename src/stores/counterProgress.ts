/**
 * Counter Progress Store
 *
 * Zustand + persist (localStorage) for per-counter mastery and session counter.
 * Mirrors src/stores/kanaProgress.ts — one mastery map keyed by counter ID.
 *
 * When Phase 3 auth lands, a thin adapter can mirror this shape into DB rows;
 * localStorage stays as the fallback for guests.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CounterMasteryMap } from "@/lib/counters/types";
import { applyStarDelta } from "@/lib/counters/mastery";

interface CounterProgressState {
  mastery: CounterMasteryMap;   // counter.id -> stars 0..10
  sessionsCompleted: number;
  _hasHydrated: boolean;
}

interface CounterProgressActions {
  applyAnswer: (counterId: string, correct: boolean) => void;
  setStars: (counterId: string, stars: number) => void;
  incrementSessionsCompleted: () => void;
  hydrateFrom: (mastery: CounterMasteryMap) => void;
  setHasHydrated: (v: boolean) => void;
  __resetForTests: () => void;
}

export const useCounterProgress = create<CounterProgressState & CounterProgressActions>()(
  persist(
    (set) => ({
      mastery: {},
      sessionsCompleted: 0,
      _hasHydrated: false,

      applyAnswer: (counterId, correct) =>
        set((s) => {
          const current = s.mastery[counterId] ?? 0;
          const next = applyStarDelta(current, correct);
          return { mastery: { ...s.mastery, [counterId]: next } };
        }),

      setStars: (counterId, stars) =>
        set((s) => ({
          mastery: { ...s.mastery, [counterId]: Math.max(0, Math.min(10, stars)) },
        })),

      incrementSessionsCompleted: () =>
        set((s) => ({ sessionsCompleted: s.sessionsCompleted + 1 })),

      hydrateFrom: (mastery) => set({ mastery }),

      setHasHydrated: (v) => set({ _hasHydrated: v }),

      __resetForTests: () => set({ mastery: {}, sessionsCompleted: 0 }),
    }),
    {
      name: "kitsubeat-counter-mastery-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        const { _hasHydrated, ...rest } = s;
        void _hasHydrated;
        return rest;
      },
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);

// Test-env window hook — pattern from kanaProgress.ts.
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_APP_ENV === "test") {
  (window as unknown as { __kbCounterStore: typeof useCounterProgress }).__kbCounterStore =
    useCounterProgress;
}
