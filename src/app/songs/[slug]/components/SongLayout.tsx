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
    <div
      data-song-layout
      data-testid="song-player-stage"
      className="min-w-0 scroll-mt-16 rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-[var(--shadow-card-ring-strong)] sm:p-4"
    >
      <div className="flex flex-col gap-3 max-lg:h-[calc(100dvh-16rem)] lg:grid lg:min-h-[34rem] lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)] lg:gap-4">
        <section
          data-testid="song-video-panel"
          className="min-w-0 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg)] max-lg:shrink-0"
          aria-label="Video player"
        >
          {video}
        </section>

        <section
          data-testid="song-lyrics-panel"
          className="min-w-0 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg)] max-lg:min-h-0 max-lg:flex-1 max-lg:overflow-y-auto lg:max-h-[34rem] lg:overflow-y-auto"
          aria-label="Synced lyrics"
        >
          <div className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
              Synced lyrics
            </p>
          </div>
          <div className="p-3 sm:p-4">{lyrics}</div>
        </section>
      </div>
    </div>
  );
}
