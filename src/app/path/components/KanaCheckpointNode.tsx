"use client";

/**
 * KanaCheckpointNode — Phase 14.1 SPEC-REQ-6.
 *
 * First-class kana mastery checkpoint on the /path map. Two instances render
 * at the start of the basic tier (hiragana + katakana) per CONTEXT D-03.
 *
 * Reads useKanaProgress zustand store directly (D-03). Pre-hydration paint is
 * a Skeleton (D-discretion: 'list-item' variant) — guards against SSR
 * mismatch since localStorage is the canonical source of mastery.
 *
 * Three states (CONTEXT Specifics + SPEC §6):
 *   mastered    -> accent kana glyph + "Mastered" pill
 *   in-progress -> kana glyph + orange progress bar + "{N}%" pill
 *   locked      -> kana glyph + mist overlay + "霧 · Locked" pill
 *
 * M1 invariant (D-18): every state's root is a clickable <CardLink>; the
 * locked state's mist <div> has pointer-events: none so the link still
 * receives taps. NO `disabled` attribute, NO pointer-events: none on the link
 * itself.
 *
 * All 3 states link to /kana?script={hiragana|katakana} per D-05.
 */
import { useKanaProgress } from "@/stores/kanaProgress";
import { computeCheckpointState } from "@/lib/kana/checkpoint-state";
import { CardLink } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Script } from "@/lib/kana/types";

interface KanaCheckpointNodeProps {
  script: Script;
}

const SCRIPT_GLYPH: Record<Script, string> = {
  hiragana: "あ",
  katakana: "ア",
};

const SCRIPT_NAME: Record<Script, string> = {
  hiragana: "Hiragana",
  katakana: "Katakana",
};

export function KanaCheckpointNode({ script }: KanaCheckpointNodeProps) {
  const hasHydrated = useKanaProgress((s) => s._hasHydrated);
  const map = useKanaProgress((s) =>
    script === "hiragana" ? s.hiragana : s.katakana,
  );

  if (!hasHydrated) {
    return (
      <Skeleton
        variant="list-item"
        className="h-16"
        data-testid={`kana-checkpoint-skeleton-${script}`}
      />
    );
  }

  const result = computeCheckpointState(map, script);
  const glyph = SCRIPT_GLYPH[script];
  const name = SCRIPT_NAME[script];
  const href = `/kana?script=${script}`;

  // State-specific bits
  let pillText: string;
  let pillClass: string;
  let glyphClass = "text-[var(--color-text)]";
  let progressBar: React.ReactNode = null;
  let mistOverlay: React.ReactNode = null;
  let ariaState: string;

  if (result.state === "mastered") {
    pillText = "Mastered";
    pillClass = "bg-[var(--color-accent)] text-white";
    glyphClass = "text-[var(--color-accent)]";
    ariaState = "mastered";
  } else if (result.state === "in-progress") {
    pillText = `${result.progressPercent}%`;
    pillClass =
      "bg-[var(--color-card-2)] text-[var(--color-text-muted)]";
    progressBar = (
      <div
        className="absolute inset-x-0 bottom-0 h-1 bg-[var(--color-card-2)] overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="h-full bg-[var(--color-jlpt-n3)]"
          style={{ width: `${result.progressPercent}%` }}
        />
      </div>
    );
    ariaState = `${result.progressPercent}% complete`;
  } else {
    // locked
    pillText = "霧 · Locked";
    pillClass =
      "bg-[var(--color-card-2)] text-[var(--color-text-muted)]";
    mistOverlay = (
      <div
        className="absolute inset-0 rounded-[var(--radius-lg)]"
        style={{
          background: "var(--mist-fill)",
          pointerEvents: "none",
        }}
        aria-hidden="true"
        data-testid={`kana-checkpoint-mist-${script}`}
      />
    );
    ariaState = "locked";
  }

  return (
    <CardLink
      href={href}
      variant="flat"
      size="md"
      className="relative flex items-center gap-3 h-16 w-full max-w-xs border-dashed"
      aria-label={`${name} checkpoint, ${ariaState}`}
      data-testid={`kana-checkpoint-${script}`}
      data-state={result.state}
    >
      {/* Kana glyph badge — circle, large glyph */}
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-full bg-[var(--color-card-2)] flex items-center justify-center text-2xl font-bold ${glyphClass}`}
        style={{ fontFamily: "var(--font-jp)" }}
        aria-hidden="true"
      >
        {glyph}
      </div>

      {/* Label + state pill */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--color-text)]">
          {name}
        </p>
        <span
          className={`inline-block mt-0.5 rounded-[var(--radius-pill)] px-2 py-0.5 text-xs font-semibold ${pillClass}`}
        >
          {pillText}
        </span>
      </div>

      {progressBar}
      {mistOverlay}
    </CardLink>
  );
}
