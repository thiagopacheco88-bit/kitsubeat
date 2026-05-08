/**
 * Phase 14.4 REQ-2 — Recently-mastered ticker.
 *
 * Client component with auto-scroll + reduced-motion static list fallback.
 * Render null when events array is empty (no ticker section shown).
 * Ticker rows are clickable links to /songs/{song_slug}.
 * Reduced-motion: renders as static list (no animation, no scroll).
 *
 * Token discipline (D-19): all colors via var(--color-*).
 * M1 invariant (D-20): ticker links are not disabled; pointer-events always active.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export interface MasteryEvent {
  id: string;
  user_id: string;
  song_id: string;
  created_at: Date | string;
  song_title: string;
  song_slug: string;
  firstName?: string; // resolved by page.tsx via getTickerFirstName
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

function relativeTime(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay > 0) return `${diffDay}d ago`;
  if (diffHr > 0) return `${diffHr}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return "just now";
}

interface RecentlyMasteredTickerProps {
  events: MasteryEvent[];
}

export function RecentlyMasteredTicker({ events }: RecentlyMasteredTickerProps) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!events || events.length === 0) return null;

  // Static list for reduced-motion users (mounted check avoids SSR/hydration mismatch)
  if (mounted && reduced) {
    return (
      <section
        data-testid="recently-mastered-ticker"
        aria-label="Recently mastered songs"
        className="pb-8"
      >
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          Recently Mastered
        </h2>
        <ul className="space-y-1">
          {events.map((ev) => (
            <li key={ev.id} className="text-sm text-[var(--color-text-muted)]">
              <Link
                href={`/songs/${ev.song_slug}`}
                className="text-[var(--color-text)] hover:text-[var(--color-accent)] transition-colors"
              >
                {ev.song_title}
              </Link>
              {" "}&mdash; {ev.firstName ?? "Someone"} &middot; {relativeTime(ev.created_at)}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  // Auto-scroll ticker for normal users (horizontal scroll strip)
  return (
    <section
      data-testid="recently-mastered-ticker"
      aria-label="Recently mastered songs"
      className="pb-8 overflow-hidden"
    >
      <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
        Recently Mastered
      </h2>
      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto pb-2"
        style={{ scrollBehavior: "smooth" }}
      >
        {events.map((ev) => (
          <Link
            key={ev.id}
            href={`/songs/${ev.song_slug}`}
            className="flex-shrink-0 rounded-[var(--radius-sm)] bg-[var(--color-card-2)] px-3 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors whitespace-nowrap"
          >
            <span className="text-[var(--color-text)] font-medium">{ev.firstName ?? "Someone"}</span>
            {" "}mastered{" "}
            <span className="text-[var(--color-accent)]">{ev.song_title}</span>
            <span className="ml-2 text-xs opacity-60">{relativeTime(ev.created_at)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
