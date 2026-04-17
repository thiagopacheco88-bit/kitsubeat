"use client";

import { type ReactNode } from "react";

/**
 * On mobile, the video + lyrics area occupies the viewport height with the
 * lyrics panel scrolling independently (~2 verses visible). This layout is
 * stable across play/pause — no fullscreen overlay, no scroll jumps.
 *
 * On desktop (lg+) the existing side-by-side layout is preserved.
 */
export default function SongLayout({
  video,
  lyrics,
}: {
  video: ReactNode;
  lyrics: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 max-lg:h-[calc(100dvh-12rem)] lg:flex-row">
      <div className="max-lg:shrink-0 lg:w-[55%] lg:shrink-0">{video}</div>

      <div className="max-lg:min-h-0 max-lg:flex-1 max-lg:overflow-y-auto lg:w-[45%] lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto lg:pr-2">
        <h2 className="sticky top-0 z-10 mb-3 bg-gray-950 pb-2 text-lg font-semibold text-white">
          Lyrics
        </h2>
        {lyrics}
      </div>
    </div>
  );
}
