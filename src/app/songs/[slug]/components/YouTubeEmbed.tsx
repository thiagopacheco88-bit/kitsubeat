"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePlayer } from "./PlayerContext";

// YouTube IFrame API global types
// eslint-disable-next-line @typescript-eslint/no-namespace
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

/**
 * Embed states surfaced via the `data-yt-state` attribute.
 *
 * - "loading": initial state; iframe API has not yet fired onReady or onError.
 * - "ready":   onReady fired; the player is interactive.
 * - "error":   onError fired (any error code), OR the 15s watchdog tripped
 *              because nothing fired at all (typical of network blocks where
 *              the iframe URL never even loads — the YT API never initializes).
 *
 * Plan 08.1-07 Task 2 added the error fallback to satisfy the CONTEXT-locked
 * coverage requirement: "Geo-restricted / missing YouTube videos fail gracefully
 * (no infinite spinner, clear user message)". The fallback UI is observable —
 * tests/e2e/regression-geo-fallback.spec.ts asserts both that it appears and
 * that the surrounding lesson content is not gated by the player failing.
 */
type EmbedState = "loading" | "ready" | "error";

/**
 * Watchdog timeout (ms). If the player has not transitioned to "ready" within
 * this window, treat the embed as failed. 15s covers the typical cold-start
 * window for the YT API on slow networks while still surfacing a clear error
 * before the user gives up.
 */
const WATCHDOG_MS = 15_000;

export default function YouTubeEmbed({
  videoId,
  videoIdShort,
}: {
  videoId: string;
  videoIdShort?: string | null;
}) {
  const { setCurrentTimeMs } = usePlayer();
  const hasShort = !!videoIdShort;
  const [version, setVersion] = useState<"short" | "full">(
    hasShort ? "short" : "full"
  );
  const currentId =
    version === "short" && videoIdShort ? videoIdShort : videoId;

  const playerRef = useRef<YT.Player | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Single-source-of-truth for the embed UI state. Separate state per `currentId`
  // is achieved by resetting it on the same effect that re-creates the player
  // (see useEffect below) — version toggles also reset the loading clock.
  const [embedState, setEmbedState] = useState<EmbedState>("loading");

  const startTracking = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (playerRef.current?.getCurrentTime) {
        const seconds = playerRef.current.getCurrentTime();
        setCurrentTimeMs(Math.floor(seconds * 1000));
      }
    }, 250);
  }, [setCurrentTimeMs]);

  const stopTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Reset UI state when the videoId or version changes — the user gets a
    // fresh "loading" indicator and a fresh 15s watchdog clock.
    setEmbedState("loading");

    // Load YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }

    function initPlayer() {
      if (!containerRef.current) return;
      // Clear previous player
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      containerRef.current.innerHTML = "";
      const div = document.createElement("div");
      div.id = "yt-player-" + currentId;
      containerRef.current.appendChild(div);

      playerRef.current = new window.YT.Player(div.id, {
        videoId: currentId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          origin: window.location.origin,
        },
        events: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onReady: (event: any) => {
            setEmbedState("ready");
            // Test-only instrumentation. Exposes the YT player so Playwright specs
            // can call seekTo/playVideo across the cross-origin iframe boundary.
            // Gated EXCLUSIVELY on NEXT_PUBLIC_APP_ENV === 'test' — never leaks
            // into dev or prod (single-condition gate; do NOT OR with NODE_ENV).
            // See plan 08.1-05 Task 2 + verification: grep "NEXT_PUBLIC_APP_ENV" must
            // return only this comparison and the VerseBlock data-start-ms gate.
            if (process.env.NEXT_PUBLIC_APP_ENV === "test") {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (window as any).__kbPlayer = event.target;
            }
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onStateChange: (event: any) => {
            if (event.data === 1) {
              // YT.PlayerState.PLAYING = 1
              startTracking();
            } else {
              stopTracking();
            }
          },
          // YouTube error event payload: event.data is a numeric error code.
          //   2   = invalid videoId parameter
          //   5   = HTML5 player error
          //   100 = video not found / private / removed
          //   101 / 150 = embedding disabled by owner (also fired for region locks)
          // We treat ANY error code as a fallback trigger — the user message is
          // identical because the actionable response is the same (lyrics still
          // work, video doesn't). Specific code branching is not user-relevant.
          onError: () => {
            setEmbedState("error");
          },
        },
      });
    }

    if (window.YT?.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    // Watchdog: if neither onReady nor onError fires within WATCHDOG_MS, the
    // iframe is presumed unreachable (region-blocked at the network layer,
    // ad-blocker, route-intercepted in tests). This is the only path that
    // covers the "iframe never loads at all" failure mode — the YT API never
    // attaches to a DOM that never resolved.
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    watchdogRef.current = setTimeout(() => {
      // Use the functional form so we don't accidentally overwrite a "ready"
      // state set by onReady firing in the same tick as the watchdog.
      setEmbedState((prev) => (prev === "loading" ? "error" : prev));
    }, WATCHDOG_MS);

    return () => {
      stopTracking();
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [currentId, startTracking, stopTracking]);

  return (
    <div>
      {hasShort && (
        <div className="mb-2 flex gap-1">
          <button
            onClick={() => setVersion("short")}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              version === "short"
                ? "bg-red-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            TV Size
          </button>
          <button
            onClick={() => setVersion("full")}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              version === "full"
                ? "bg-red-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            Full Version
          </button>
        </div>
      )}
      {embedState === "error" ? (
        // Fallback block. Replaces the iframe container entirely so the
        // browser does not retain a half-loaded iframe element. Copy is fixed
        // (no i18n keys yet — the surrounding player UI is also not localized).
        <div
          data-yt-state="error"
          className="aspect-video w-full flex items-center justify-center rounded-lg bg-neutral-900 text-neutral-300 p-6 text-center"
        >
          <div>
            <p className="font-medium">Video unavailable</p>
            <p className="mt-1 text-sm opacity-80">
              This video may be geo-restricted or removed. The lyrics and
              lesson content below still work.
            </p>
          </div>
        </div>
      ) : (
        <div
          ref={containerRef}
          data-yt-state={embedState}
          className="aspect-video w-full overflow-hidden rounded-lg bg-black [&>iframe]:h-full [&>iframe]:w-full [&>div]:h-full [&>div]:w-full"
        />
      )}
    </div>
  );
}
