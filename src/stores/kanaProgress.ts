/**
 * Kana Progress Store
 *
 * Zustand + persist (localStorage) for per-character kana mastery and session
 * counter. Two independent maps (hiragana, katakana) per CONTEXT decision —
 * あ and ア have separate 10-star counters and separate row unlocks.
 *
 * Pattern: copy of src/stores/exerciseSession.ts structure (persist + hydration
 * guard + window hook for test env). When Phase 3 auth lands, a thin adapter
 * mirrors the same shape into user_kana_mastery rows; localStorage stays as
 * fallback for guests.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Script, MasteryMap } from "@/lib/kana/types";
import { applyStarDelta } from "@/lib/kana/mastery";

interface KanaProgressState {
  hiragana: MasteryMap;          // char -> stars 0..10
  katakana: MasteryMap;
  sessionsCompleted: number;     // monotonically incremented at session-summary
  _hasHydrated: boolean;
}

interface KanaProgressActions {
  /** Apply a single answer outcome to one character's star count. */
  applyAnswer: (script: Script, kana: string, correct: boolean) => void;
  /** Set a star count directly (used by the "Got it" 0-star pre-reveal path — KANA-04 awards exactly 1 star). */
  setStars: (script: Script, kana: string, stars: number) => void;
  /** Bump sessionsCompleted by 1 — called from the session summary. */
  incrementSessionsCompleted: () => void;
  /** Replace mastery wholesale (used by guest→signed-up migration in a future phase). */
  hydrateFrom: (input: { hiragana: MasteryMap; katakana: MasteryMap }) => void;
  setHasHydrated: (v: boolean) => void;
  /** Test-only escape hatch — clears everything without re-creating the store. */
  __resetForTests: () => void;
}

export const useKanaProgress = create<KanaProgressState & KanaProgressActions>()(
  persist(
    (set) => ({
      hiragana: {},
      katakana: {},
      sessionsCompleted: 0,
      _hasHydrated: false,
      applyAnswer: (script, kana, correct) =>
        set((s) => {
          const map = script === "hiragana" ? s.hiragana : s.katakana;
          const current = map[kana] ?? 0;
          const next = applyStarDelta(current, correct);
          const updated = { ...map, [kana]: next };
          return script === "hiragana" ? { hiragana: updated } : { katakana: updated };
        }),
      setStars: (script, kana, stars) =>
        set((s) => {
          const clamped = Math.max(0, Math.min(10, stars));
          const map = script === "hiragana" ? s.hiragana : s.katakana;
          const updated = { ...map, [kana]: clamped };
          return script === "hiragana" ? { hiragana: updated } : { katakana: updated };
        }),
      incrementSessionsCompleted: () =>
        set((s) => ({ sessionsCompleted: s.sessionsCompleted + 1 })),
      hydrateFrom: (input) => set({ hiragana: input.hiragana, katakana: input.katakana }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
      __resetForTests: () => set({ hiragana: {}, katakana: {}, sessionsCompleted: 0 }),
    }),
    {
      name: "kitsubeat-kana-mastery-v1",       // versioned key — future schema change bumps to v2
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        // Exclude transient flags from persisted JSON.
        const { _hasHydrated, ...rest } = s;
        void _hasHydrated;
        return rest;
      },
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);

// ─── Test-env window hook (Playwright reads correct answers from the store) ──
// Pattern lifted verbatim from src/stores/exerciseSession.ts:219-220.
// Single condition gate: NEXT_PUBLIC_APP_ENV === "test". Production bundle tree-shakes.
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_APP_ENV === "test") {
  (window as unknown as { __kbKanaStore: typeof useKanaProgress }).__kbKanaStore = useKanaProgress;
}
