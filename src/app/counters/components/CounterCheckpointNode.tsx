"use client";

/**
 * CounterCheckpointNode — home-page Foundations card for the Counters feature.
 *
 * Mirrors KanaCheckpointNode (Phase 14.2 D-08) but reads useCounterProgress.
 * Only rendered in size="home" (130×124px dashed-border card) — no "path" variant.
 *
 * Three states:
 *   locked      → no mastery yet (empty / all-zero map)
 *   in-progress → at least one counter touched
 *   mastered    → all counters at >= 7 stars
 *
 * Links to /counters.
 */
import { useTranslations } from "next-intl";
import { useCounterProgress } from "@/stores/counterProgress";
import { COUNTERS_ORDERED } from "@/lib/counters/chart";
import { CardLink } from "@/components/ui/Card";

const MASTERY_STAR_THRESHOLD = 7;

export function CounterCheckpointNode() {
  const t = useTranslations("path");
  const mastery = useCounterProgress((s) => s.mastery);

  // Derive state from mastery map
  const total = COUNTERS_ORDERED.length;
  const masteredCount = COUNTERS_ORDERED.filter(
    (c) => (mastery[c.id] ?? 0) >= MASTERY_STAR_THRESHOLD,
  ).length;
  const anyTouched = Object.values(mastery).some((v) => v > 0);

  type State = "locked" | "in-progress" | "mastered";
  const state: State = !anyTouched
    ? "locked"
    : masteredCount >= total
      ? "mastered"
      : "in-progress";

  const progressPercent = Math.round((masteredCount / total) * 100);

  // Visual bits
  let pillText: string;
  let pillClass: string;
  let glyphClass = "text-[var(--color-text)]";
  let progressBar: React.ReactNode = null;
  let mistOverlay: React.ReactNode = null;

  if (state === "mastered") {
    pillText = t("mastered");
    pillClass = "bg-[var(--color-accent)] text-white";
    glyphClass = "text-[var(--color-accent)]";
  } else if (state === "in-progress") {
    pillText = `${progressPercent}%`;
    pillClass = "bg-[var(--color-card-2)] text-[var(--color-text-muted)]";
    progressBar = (
      <div
        className="absolute inset-x-0 bottom-0 h-1 bg-[var(--color-card-2)] overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="h-full bg-[var(--color-jlpt-n3)]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    );
  } else {
    pillText = t("locked");
    pillClass = "bg-[var(--color-card-2)] text-[var(--color-text-muted)]";
    mistOverlay = (
      <div
        className="absolute inset-0 rounded-[var(--radius-lg)]"
        style={{ background: "var(--mist-fill)", pointerEvents: "none" }}
        aria-hidden="true"
        data-testid="counter-checkpoint-mist"
      />
    );
  }

  return (
    <CardLink
      href="/counters"
      variant="flat"
      size="sm"
      className="relative flex flex-col items-center justify-between gap-2 border-dashed p-2"
      style={{ width: "130px", height: "124px" }}
      aria-label={`Counters checkpoint, ${state === "in-progress" ? `${progressPercent}% complete` : state}`}
      data-testid="counter-checkpoint"
      data-state={state}
    >
      {/* Glyph badge — 本 (hon), the first counter */}
      <div
        className={`flex-shrink-0 rounded-full bg-[var(--color-card-2)] flex items-center justify-center font-bold ${glyphClass}`}
        style={{
          fontFamily: "var(--font-jp)",
          fontSize: "22px",
          fontWeight: 900,
          width: "42px",
          height: "42px",
        }}
        aria-hidden="true"
      >
        本
      </div>

      {/* Label + pill */}
      <div className="flex flex-col items-center gap-1 min-w-0">
        <p className="text-xs font-semibold text-[var(--color-text)] truncate">
          Counters
        </p>
        <span
          className={`inline-block rounded-[var(--radius-pill)] px-2 py-0.5 font-semibold ${pillClass}`}
          style={{ fontSize: "10px" }}
        >
          {pillText}
        </span>
      </div>

      {progressBar}
      {mistOverlay}
    </CardLink>
  );
}
