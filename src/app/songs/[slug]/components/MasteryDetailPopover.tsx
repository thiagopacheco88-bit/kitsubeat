"use client";

/**
 * MasteryDetailPopover — tap-to-inspect mastery details for a vocabulary word.
 *
 * Renders a trigger element (button/span). On click, toggles a small
 * absolutely-positioned panel that fetches and shows reps, correct%,
 * FSRS state, and next-due date from /api/exercises/vocab-mastery/[id].
 *
 * Used by FeedbackPanel and SessionSummary to give learners visibility into
 * their FSRS progress per word without cluttering the exercise flow.
 */

import { useState, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import type { MasteryDetail } from "@/app/api/exercises/vocab-mastery/[vocabItemId]/route";

const STATE_LABELS: Record<0 | 1 | 2 | 3, string> = {
  0: "New",
  1: "Learning",
  2: "Review",
  3: "Relearning",
};

function formatDue(due: string | null): string {
  if (!due) return "not scheduled";
  const dueDate = new Date(due);
  const now = new Date();
  const diffMs = dueDate.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (Math.abs(diffMin) < 1) return "now";
  if (diffMin < 0) return `${Math.abs(diffMin)} min ago`;
  if (diffMin < 60) return `in ${diffMin} min`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `in ${diffHours}h`;
  const diffDays = Math.round(diffHours / 24);
  return `in ${diffDays} day${diffDays !== 1 ? "s" : ""}`;
}

interface MasteryDetailPopoverProps {
  vocabItemId: string;
  userId: string;
  trigger: ReactNode;
}

export default function MasteryDetailPopover({
  vocabItemId,
  userId,
  trigger,
}: MasteryDetailPopoverProps) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<MasteryDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [showMoreSongs, setShowMoreSongs] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  // Fetch mastery detail when popover opens
  useEffect(() => {
    if (!open || detail !== null) return;
    setLoading(true);
    setError(false);
    fetch(`/api/exercises/vocab-mastery/${vocabItemId}?userId=${encodeURIComponent(userId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json() as Promise<MasteryDetail>;
      })
      .then((data) => setDetail(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [open, vocabItemId, userId, detail]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <span ref={containerRef} className="relative inline-block">
      {/* Trigger — wrapped in a button for accessibility */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer underline decoration-dotted decoration-gray-600 underline-offset-2"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {trigger}
      </button>

      {/* Popover panel */}
      {open && (
        <span
          role="dialog"
          aria-label="Mastery details"
          className="absolute z-20 w-64 rounded-lg border border-gray-700 bg-gray-900 p-3 text-xs text-gray-200 shadow-xl"
          style={{ top: "calc(100% + 6px)", left: 0 }}
        >
          {loading && (
            <span className="flex flex-col gap-2">
              <span className="h-3 w-3/4 animate-pulse rounded bg-gray-700 block" />
              <span className="h-3 w-1/2 animate-pulse rounded bg-gray-700 block" />
              <span className="h-3 w-2/3 animate-pulse rounded bg-gray-700 block" />
            </span>
          )}

          {error && !loading && (
            <span className="text-gray-500">Mastery details unavailable</span>
          )}

          {!loading && !error && detail && (
            <span className="flex flex-col gap-1.5">
              <span className="flex justify-between">
                <span className="text-gray-400">State</span>
                <span className="font-medium text-white">
                  {STATE_LABELS[detail.state as 0 | 1 | 2 | 3]}
                </span>
              </span>
              <span className="flex justify-between">
                <span className="text-gray-400">Reps</span>
                <span className="font-medium text-white">{detail.reps}</span>
              </span>
              <span className="flex justify-between">
                <span className="text-gray-400">Correct</span>
                <span className="font-medium text-white">
                  {detail.totalAttempts > 0
                    ? `${Math.round(detail.correctPct * 100)}%`
                    : "—"}
                </span>
              </span>
              <span className="flex justify-between">
                <span className="text-gray-400">Next due</span>
                <span className="font-medium text-white">
                  {formatDue(detail.due)}
                </span>
              </span>

              {/* "Seen in" section — only rendered when word appears in 2+ songs.
                  Decision: current song is included but sorted last (title ASC from API)
                  so users see "other" songs first. This is intentional: proves cross-song
                  identity rather than hiding the current context. */}
              {detail.seenInSongs.length >= 2 && (
                <span className="flex flex-col gap-1 border-t border-gray-700 pt-1.5 mt-0.5">
                  <h4 className="text-gray-400 font-medium">Seen in</h4>
                  <ul className="flex flex-col gap-0.5">
                    {(showMoreSongs
                      ? detail.seenInSongs
                      : detail.seenInSongs.slice(0, 3)
                    ).map((song) => (
                      <li key={song.slug}>
                        <Link
                          href={`/songs/${song.slug}`}
                          className="text-red-400 hover:text-red-300 underline decoration-dotted"
                          onClick={() => setOpen(false)}
                        >
                          {song.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {detail.seenInSongs.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setShowMoreSongs((v) => !v)}
                      className="mt-0.5 text-left text-gray-500 hover:text-gray-300"
                    >
                      {showMoreSongs
                        ? "Show less"
                        : `Show ${detail.seenInSongs.length - 3} more`}
                    </button>
                  )}
                </span>
              )}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
