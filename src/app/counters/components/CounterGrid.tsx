"use client";

import { COUNTERS_ORDERED, COUNTER_GROUPS } from "@/lib/counters/chart";
import { computeUnlockedCounters } from "@/lib/counters/mastery";
import { useCounterProgress } from "@/stores/counterProgress";
import { CounterTile } from "./CounterTile";
import { useCallback } from "react";

/**
 * Category-grouped grid of all 10 counters with locked/unlocked styling.
 * Mirrors KanaGrid — reads mastery from the store, derives unlocked set,
 * dims locked counters.
 */
export function CounterGrid() {
  const mastery = useCounterProgress((s) => s.mastery);
  const reset = useCounterProgress((s) => s.__resetForTests);
  const hasProgress = Object.values(mastery).some((v) => v > 0);
  const unlocked = computeUnlockedCounters(COUNTERS_ORDERED, mastery);

  const handleReset = useCallback(() => {
    if (window.confirm("Reset all counter progress? This cannot be undone.")) {
      reset();
    }
  }, [reset]);

  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card-ring)] sm:p-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-semibold text-[var(--color-text)]">
            All Counters
          </h2>
          <div className="flex items-center gap-3">
            {hasProgress && (
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-jlpt-n1)] transition-colors"
              >
                Reset progress
              </button>
            )}
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
              {COUNTERS_ORDERED.length} counters
            </span>
          </div>
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">
          The dots below each counter show your mastery (0–10). Fill all 10 to unlock the next one.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {COUNTER_GROUPS.map((group) => (
          <div
            key={group.category}
            className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card-2)] p-3"
          >
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
              {group.label}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {group.counters.map((c) => {
                const isUnlocked = unlocked.has(c.id);
                return (
                  <div
                    key={c.id}
                    className={isUnlocked ? "" : "opacity-55"}
                  >
                    <CounterTile
                      kanji={c.kanji}
                      reading={c.reading}
                      what={c.what}
                      stars={mastery[c.id] ?? 0}
                      locked={!isUnlocked}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
