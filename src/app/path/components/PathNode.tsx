"use client";

import { CardLink } from "@/components/ui/Card";
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
 *
 * Migration note (Phase 14-09 D-22 token-only swap): wraps CardLink primitive
 * (variant=flat, size=md). The variant's bg/border/hover-border tokens replace
 * the prior gray-800/gray-600/gray-700 palette utilities. The completed-vs-not
 * distinction collapses to a card-2 fill on completed (subtle elevation cue)
 * since the primitive's flat variant covers the not-completed surface
 * uniformly. The "current" node's ring uses --color-accent (the same accent
 * powering primary buttons + JLPT-N1 + hero glow) — orange ring would have
 * required a new token; per Plan 14-07's LevelUpTakeover precedent, the red
 * accent carries the same celebratory weight on the path map.
 */
export function PathNode({ song, isCurrent, isCompleted }: PathNodeProps) {
  // Token-driven state styles. The current ring uses --color-accent matching
  // the primitive Button variant=primary; completed bg lifts to card-2 to read
  // as "engaged" without a separate token.
  const currentRing = isCurrent
    ? "ring-4 ring-[var(--color-accent)] scale-110 shadow-[var(--shadow-button-red)]"
    : "";
  const completedOverride = isCompleted
    ? "!bg-[var(--color-card-2)]"
    : "";
  // CardLink variant=flat already supplies hover:border-[var(--color-border-strong)]
  // — we add the hover scale + transition for the path-map zoom interaction.
  const hoverClass =
    "hover:scale-105 transition-transform duration-150";

  return (
    <CardLink
      href={`/songs/${song.slug}`}
      variant="flat"
      size="md"
      className={`group relative flex items-center gap-3 ${completedOverride} ${currentRing} ${hoverClass} px-4 py-3 w-full max-w-xs`}
      aria-label={`${song.title}${isCurrent ? " — your current path node" : ""}${isCompleted ? " — completed" : ""}`}
    >
      {/* Thumbnail. Fallback uses card-2 token (same shade as the inline tier
       * divider chip) so empty thumbnails read as a quiet placeholder, not a
       * gray panel. */}
      {song.youtube_id ? (
        <img
          src={`https://img.youtube.com/vi/${song.youtube_id}/default.jpg`}
          alt=""
          className="w-12 h-9 rounded object-cover flex-shrink-0"
          aria-hidden="true"
        />
      ) : (
        <div
          className="w-12 h-9 rounded bg-[var(--color-card-2)] flex-shrink-0"
          aria-hidden="true"
        />
      )}

      {/* Song info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--color-text)]">
          {song.title}
        </p>
        <p className="truncate text-xs text-[var(--color-text-muted)]">{song.anime}</p>
      </div>

      {/* Status badges. Completed checkmark uses --color-jlpt-n5 (green) —
       * semantic-color reuse pattern from Plan 14-05/14-07 (success = N5
       * green base). "Next up" pill uses --color-accent (red) matching
       * Button variant=primary. */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {isCompleted && (
          <span
            className="text-[var(--color-jlpt-n5)] text-xs"
            aria-label="Completed"
          >
            &#10003;
          </span>
        )}
        {isCurrent && (
          <span className="rounded-[var(--radius-pill)] bg-[var(--color-accent)] [color:white] px-2 py-0.5 text-xs font-semibold whitespace-nowrap">
            Next up
          </span>
        )}
      </div>
    </CardLink>
  );
}
