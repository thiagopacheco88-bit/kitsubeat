"use client";

import Link from "next/link";
import { useState } from "react";
import { useVerbProgress } from "@/stores/verbProgress";
import { VERB_CHART } from "@/lib/verbs/chart";
import { FORM_GROUPS } from "@/lib/verbs/types";
import { computeUnlockedVerbCount, verbMasteryScore } from "@/lib/verbs/mastery";

function StarBar({ stars }: { stars: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${
            i < stars
              ? "bg-[var(--color-accent)]"
              : "bg-[var(--color-card-2)]"
          }`}
        />
      ))}
    </div>
  );
}

export default function VerbsLandingPage() {
  const hasHydrated = useVerbProgress((s) => s._hasHydrated);
  const mastery = useVerbProgress((s) => s.mastery);
  const resetVerbs = useVerbProgress((s) => s.__resetForTests);
  const hasProgress = Object.values(mastery).some((v) => v > 0);

  const [selectedGroup, setSelectedGroup] = useState(FORM_GROUPS[0].id);

  const verbIds = VERB_CHART.map((v) => v.id);
  const unlockedCount = hasHydrated ? computeUnlockedVerbCount(mastery, verbIds) : 5;
  const unlockedVerbs = VERB_CHART.slice(0, unlockedCount);
  const lockedVerbs = VERB_CHART.slice(unlockedCount);

  if (!hasHydrated) {
    return (
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 animate-pulse">
        <div className="h-36 w-full rounded-[var(--radius-2xl)] bg-[var(--color-card-2)]" />
        <div className="h-20 w-full rounded-[var(--radius-2xl)] bg-[var(--color-card-2)]" />
        <div className="h-64 w-full rounded-[var(--radius-2xl)] bg-[var(--color-card-2)]" />
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <header className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card-ring-strong)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
          Foundations
        </p>
        <h1 className="mt-1 text-3xl font-bold text-[var(--color-text)]">
          Verb Conjugation
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-muted)]">
          Drill Japanese verb forms — polite, plain, potential, and grammar patterns.
          Verbs unlock as you master each group.
        </p>
      </header>

      {/* Form group selector + Start CTA */}
      <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-[var(--shadow-card-ring)] sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Form group pills */}
          <div className="flex flex-wrap gap-2">
            {FORM_GROUPS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedGroup(g.id)}
                className={`rounded-[var(--radius-pill)] border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  selectedGroup === g.id
                    ? "border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                    : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {hasProgress && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Reset all verb progress? This cannot be undone.")) {
                    resetVerbs();
                  }
                }}
                className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] px-4 text-sm text-[var(--color-text-muted)] hover:border-[var(--color-jlpt-n1-ring)] hover:text-[var(--color-jlpt-n1)] transition-colors"
              >
                Reset progress
              </button>
            )}
            <Link
              href={`/verbs/session?group=${selectedGroup}`}
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-6 text-sm font-semibold [color:white] shadow-[var(--shadow-button-red)] hover:bg-[var(--color-accent)]/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
            >
              Start session
            </Link>
          </div>
        </div>
      </div>

      {/* Verb grid */}
      <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card-ring)] sm:p-5">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">
          Unlocked verbs ({unlockedCount} / {VERB_CHART.length})
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {unlockedVerbs.map((verb) => {
            const score = verbMasteryScore(mastery, verb.id);
            return (
              <div
                key={verb.id}
                className="flex flex-col gap-1 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card-2)] p-2.5"
              >
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-base font-bold text-[var(--color-text)]">
                    {verb.dict}
                  </span>
                  <span className="text-[10px] uppercase font-semibold text-[var(--color-text-dim)]">
                    {verb.jlptLevel}
                  </span>
                </div>
                <span className="text-xs text-[var(--color-text-muted)]">{verb.romaji}</span>
                <span className="text-xs text-[var(--color-text-dim)]">{verb.meaning}</span>
                <StarBar stars={Math.round(score)} />
              </div>
            );
          })}
          {lockedVerbs.length > 0 && (
            <div className="flex flex-col items-center justify-center gap-1 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] p-2.5 text-center">
              <span className="text-lg text-[var(--color-text-dim)]">🔒</span>
              <span className="text-xs text-[var(--color-text-dim)]">
                {lockedVerbs.length} more verbs
              </span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
