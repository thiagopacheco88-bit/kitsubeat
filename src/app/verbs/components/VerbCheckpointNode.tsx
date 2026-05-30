"use client";

import { useVerbProgress } from "@/stores/verbProgress";
import { VERB_CHART } from "@/lib/verbs/chart";
import { computeUnlockedVerbCount, verbMasteryScore } from "@/lib/verbs/mastery";
import { CardLink } from "@/components/ui/Card";

const MASTERY_SCORE_THRESHOLD = 7;

export function VerbCheckpointNode() {
  const mastery = useVerbProgress((s) => s.mastery);

  const verbIds = VERB_CHART.map((v) => v.id);
  const unlockedCount = computeUnlockedVerbCount(mastery, verbIds);
  const anyTouched = Object.values(mastery).some((v) => v > 0);

  const masteredCount = VERB_CHART.slice(0, unlockedCount).filter(
    (v) => verbMasteryScore(mastery, v.id) >= MASTERY_SCORE_THRESHOLD,
  ).length;

  type State = "locked" | "in-progress" | "mastered";
  const state: State = !anyTouched
    ? "locked"
    : masteredCount >= VERB_CHART.length
      ? "mastered"
      : "in-progress";

  const progressPercent = Math.round((masteredCount / VERB_CHART.length) * 100);

  let pillText: string;
  let pillClass: string;
  let glyphClass = "text-[var(--color-text)]";
  let progressBar: React.ReactNode = null;

  if (state === "mastered") {
    pillText = "Mastered";
    pillClass = "bg-[var(--color-accent)] text-white";
    glyphClass = "text-[var(--color-accent)]";
  } else if (state === "in-progress") {
    pillText = `${progressPercent}%`;
    pillClass = "bg-[var(--color-card-2)] text-[var(--color-text-muted)]";
    progressBar = (
      <div className="absolute inset-x-0 bottom-0 h-1 bg-[var(--color-card-2)] overflow-hidden" aria-hidden="true">
        <div className="h-full bg-[var(--color-jlpt-n3)]" style={{ width: `${progressPercent}%` }} />
      </div>
    );
  } else {
    pillText = "0%";
    pillClass = "bg-[var(--color-card-2)] text-[var(--color-text-muted)]";
  }

  return (
    <CardLink
      href="/verbs"
      variant="flat"
      size="sm"
      className="relative flex flex-col items-center justify-between gap-2 border-dashed p-2"
      style={{ width: "130px", height: "124px" }}
      aria-label={`Verb Conjugation checkpoint, ${state === "in-progress" ? `${progressPercent}% complete` : state}`}
      data-testid="verb-checkpoint"
      data-state={state}
    >
      {/* Glyph — 動 (dō, "movement/verb") */}
      <div
        className={`flex-shrink-0 rounded-full bg-[var(--color-card-2)] flex items-center justify-center font-bold ${glyphClass}`}
        style={{ fontFamily: "var(--font-jp)", fontSize: "22px", fontWeight: 900, width: "42px", height: "42px" }}
        aria-hidden="true"
      >
        動
      </div>

      <div className="flex flex-col items-center gap-1 min-w-0">
        <p className="text-xs font-semibold text-[var(--color-text)] truncate">Verbs</p>
        <span
          className={`inline-block rounded-[var(--radius-pill)] px-2 py-0.5 font-semibold ${pillClass}`}
          style={{ fontSize: "10px" }}
        >
          {pillText}
        </span>
      </div>

      {progressBar}
    </CardLink>
  );
}
