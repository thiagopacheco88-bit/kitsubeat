"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

type TranslationLang = "en" | "pt-BR" | "es";

/**
 * Embed states are owned here and driven by YouTubeEmbed via `setEmbedState`.
 * Promoted from YouTubeEmbed-local state to PlayerContext so that non-embed
 * consumers (Phase 10 Plan 04 ListeningDrillCard) can reason about player
 * availability without importing YouTubeEmbed internals.
 *
 * Plan 10-02: Pitfall 3 — Listening Drill mounts AFTER the YT watchdog window
 * has already expired. Drill card reads `embedState === "error"` to show the
 * CONTEXT-locked "unavailable" fallback.
 */
export type EmbedState = "loading" | "ready" | "error";

/**
 * Imperative API bundle registered by YouTubeEmbed inside `onReady`. Kept behind
 * a ref so the context identity stays stable across player lifecycle events —
 * registering or clearing the API does NOT re-render every `usePlayer` consumer
 * downstream. Phase 10 Plan 04's ListeningDrillCard calls `seekTo`/`play`
 * through the stable wrappers exposed on the context value.
 *
 * The raw `YT.Player` reference intentionally never appears in this bundle:
 *   - Production bundles must not leak the test-only `window.__kbPlayer` hook.
 *   - Plan 08.1-05 gates `__kbPlayer` on NEXT_PUBLIC_APP_ENV === 'test'; this
 *     context surface is the production-grade alternative.
 */
export interface PlayerImperativeApi {
  seekTo: (ms: number) => void;
  play: () => void;
  pause: () => void;
}

interface PlayerState {
  showFurigana: boolean;
  setShowFurigana: (v: boolean) => void;
  showRomaji: boolean;
  setShowRomaji: (v: boolean) => void;
  translationLang: TranslationLang;
  setTranslationLang: (v: TranslationLang) => void;
  currentTimeMs: number;
  setCurrentTimeMs: (v: number) => void;

  // Phase 10 Plan 02: promoted from YouTubeEmbed-local state.
  embedState: EmbedState;
  setEmbedState: (v: EmbedState) => void;

  // Phase 10 Plan 02: imperative API surface.
  // Consumers (ListeningDrillCard, etc.) call these verbs directly. Before the
  // YT iframe reports ready OR after it has been torn down, these become safe
  // no-ops (warn in dev; silent in prod). See `isReady` below to short-circuit
  // before attempting.
  seekTo: (ms: number) => void;
  play: () => void;
  pause: () => void;

  /**
   * Convenience for Listening Drill replay UX: pauses, seeks, waits 50ms for
   * the YT postMessage to land, then plays. Debounced to 400ms to avoid racing
   * `onStateChange` (see 10-RESEARCH.md Pitfall 2). Rapid successive calls
   * collapse to a single trailing-edge execution with the latest ms.
   */
  seekAndPlay: (ms: number) => void;

  /**
   * True when embedState === "ready" AND an imperative API has been registered.
   * Gates Phase 10 Plan 04 ListeningDrillCard's replay button so spam clicks
   * during initial load silently noop instead of throwing.
   */
  isReady: boolean;

  /**
   * Registration hook used EXCLUSIVELY by YouTubeEmbed. Leading underscore
   * signals "internal plumbing" — ListeningDrillCard and other consumers must
   * not call this. Calling with `null` on unmount clears the ref so stale
   * callbacks don't fire after the player has been destroyed.
   */
  _registerApi: (api: PlayerImperativeApi | null) => void;
}

const PlayerCtx = createContext<PlayerState | null>(null);

/**
 * Debounce window (ms) for `seekAndPlay` coalescing. 10-RESEARCH Pitfall 2:
 * rapid replay clicks fire pauseVideo + seekTo + playVideo out of order over
 * postMessage; 400ms empirically absorbs the burst while staying below human
 * perception of "delayed response" for a single tap.
 */
const SEEK_DEBOUNCE_MS = 400;

/**
 * Delay between seekTo and playVideo inside seekAndPlay. The YT IFrame API
 * fires postMessage asynchronously; firing playVideo in the same tick as
 * seekTo causes playback to start at the PRE-seek position on some browsers.
 * 50ms is empirically the smallest stable gap (10-RESEARCH Pitfall 2).
 */
const SEEK_TO_PLAY_DELAY_MS = 50;

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [showFurigana, setShowFurigana] = useState(true);
  const [showRomaji, setShowRomaji] = useState(true);
  const [translationLang, setTranslationLang] =
    useState<TranslationLang>("en");
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [embedState, setEmbedState] = useState<EmbedState>("loading");

  // The registered imperative API. `useState` (not `useRef`) so that
  // registering/clearing triggers a render — `isReady` needs to flip when the
  // API flips between null and non-null. Individual `seekTo`/`play` wrappers
  // below still read through the state so they stay stable (useCallback deps
  // are empty — they dispatch through the current state closure).
  const apiRef = useRef<PlayerImperativeApi | null>(null);
  const [apiReady, setApiReady] = useState(false);

  // Debounce state for seekAndPlay. Held in refs (not state) — no UI should
  // rerender on timestamp bookkeeping.
  const seekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSeekRef = useRef<number | null>(null);

  const _registerApi = useCallback((api: PlayerImperativeApi | null) => {
    apiRef.current = api;
    setApiReady(api !== null);
    // If the embed tore down, cancel any in-flight debounced seekAndPlay so we
    // don't call seekTo on a destroyed player.
    if (api === null && seekTimerRef.current) {
      clearTimeout(seekTimerRef.current);
      seekTimerRef.current = null;
      pendingSeekRef.current = null;
    }
  }, []);

  // Stable wrappers. Consumers bind to these once — the ref dispatch swaps the
  // underlying implementation without re-rendering anything that destructured
  // `seekTo`/`play`/`pause` from `usePlayer()`.
  const seekTo = useCallback((ms: number) => {
    const api = apiRef.current;
    if (!api) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn(
          "[PlayerContext] seekTo called before YouTube player registered — no-op."
        );
      }
      return;
    }
    api.seekTo(ms);
  }, []);

  const play = useCallback(() => {
    const api = apiRef.current;
    if (!api) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn(
          "[PlayerContext] play called before YouTube player registered — no-op."
        );
      }
      return;
    }
    api.play();
  }, []);

  const pause = useCallback(() => {
    const api = apiRef.current;
    if (!api) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn(
          "[PlayerContext] pause called before YouTube player registered — no-op."
        );
      }
      return;
    }
    api.pause();
  }, []);

  /**
   * Listening Drill replay convenience. Collapses rapid calls within
   * SEEK_DEBOUNCE_MS into a single trailing-edge execution using the latest
   * ms. Before execution, pauses the player, seeks, waits
   * SEEK_TO_PLAY_DELAY_MS for the YT postMessage to settle, then plays.
   *
   * Any call before the API registers is a silent no-op (same as `seekTo`).
   */
  const seekAndPlay = useCallback((ms: number) => {
    pendingSeekRef.current = ms;
    if (seekTimerRef.current) clearTimeout(seekTimerRef.current);
    seekTimerRef.current = setTimeout(() => {
      const targetMs = pendingSeekRef.current;
      pendingSeekRef.current = null;
      seekTimerRef.current = null;
      const api = apiRef.current;
      if (!api || targetMs === null) return;
      api.pause();
      api.seekTo(targetMs);
      setTimeout(() => {
        const current = apiRef.current;
        if (!current) return;
        current.play();
      }, SEEK_TO_PLAY_DELAY_MS);
    }, SEEK_DEBOUNCE_MS);
  }, []);

  const isReady = embedState === "ready" && apiReady;

  return (
    <PlayerCtx.Provider
      value={{
        showFurigana,
        setShowFurigana,
        showRomaji,
        setShowRomaji,
        translationLang,
        setTranslationLang,
        currentTimeMs,
        setCurrentTimeMs,
        embedState,
        setEmbedState,
        seekTo,
        play,
        pause,
        seekAndPlay,
        isReady,
        _registerApi,
      }}
    >
      {children}
    </PlayerCtx.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerCtx);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
