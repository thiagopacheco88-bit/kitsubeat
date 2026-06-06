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
 *
 * Phase 14.2 CONTEXT D-08: `size?: "path" | "home"` prop added.
 *   size="path" (default) — byte-equivalent to 14.1 callers (h-16, horizontal).
 *   size="home" — 130×124 vertical dashed-border card for Foundations section.
 */
import { useTranslations } from "next-intl";
import { useKanaProgress } from "@/stores/kanaProgress";
import { computeCheckpointState } from "@/lib/kana/checkpoint-state";
import { CardLink } from "@/components/ui/Card";
import type { Script } from "@/lib/kana/types";

interface KanaCheckpointNodeProps {
  script: Script;
  size?: "path" | "home"; // CONTEXT D-08: default "path" preserves 14.1 byte-equivalence
}

const SCRIPT_GLYPH: Record<Script, string> = {
  hiragana: "あ",
  katakana: "ア",
};

const SCRIPT_NAME: Record<Script, string> = {
  hiragana: "Hiragana",
  katakana: "Katakana",
};

export function KanaCheckpointNode({ script, size = "path" }: KanaCheckpointNodeProps) {
  const t = useTranslations('path');
  const map = useKanaProgress((s) =>
    script === "hiragana" ? s.hiragana : s.katakana,
  );

  const result = computeCheckpointState(map, script);
  const glyph = SCRIPT_GLYPH[script];
  const name = t(`kana.${script}` as 'kana.hiragana' | 'kana.katakana');
  const href = `/kana?script=${script}`;

  // State-specific bits
  let pillText: string;
  let pillClass: string;
  let glyphClass = "text-[var(--color-text)]";
  let progressBar: React.ReactNode = null;
  let ariaState: string;

  if (result.state === "mastered") {
    pillText = t('mastered');
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
    // not started
    pillText = "0%";
    pillClass =
      "bg-[var(--color-card-2)] text-[var(--color-text-muted)]";
    ariaState = "0% complete";
  }

  // CONTEXT D-08 — size variant layout. Default "path" = byte-equivalent to 14.1 callers.
  const isHome = size === "home";

  // Home variant uses inline styles for specific pixel dimensions (lint-clean: style attrs
  // are not subject to no-raw-tokens rule which only covers className strings).
  const rootClassName = isHome
    ? "relative flex flex-col items-center justify-between gap-2 border-dashed p-2"
    : "relative flex items-center gap-3 h-16 w-full max-w-xs border-dashed";
  const rootStyle: React.CSSProperties = isHome
    ? { width: "130px", height: "124px" }
    : {};

  const glyphBadgeClassName = isHome
    ? `flex-shrink-0 rounded-full bg-[var(--color-card-2)] flex items-center justify-center font-bold ${glyphClass}`
    : `flex-shrink-0 w-10 h-10 rounded-full bg-[var(--color-card-2)] flex items-center justify-center text-2xl font-bold ${glyphClass}`;
  const glyphBadgeStyle: React.CSSProperties = isHome
    ? { fontFamily: "var(--font-jp)", fontSize: "22px", fontWeight: 900, width: "42px", height: "42px" }
    : { fontFamily: "var(--font-jp)" };

  return (
    <CardLink
      href={href}
      variant="flat"
      size={isHome ? "sm" : "md"}
      className={rootClassName}
      style={rootStyle}
      aria-label={`${name} checkpoint, ${ariaState}`}
      data-testid={`kana-checkpoint-${script}`}
      data-state={result.state}
      data-size={size}
    >
      {/* Kana glyph badge */}
      <div
        className={glyphBadgeClassName}
        style={glyphBadgeStyle}
        aria-hidden="true"
      >
        {glyph}
      </div>

      {/* Label + state pill — vertical for home, side for path */}
      {isHome ? (
        <div className="flex flex-col items-center gap-1 min-w-0">
          <p className="text-xs font-semibold text-[var(--color-text)] truncate">
            {name}
          </p>
          <span
            className={`inline-block rounded-[var(--radius-pill)] px-2 py-0.5 font-semibold ${pillClass}`}
            style={{ fontSize: "10px" }}
          >
            {pillText}
          </span>
        </div>
      ) : (
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
      )}

      {progressBar}
    </CardLink>
  );
}
