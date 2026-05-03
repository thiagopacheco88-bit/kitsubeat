/**
 * Phase 11.5 D-21: useAdminLyricsStore — single zustand store for the admin lyrics editor.
 *
 * Holds the in-flight draft (verses, dirty flags, base version pin, save status).
 * Per-input components are uncontrolled with `onBlur` → store update.
 * Auto-save effect (5s debounce) lives at the VerseEditor component level (not in store middleware)
 * because it needs the editorId from the Clerk-rendered RSC, which is not in scope here.
 *
 * localStorage persistence: handled by the VerseEditor component via a per-load handshake
 * (server-first, localStorage-fallback) as specified in D-17. The store itself is not
 * persisted via zustand middleware — it is initialized on mount and hydrated from the
 * page.tsx server-fetched draft (or localStorage fallback).
 *
 * Test hook (per kanaProgress.ts pattern): exposes the store on window when in test mode.
 */

import { create } from "zustand";
import type { Verse } from "@/lib/types/lesson";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface AdminLyricsState {
  songVersionId: string | null;
  editorId: string | null;
  baseVersionId: string | null;
  baseVersionNumber: number | null;
  verses: Verse[];
  dirtyVerseNumbers: number[];
  saveStatus: SaveStatus;
  saveError: string | null;
  lastSavedAt: number | null;
  _hasHydrated: boolean;
}

export interface AdminLyricsActions {
  init: (input: {
    songVersionId: string;
    editorId: string;
    baseVersionId: string;
    baseVersionNumber: number | null;
    verses: Verse[];
  }) => void;
  updateVerse: (verseNumber: number, patch: Partial<Verse>) => void;
  /**
   * Shift every verse's start_time_ms and end_time_ms by deltaMs (positive = later,
   * negative = earlier). Marks every verse number dirty so the standard auto-save
   * + publish flow picks them up. No-op when deltaMs === 0.
   */
  shiftAllVerses: (deltaMs: number) => void;
  insertVerse: (afterVerseNumber: number | null) => void;
  deleteVerse: (verseNumber: number) => void;
  reset: () => void;
  markSaving: () => void;
  markSaved: () => void;
  markError: (msg: string) => void;
  setHasHydrated: (v: boolean) => void;
  /**
   * Called after a successful publish (or regen-publish). The submitted verses
   * are now the new baseline, so we KEEP them in state — clearing would blank
   * the editor until the next hard refresh. Advances baseVersionId/Number for
   * subsequent stale-publish detection and zeroes the dirty set.
   */
  markPublished: (input: {
    newVersionId: string;
    newVersionNumber: number;
  }) => void;
}

const INITIAL: AdminLyricsState = {
  songVersionId: null,
  editorId: null,
  baseVersionId: null,
  baseVersionNumber: null,
  verses: [],
  dirtyVerseNumbers: [],
  saveStatus: "idle",
  saveError: null,
  lastSavedAt: null,
  _hasHydrated: false,
};

function dedupeAdd(arr: number[], n: number): number[] {
  return arr.includes(n) ? arr : [...arr, n].sort((a, b) => a - b);
}

export const useAdminLyricsStore = create<AdminLyricsState & AdminLyricsActions>()(
  (set, get) => ({
    ...INITIAL,

    init: ({ songVersionId, editorId, baseVersionId, baseVersionNumber, verses }) => {
      set({
        songVersionId,
        editorId,
        baseVersionId,
        baseVersionNumber,
        verses,
        dirtyVerseNumbers: [],
        saveStatus: "idle",
        saveError: null,
        lastSavedAt: null,
        _hasHydrated: true,
      });
    },

    updateVerse: (verseNumber, patch) => {
      set({
        verses: get().verses.map((v) =>
          v.verse_number === verseNumber ? { ...v, ...patch } : v
        ),
        dirtyVerseNumbers: dedupeAdd(get().dirtyVerseNumbers, verseNumber),
      });
    },

    shiftAllVerses: (deltaMs) => {
      if (deltaMs === 0) return;
      const verses = get().verses;
      if (verses.length === 0) return;
      const shifted = verses.map((v) => ({
        ...v,
        start_time_ms: v.start_time_ms + deltaMs,
        end_time_ms: v.end_time_ms + deltaMs,
      }));
      const allNumbers = shifted.map((v) => v.verse_number);
      const dirty = get().dirtyVerseNumbers;
      const merged = Array.from(new Set([...dirty, ...allNumbers])).sort(
        (a, b) => a - b
      );
      set({ verses: shifted, dirtyVerseNumbers: merged });
    },

    insertVerse: (afterVerseNumber) => {
      const verses = get().verses;
      const idx =
        afterVerseNumber === null
          ? -1
          : verses.findIndex((v) => v.verse_number === afterVerseNumber);
      const newVerseNumber = Math.max(0, ...verses.map((v) => v.verse_number)) + 1;
      const newVerse: Verse = {
        verse_number: newVerseNumber,
        start_time_ms: 0,
        end_time_ms: 0,
        tokens: [],
        translations: { en: "" },
        literal_meaning: "",
        cultural_context: "",
      };
      const next = [...verses];
      next.splice(idx + 1, 0, newVerse);
      set({
        verses: next,
        dirtyVerseNumbers: dedupeAdd(get().dirtyVerseNumbers, newVerseNumber),
      });
    },

    deleteVerse: (verseNumber) => {
      set({
        verses: get().verses.filter((v) => v.verse_number !== verseNumber),
        dirtyVerseNumbers: dedupeAdd(get().dirtyVerseNumbers, verseNumber),
      });
    },

    reset: () => set({ ...INITIAL }),

    markSaving: () => set({ saveStatus: "saving", saveError: null }),
    markSaved: () => set({ saveStatus: "saved", lastSavedAt: Date.now() }),
    markError: (msg) => set({ saveStatus: "error", saveError: msg }),

    setHasHydrated: (v) => set({ _hasHydrated: v }),

    markPublished: ({ newVersionId, newVersionNumber }) =>
      set({
        baseVersionId: newVersionId,
        baseVersionNumber: newVersionNumber,
        dirtyVerseNumbers: [],
        saveStatus: "idle",
        saveError: null,
      }),
  })
);

// Test hook (matches src/stores/kanaProgress.ts:85-87 pattern)
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_APP_ENV === "test") {
  (
    window as unknown as {
      __kbAdminLyricsStore: typeof useAdminLyricsStore;
    }
  ).__kbAdminLyricsStore = useAdminLyricsStore;
}
