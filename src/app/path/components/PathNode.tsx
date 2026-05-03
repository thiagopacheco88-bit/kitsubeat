"use client";

/**
 * PathNode — Phase 14.1 SPEC-REQ-5 cover-art-as-background rewrite.
 *
 * 84px-tall 2-panel layout: ~38% cover-art (left) + ~62% info (right).
 * Cover-art panel uses YouTube maxresdefault.jpg with bottom-fade gradient
 * and Japanese title overlay.
 *
 * State derivation (locked):
 *   isCurrent                 -> 'current'  (precedence over completed)
 *   !isCurrent && isCompleted -> 'mastered' (per CONTEXT deferral — completed === mastered)
 *   else                      -> 'locked'   (visual-only per M1 invariant)
 *
 * 'in_progress' is intentionally absent. SongListItem has no star-mastery
 * field, so completed-but-not-mastered cannot be distinguished from completed.
 * CONTEXT.md <deferred> records "Precise 3-star mastery signal: deferred —
 * currently mastered = completed; refine when star-mastery field is exposed
 * on SongListItem". When that field lands in a future phase, deriveState
 * grows an `in_progress` branch via a one-line edit.
 *
 * Hard rules (CONTEXT D-18):
 * - Root is always <CardLink variant="flat"> (clickable in every state)
 * - No `disabled` attribute, no pointer-events: none on the link
 * - Mist overlay (locked) has pointer-events: none so taps fall through
 *
 * Reduced-motion (CONTEXT D-15): the .ka-pulse and .ka-aura classes inherit
 * the global @media prefers-reduced-motion override authored in globals.css —
 * no per-component @media block needed.
 */
import { CardLink } from "@/components/ui/Card";
import type { SongListItem } from "@/lib/db/queries";

interface PathNodeProps {
  song: SongListItem;
  isCurrent: boolean;
  isCompleted: boolean;
}

type NodeState = "mastered" | "current" | "locked";

function deriveState(isCurrent: boolean, isCompleted: boolean): NodeState {
  // Precedence: current > mastered > locked.
  // CONTEXT D-19 + the existing PathNode (pre-rewrite) used isCurrent as the
  // primary signal. A song the user is actively on retains the "Next Up"
  // affordance even after a first completion.
  if (isCurrent) return "current";
  if (isCompleted) return "mastered";
  return "locked";
}

export function PathNode({ song, isCurrent, isCompleted }: PathNodeProps) {
  const state = deriveState(isCurrent, isCompleted);

  // YouTube cover-art with maxresdefault, fallback to default.jpg via onError.
  const coverSrc = song.youtube_id
    ? `https://img.youtube.com/vi/${song.youtube_id}/maxresdefault.jpg`
    : null;
  const coverFallback = song.youtube_id
    ? `https://img.youtube.com/vi/${song.youtube_id}/default.jpg`
    : null;

  // State-specific aria suffix
  let ariaSuffix = "";
  if (state === "mastered") ariaSuffix = " — mastered";
  else if (state === "current") ariaSuffix = " — your current path node";
  else ariaSuffix = " — locked";

  return (
    <CardLink
      href={`/songs/${song.slug}`}
      variant="flat"
      size="md"
      className="relative flex items-stretch p-0 overflow-hidden w-full max-w-xs"
      style={{ height: "84px" }}
      aria-label={`${song.title}${ariaSuffix}`}
      data-testid={`path-node-${song.slug}`}
      data-state={state}
    >
      {/* ── Cover-art panel (~38%) ── */}
      <div
        className={`relative w-[38%] flex-shrink-0 overflow-hidden${state === "locked" ? " grayscale" : ""}`}
      >
        {coverSrc ? (
          <img
            src={coverSrc}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            aria-hidden="true"
            onError={(e) => {
              // Fallback to default.jpg if maxresdefault is missing
              const img = e.currentTarget;
              if (coverFallback && img.src !== coverFallback) img.src = coverFallback;
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-[var(--color-card-2)]" aria-hidden="true" />
        )}

        {/* Bottom-fade gradient + Japanese title overlay */}
        <div
          className="absolute inset-x-0 bottom-0 px-2 py-1.5 text-xs font-semibold"
          style={{
            fontFamily: "var(--font-jp)",
            background:
              "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.65) 100%)",
            color: "white",
          }}
          data-testid="path-node-jp-title"
        >
          <span className="truncate block">{song.title}</span>
        </div>

        {/* PLAY ▶ overlay — current state only */}
        {state === "current" && (
          <span
            className="ka-pulse absolute inset-0 flex items-center justify-center pointer-events-none"
            data-testid="path-node-play-overlay"
            aria-hidden="true"
          >
            <span
              className="text-3xl drop-shadow-lg"
              style={{ color: "white", textShadow: "var(--shadow-button-red)" }}
            >
              ▶
            </span>
          </span>
        )}
      </div>

      {/* ── Info panel (~62%) ── */}
      <div className="flex-1 min-w-0 p-3 flex flex-col justify-center gap-1 relative">
        {/* Romaji title — uppercase tracking per SPEC */}
        <p className="truncate text-sm font-medium text-[var(--color-text)] uppercase tracking-wide">
          {song.title}
        </p>
        <p className="truncate text-xs text-[var(--color-text-muted)]">{song.anime}</p>

        {/* State pill */}
        {state === "mastered" && (
          <span className="inline-block self-start rounded-[var(--radius-pill)] px-2 py-0.5 text-xs font-semibold bg-[var(--color-accent)] [color:white]">
            Mastered
          </span>
        )}
        {state === "current" && (
          <span className="inline-block self-start rounded-[var(--radius-pill)] px-2 py-0.5 text-xs font-semibold bg-[var(--color-accent)] [color:white]">
            Next Up
          </span>
        )}
        {state === "locked" && (
          <span className="inline-block self-start rounded-[var(--radius-pill)] px-2 py-0.5 text-xs font-semibold bg-[var(--color-card-2)] text-[var(--color-text-muted)]">
            霧 · Locked
          </span>
        )}

        {/* 3-star aura halo — mastered state only */}
        {state === "mastered" && (
          <span
            className="ka-aura absolute right-2 top-2 inline-flex items-center justify-center w-6 h-6 rounded-full"
            style={{ background: "var(--aura-color)" }}
            data-testid="path-node-aura"
            aria-hidden="true"
          >
            <span className="text-xs" style={{ color: "white" }}>★</span>
          </span>
        )}
      </div>

      {/* ── Locked-state mist overlay (covers entire card; pointer-events: none) ── */}
      {state === "locked" && (
        <div
          className="absolute inset-0 rounded-[var(--radius-lg)]"
          style={{
            background: "var(--mist-fill)",
            pointerEvents: "none",
          }}
          data-testid="path-node-mist"
          aria-hidden="true"
        />
      )}
    </CardLink>
  );
}
