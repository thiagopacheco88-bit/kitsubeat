"use client";

/**
 * CounterSessionSummary — post-session screen for the counter trainer.
 *
 * Reads the sessionStorage snapshot written by CounterSession and renders:
 * - Accuracy (correct / total)
 * - New counters unlocked this session
 * - Per-counter changes (star delta, direction breakdown)
 * - Watch list: 5 lowest-star counters touched this session
 *
 * Mirrors KanaSessionSummary pattern.
 */

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { useCounterProgress } from "@/stores/counterProgress";
import { COUNTERS_CHART } from "@/lib/counters/chart";

interface AnswerLog {
  counterId: string;
  direction: "num-to-reading" | "reading-to-meaning";
  correct: boolean;
  starsBefore: number;
  starsAfter: number;
}

interface SessionSnapshot {
  log: AnswerLog[];
  unlocked: string[]; // counter IDs unlocked during the session
}

interface Props {
  snapshot: SessionSnapshot | null;
}

export function CounterSessionSummary({ snapshot }: Props) {
  const incrementSessionsCompleted = useCounterProgress((s) => s.incrementSessionsCompleted);
  const sessionsCompleted = useCounterProgress((s) => s.sessionsCompleted);
  const streak = useCounterProgress((s) => s.streak);
  const mastery = useCounterProgress((s) => s.mastery);

  // Increment exactly once on mount — useRef guard defeats StrictMode double-fire.
  const incrementedRef = useRef(false);
  useEffect(() => {
    if (snapshot && !incrementedRef.current) {
      incrementedRef.current = true;
      incrementSessionsCompleted();
    }
  }, [snapshot, incrementSessionsCompleted]);

  // Per-counter summary: aggregate all touches for the same counter.
  const counterSummary = useMemo(() => {
    if (!snapshot) return [];
    const map = new Map<
      string,
      {
        counterId: string;
        before: number;
        after: number;
        touches: number;
        rights: number;
        readingRight: number;
        meaningRight: number;
      }
    >();
    for (const a of snapshot.log) {
      const existing = map.get(a.counterId);
      if (existing) {
        existing.after = a.starsAfter;
        existing.touches += 1;
        if (a.correct) {
          existing.rights += 1;
          if (a.direction === "num-to-reading") existing.readingRight += 1;
          else existing.meaningRight += 1;
        }
      } else {
        map.set(a.counterId, {
          counterId: a.counterId,
          before: a.starsBefore,
          after: a.starsAfter,
          touches: 1,
          rights: a.correct ? 1 : 0,
          readingRight: a.correct && a.direction === "num-to-reading" ? 1 : 0,
          meaningRight: a.correct && a.direction === "reading-to-meaning" ? 1 : 0,
        });
      }
    }
    return [...map.values()].sort(
      (x, y) => (y.after - y.before) - (x.after - x.before),
    );
  }, [snapshot]);

  // Weakest 5 from latest store mastery.
  const weakest = useMemo(() => {
    return counterSummary
      .map((c) => ({ counterId: c.counterId, stars: mastery[c.counterId] ?? 0 }))
      .sort((x, y) => x.stars - y.stars)
      .slice(0, 5);
  }, [counterSummary, mastery]);

  if (!snapshot) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-center shadow-[var(--shadow-card-ring-strong)]">
        <h2 className="text-xl font-semibold text-[var(--color-text)]">No session data</h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Looks like you reloaded the summary directly.
        </p>
        <Link
          href="/counters"
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-5 text-sm font-semibold [color:white] shadow-[var(--shadow-button-red)] hover:bg-[var(--color-accent)]/90"
        >
          Back to grid
        </Link>
      </div>
    );
  }

  const total = snapshot.log.length;
  const correctCount = snapshot.log.filter((a) => a.correct).length;
  const accuracyPct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const starsGained = snapshot.log.reduce((sum, a) => sum + Math.max(0, a.starsAfter - a.starsBefore), 0);

  const unlockedLabels = snapshot.unlocked.map((id) => {
    const c = COUNTERS_CHART.find((x) => x.id === id);
    return c ? `${c.reading} (${c.kanji}) — ${c.what}` : id;
  });

  return (
    <div className="flex flex-col gap-6 rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card-ring-strong)] sm:p-6">
      <header className="flex flex-col items-center gap-3 text-center">
        <div className="session-emoji-pop text-5xl">
          {accuracyPct >= 80 ? "🎯" : accuracyPct >= 50 ? "📚" : "💪"}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
            Session #{sessionsCompleted}
          </p>
          <h1 className="text-3xl font-bold text-[var(--color-text)]">Session complete!</h1>
          <p className="mt-1 text-lg text-[var(--color-text-muted)]">
            {correctCount} / {total} correct · {accuracyPct}%
          </p>
          {starsGained > 0 && (
            <p className="mt-1 text-sm font-semibold text-[var(--color-jlpt-n5)]">
              ★ +{starsGained} stars earned
            </p>
          )}
          {streak > 0 && (
            <p className="mt-1 text-sm font-semibold text-[var(--color-text-muted)]">
              🔥 {streak} day streak
            </p>
          )}
        </div>
      </header>

      {snapshot.unlocked.length > 0 && (
        <section className="rounded-[var(--radius-lg)] border border-[var(--color-jlpt-n3-ring)] bg-[var(--color-jlpt-n3-bg)] p-4">
          <h2 className="text-base font-semibold text-[var(--color-jlpt-n3)]">
            New counter{snapshot.unlocked.length > 1 ? "s" : ""} unlocked 🎉
          </h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-[var(--color-jlpt-n3)]">
            {unlockedLabels.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-base font-semibold text-[var(--color-text)]">
          Per-counter changes
        </h2>
        <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card-2)]">
          {counterSummary.map((c) => {
            const meta = COUNTERS_CHART.find((x) => x.id === c.counterId);
            const delta = c.after - c.before;
            const sign = delta > 0 ? "+" : delta < 0 ? "" : "±";
            return (
              <li
                key={c.counterId}
                className="flex flex-col gap-1 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-2">
                  {/* Romaji primary, kanji secondary */}
                  <span className="text-base font-semibold text-[var(--color-text)]">{meta?.reading}</span>
                  <span className="text-xs text-[var(--color-text-dim)]">
                    {meta?.kanji} · {meta?.what}
                  </span>
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {c.before} → {c.after}{" "}
                  <span
                    className={
                      delta > 0
                        ? "text-[var(--color-jlpt-n5)]"
                        : delta < 0
                          ? "text-[var(--color-jlpt-n1)]"
                          : "text-[var(--color-text-dim)]"
                    }
                  >
                    ({sign}{delta})
                  </span>{" "}
                  · {c.rights}/{c.touches} correct
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {weakest.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-semibold text-[var(--color-text)]">Watch list</h2>
          <ul className="flex flex-wrap gap-2">
            {weakest.map((w) => {
              const meta = COUNTERS_CHART.find((x) => x.id === w.counterId);
              return (
                <li
                  key={w.counterId}
                  className="flex items-baseline gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-card-2)] px-3 py-1"
                >
                  {/* Romaji primary */}
                  <span className="text-sm font-semibold text-[var(--color-text)]">{meta?.reading}</span>
                  {/* Kanji secondary */}
                  <span className="text-xs text-[var(--color-text-dim)]">{meta?.kanji}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">{w.stars}★</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/counters/session"
          className="flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 text-center text-sm font-semibold [color:white] shadow-[var(--shadow-button-red)] hover:bg-[var(--color-accent)]/90"
        >
          Next session
        </Link>
        <Link
          href="/counters"
          className="flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border-strong)] px-4 text-center text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-card-2)]"
        >
          Back to grid
        </Link>
      </div>
    </div>
  );
}
