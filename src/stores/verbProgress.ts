import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ConjFormId, VerbMasteryMap } from "@/lib/verbs/types";
import { applyStarDelta, masteryKey } from "@/lib/verbs/mastery";

interface VerbProgressState {
  mastery: VerbMasteryMap;
  sessionsCompleted: number;
  /** User preference: whether romaji is shown in sessions. Persists across sessions. */
  showRomaji: boolean;
  _hasHydrated: boolean;
}

interface VerbProgressActions {
  applyAnswer: (verbId: string, formId: ConjFormId, correct: boolean) => void;
  incrementSessionsCompleted: () => void;
  toggleRomaji: () => void;
  hydrateFrom: (mastery: VerbMasteryMap) => void;
  setHasHydrated: (v: boolean) => void;
  __resetForTests: () => void;
}

export const useVerbProgress = create<VerbProgressState & VerbProgressActions>()(
  persist(
    (set) => ({
      mastery: {},
      sessionsCompleted: 0,
      showRomaji: true, // default: romaji shown
      _hasHydrated: false,

      applyAnswer: (verbId, formId, correct) =>
        set((s) => {
          const key = masteryKey(verbId, formId);
          const current = s.mastery[key] ?? 0;
          return { mastery: { ...s.mastery, [key]: applyStarDelta(current, correct) } };
        }),

      incrementSessionsCompleted: () =>
        set((s) => ({ sessionsCompleted: s.sessionsCompleted + 1 })),

      toggleRomaji: () =>
        set((s) => ({ showRomaji: !s.showRomaji })),

      hydrateFrom: (mastery) => set({ mastery }),

      setHasHydrated: (v) => set({ _hasHydrated: v }),

      __resetForTests: () => set({ mastery: {}, sessionsCompleted: 0 }),
    }),
    {
      name: "kitsubeat-verb-mastery-v1",
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

if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_APP_ENV === "test") {
  (window as unknown as { __kbVerbStore: typeof useVerbProgress }).__kbVerbStore = useVerbProgress;
}
