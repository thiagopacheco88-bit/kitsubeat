"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { usePlayer, type EmbedState } from "./PlayerContext";
import { recordSongPlay } from "@/app/actions/songPlays";

// YouTube IFrame API global types. `YT` is a UMD global (see @types/youtube),
// so within this module file we type `window.YT` with an inline constructor
// signature rather than `typeof YT` — the latter would require importing the
// UMD value, which @types/youtube does not expose via a module export.
// eslint-disable-next-line @typescript-eslint/no-namespace
declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string | HTMLElement,
        options: YT.PlayerOptions
      ) => YT.Player;
    };
    __kbPlayer?: YT.Player;
    onYouTubeIframeAPIReady: () => void;
  }
}

/**
 * Embed state semantics (type imported from ./PlayerContext, owned there since
 * Plan 10-02 promoted it out of YouTubeEmbed-local state):
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
  songVersionId,
  userId,
}: {
  videoId: string;
  videoIdShort?: string | null;
  /**
   * Wired to recordSongPlay on first PLAYING transition. Omit to disable play
   * tracking (e.g. in tests or when the embed isn't tied to a catalog song).
   */
  songVersionId?: string;
  /**
   * Optional Clerk user id. "anonymous" or missing maps to a NULL user_id on
   * the song_plays row — anon plays still count toward total volume.
   */
  userId?: string | null;
}) {
  const { setCurrentTimeMs, setEmbedState, _registerApi, embedState } =
    usePlayer();
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
  // First-play scroll lands the SongLayout root at viewport top on mobile so
  // the lyrics panel below the video is immediately visible. Only fires once
  // per mount — the user can scroll freely after that without us fighting them.
  const hasScrolledOnFirstPlayRef = useRef(false);
  // Arms the first-play scroll only after the user actually taps/clicks the
  // player container. Without this, cached user activation from the previous
  // page (navigator.userActivation stays live for ~5s) or a YT autoplay
  // transition through PLAYING would fire the scroll on desktop with no real
  // intent. Pointerdown is the right signal: it fires on the container before
  // focus moves into the cross-origin iframe on every pointer device.
  const userTappedPlayerRef = useRef(false);

  // Per-version session key for idempotent play recording. Regenerated inside
  // the player-init effect on every videoId / version change so a user who
  // toggles TV → Full gets a fresh row — captures "user explored both cuts"
  // signal without conflating with a single listen. Unique (song_version_id,
  // session_key) constraint on the server is the ultimate dedupe backstop.
  const sessionKeyRef = useRef<string>("");
  const hasRecordedPlayRef = useRef(false);

  // Plan 10-02: embedState is owned by PlayerContext (promoted from local
  // state). YouTubeEmbed drives it via `setEmbedState` so downstream consumers
  // (ListeningDrillCard, etc.) can read it without importing YouTubeEmbed.
  // EmbedState is re-imported above to keep this file's type contract
  // self-documenting even though the value lives in the context.

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

    // Fresh play-tracking session for this (re)init. On version toggle, the
    // user crosses into a different song_version_id and we want a new row.
    sessionKeyRef.current =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    hasRecordedPlayRef.current = false;

    // Load YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }

    // Preserve the window scroll position across iframe insertion. The
    // cross-origin YouTube iframe can transiently grab focus on load, which
    // makes the browser "scroll focused element into view" and drops the
    // SongLayout at the top of the viewport (hiding the song title/badges).
    // We snapshot scrollY just before the player mounts, then for a short
    // window afterward restore it if it moves without the user touching the
    // page. User-initiated scrolls (wheel/touch/keyboard) are detected via
    // their input events and disarm the guard immediately.
    const savedScrollY =
      typeof window !== "undefined" ? window.scrollY : 0;
    let scrollGuardActive = true;
    const disarm = () => {
      scrollGuardActive = false;
    };
    if (typeof window !== "undefined") {
      window.addEventListener("wheel", disarm, { once: true, passive: true });
      window.addEventListener("touchstart", disarm, {
        once: true,
        passive: true,
      });
      window.addEventListener("keydown", disarm, { once: true });
      const scrollHandler = () => {
        if (!scrollGuardActive) return;
        if (window.scrollY !== savedScrollY) {
          window.scrollTo({ top: savedScrollY });
        }
      };
      window.addEventListener("scroll", scrollHandler, { passive: true });
      setTimeout(() => {
        scrollGuardActive = false;
        window.removeEventListener("scroll", scrollHandler);
        window.removeEventListener("wheel", disarm);
        window.removeEventListener("touchstart", disarm);
        window.removeEventListener("keydown", disarm);
      }, 2000);
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
          onReady: (event: YT.PlayerEvent) => {
            setEmbedState("ready");
            // Test-only instrumentation. Exposes the YT player so Playwright specs
            // can call seekTo/playVideo across the cross-origin iframe boundary.
            // Gated EXCLUSIVELY on NEXT_PUBLIC_APP_ENV === 'test' — never leaks
            // into dev or prod (single-condition gate; do NOT OR with NODE_ENV).
            // See plan 08.1-05 Task 2 + verification: grep "NEXT_PUBLIC_APP_ENV" must
            // return only this comparison and the VerseBlock data-start-ms gate.
            if (process.env.NEXT_PUBLIC_APP_ENV === "test") {
              window.__kbPlayer = event.target;
            }
            // Plan 10-02: production-grade imperative API registration. The raw
            // YT.Player reference stays scoped to this closure — only the three
            // verbs (seekTo/play/pause) cross the PlayerContext boundary. The
            // seekTo signature converts ms → seconds internally so consumers
            // speak the same ms vocabulary as Verse.start_time_ms.
            //
            // Registration-bundle pattern (equivalent surface to the plan's
            // setSeekTo / setPlay / setPause / setIsReady discrete setters —
            // one _registerApi call dispatches all four via a single ref).
            _registerApi({
              seekTo: (ms: number) => {
                event.target.seekTo(ms / 1000, true);
              },
              play: () => event.target.playVideo(),
              pause: () => event.target.pauseVideo(),
            });
          },
          onStateChange: (event: YT.OnStateChangeEvent) => {
            if (event.data === 1) {
              // YT.PlayerState.PLAYING = 1
              startTracking();
              // First PLAYING transition per mount → record a play. Fire-and-
              // forget: the server action is idempotent, and a failed insert
              // must NOT break playback. Errors are swallowed intentionally —
              // play-count is a non-critical analytic signal, not a gate.
              //
              // Admin bypass — skip recording when either:
              //   1. Running outside production (local dev + test runs don't
              //      pollute the launch stats).
              //   2. localStorage flag 'kb_skip_play_tracking' === '1' — lets
              //      the maintainer silence their own browser in prod without
              //      redeploying. Set once in DevTools:
              //        localStorage.setItem('kb_skip_play_tracking', '1')
              const adminBypass =
                process.env.NODE_ENV !== "production" ||
                (typeof window !== "undefined" &&
                  window.localStorage?.getItem("kb_skip_play_tracking") ===
                    "1");
              if (
                !adminBypass &&
                !hasRecordedPlayRef.current &&
                songVersionId &&
                sessionKeyRef.current
              ) {
                hasRecordedPlayRef.current = true;
                void recordSongPlay(
                  songVersionId,
                  sessionKeyRef.current,
                  userId ?? null,
                ).catch(() => {
                  // swallow — do not disrupt playback
                });
              }
              // Three conditions must all hold for the mobile first-play
              // scroll: (1) viewport is actually mobile-sized, (2) the user
              // tapped the player container directly this mount (not just had
              // some recent click on a previous page), (3) we haven't scrolled
              // yet this mount. Without (2), YT autoplay transitions or cached
              // user activation can trigger a spurious scroll on desktop.
              const isMobileViewport =
                typeof window !== "undefined" &&
                window.matchMedia("(max-width: 1023px)").matches;
              if (
                !hasScrolledOnFirstPlayRef.current &&
                isMobileViewport &&
                userTappedPlayerRef.current
              ) {
                hasScrolledOnFirstPlayRef.current = true;
                containerRef.current
                  ?.closest<HTMLElement>("[data-song-layout]")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }
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
      setEmbedState((prev: EmbedState) => (prev === "loading" ? "error" : prev));
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
      // Plan 10-02: clear the registered imperative API so ListeningDrillCard
      // and other consumers see `isReady === false` after the embed tears down
      // (version toggle, unmount). Prevents stale seekTo/play calls from
      // reaching a destroyed YT.Player.
      _registerApi(null);
    };
  }, [currentId, songVersionId, userId, startTracking, stopTracking, setEmbedState, _registerApi]);

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
          onPointerDown={() => {
            userTappedPlayerRef.current = true;
          }}
          className="aspect-video w-full overflow-hidden rounded-lg bg-black [&>iframe]:h-full [&>iframe]:w-full [&>div]:h-full [&>div]:w-full"
        />
      )}
    </div>
  );
}
