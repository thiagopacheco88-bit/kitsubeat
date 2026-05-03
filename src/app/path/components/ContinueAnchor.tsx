"use client";

/**
 * ContinueAnchor — Phase 14.1 SPEC-REQ-8.
 *
 * Sticky-bottom CTA on /path. Renders only when the user has a current song
 * (current_path_node_slug !== null). On the StarterPick branch (null slug),
 * this component is NOT mounted — page.tsx handles the conditional in Plan 11.
 *
 * Layout:
 *   The outer wrapper provides a gradient-fade that transitions from
 *   transparent at the top to var(--color-bg) below, so scrolling content
 *   blends naturally into the CTA zone.
 *
 *   The CTA itself is a full-width Link:
 *     position: fixed; bottom: 0; left: 0; right: 0
 *     min-height: 56px (≥ Phase 14 SPEC AC #11 44px tap-target floor)
 *     background: var(--color-accent) (brand red)
 *     glow: var(--shadow-cta-red) (existing token from Phase 14-01)
 *
 * Label format (matches demo-CA-hybrid.html):
 *   "CONTINUE" small-caps label stacked above the song title.
 *   Play icon on the left; chevron-right on the right.
 *
 * On tap: navigate to /songs/{currentSongSlug}.
 *
 * Token-only colors: zero raw hex/palette values — all via var(--*).
 */
import Link from "next/link";

interface ContinueAnchorProps {
  currentSongSlug: string | null;
  currentSongTitle: string | null;
}

export function ContinueAnchor({
  currentSongSlug,
  currentSongTitle,
}: ContinueAnchorProps) {
  // Visibility guard: render nothing if either piece is missing
  if (!currentSongSlug || !currentSongTitle) return null;

  return (
    <>
      {/* Gradient-fade above the CTA — content scrolls underneath */}
      {/* bottom-14 = 56px (14 × 4px spacing unit) matches the CTA min-height */}
      <div
        className="fixed bottom-14 left-0 right-0 h-12 pointer-events-none z-40"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, var(--color-bg) 100%)",
        }}
        aria-hidden="true"
      />

      {/* Sticky CTA wrapper — fixed bottom-0 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 py-3 bg-[var(--color-bg)]">
        <Link
          href={`/songs/${currentSongSlug}`}
          className="flex items-center justify-between w-full min-h-14 px-5 rounded-[var(--radius-2xl)] bg-[var(--color-accent)] [color:white] shadow-[var(--shadow-cta-red)] hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 transition-opacity"
          data-testid="continue-anchor"
          aria-label={`Continue: ${currentSongTitle}`}
        >
          {/* Left: play icon + stacked label */}
          <div className="flex items-center gap-3">
            {/* Play icon */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path d="M4 2v12l11-6z" fill="currentColor" />
            </svg>

            {/* Stacked "CONTINUE" / title */}
            <div className="flex flex-col items-start leading-none gap-0.5">
              <span
                className="font-semibold uppercase tracking-widest opacity-85"
                style={{ fontSize: "0.625rem" }}
              >
                Continue
              </span>
              <span
                className="font-extrabold truncate max-w-[55vw]"
                style={{ fontFamily: "var(--font-jp)", fontSize: "0.9375rem" }}
              >
                {currentSongTitle}
              </span>
            </div>
          </div>

          {/* Right: chevron */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M9 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>
    </>
  );
}
