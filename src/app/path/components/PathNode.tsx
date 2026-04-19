"use client";

import Link from "next/link";
import type { SongListItem } from "@/lib/db/queries";

interface PathNodeProps {
  song: SongListItem;
  isCurrent: boolean;
  isCompleted: boolean;
}

/**
 * PathNode — individual song node on the learning path map.
 *
 * M1 guard: every node is a clickable <Link> regardless of completion state.
 * No disabled attribute, no pointer-events:none — freemium quotas are the
 * sole access barrier (enforced in checkExerciseAccess, not here).
 *
 * Completion detection: uses ex1_2_3_best_accuracy > 0 as the simplest
 * available signal (any exercise completion means the user has engaged).
 */
export function PathNode({ song, isCurrent, isCompleted }: PathNodeProps) {
  const currentRing = isCurrent
    ? "ring-4 ring-orange-500 scale-110 shadow-lg shadow-orange-900/40"
    : "";
  const completedBg = isCompleted ? "bg-gray-700" : "bg-gray-800";
  const hoverClass =
    "hover:bg-gray-700 hover:scale-105 transition-transform duration-150";

  return (
    <Link
      href={`/songs/${song.slug}`}
      className={`group relative flex items-center gap-3 rounded-xl border border-gray-600 ${completedBg} ${currentRing} ${hoverClass} px-4 py-3 w-full max-w-xs`}
      aria-label={`${song.title}${isCurrent ? " — your current path node" : ""}${isCompleted ? " — completed" : ""}`}
    >
      {/* Thumbnail */}
      {song.youtube_id ? (
        <img
          src={`https://img.youtube.com/vi/${song.youtube_id}/default.jpg`}
          alt=""
          className="w-12 h-9 rounded object-cover flex-shrink-0"
          aria-hidden="true"
        />
      ) : (
        <div className="w-12 h-9 rounded bg-gray-600 flex-shrink-0" aria-hidden="true" />
      )}

      {/* Song info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{song.title}</p>
        <p className="truncate text-xs text-gray-400">{song.anime}</p>
      </div>

      {/* Status badges */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {isCompleted && (
          <span className="text-green-400 text-xs" aria-label="Completed">
            &#10003;
          </span>
        )}
        {isCurrent && (
          <span className="rounded-full bg-orange-600 px-2 py-0.5 text-xs font-semibold text-white whitespace-nowrap">
            Next up
          </span>
        )}
      </div>
    </Link>
  );
}
