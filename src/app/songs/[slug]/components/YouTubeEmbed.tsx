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
          onStateChange: (event: any) => {
            if (event.data === 1) {
              // YT.PlayerState.PLAYING = 1
              startTracking();
            } else {
              stopTracking();
            }
          },
        },
      });
    }

    if (window.YT?.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      stopTracking();
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
      <div
        ref={containerRef}
        className="aspect-video w-full overflow-hidden rounded-lg bg-black [&>iframe]:h-full [&>iframe]:w-full [&>div]:h-full [&>div]:w-full"
      />
    </div>
  );
}
