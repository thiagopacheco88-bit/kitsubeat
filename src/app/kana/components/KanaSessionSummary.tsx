"use client";

/**
 * KanaSessionSummary — post-session screen for the kana trainer.
 *
 * Reads the sessionStorage handoff written by KanaSession (Plan 09-05) and
 * renders accuracy, per-character star deltas, an unlock callout (when one
 * or more rows unlocked mid-session), a watch list (5 lowest-star chars
 * touched this session, latest stars from the store), and two CTAs:
 * Next session (restarts /kana/session?mode=...) and Back to grid (/kana).
 *
 * sessionsCompleted is incremented exactly once on first mount when a real
 * snapshot is found. The increment is guarded by a useRef sentinel so the
 * React 19 StrictMode dev double-mount cannot bump the counter twice
 * (RESEARCH.md "Pitfall 2"). This is the ONLY place sessionsCompleted is
 * incremented in the kana subsystem — KanaSession deliberately does not.
 *
 * Owner: Phase 09 plan 06.
 *
 * Phase 14 Plan 14-08 migration notes:
 * - All palette utilities replaced with token references; tokens auto-flip
 *   across themes via :root[data-theme="light"] in globals.css. No `dark:`
 *   Tailwind variants remain on this surface.
 * - "New rows unlocked" amber call-out reuses --color-jlpt-n3 alpha tokens
 *   (same semantic-color pattern as Plan 14-07's daily-cap toast and Plan
 *   14-08's SignupNudge banner).
 * - Per-character delta uses --color-jlpt-n5 (green ≈ gain), --color-jlpt-n1
 *   (red ≈ loss), and --color-text-dim for zero-delta. Same JLPT-alpha
 *   feedback recipe Plan 14-08 task 2 applied to KanaQuestionCard's MCQ
 *   options.
 * - Next session + Back to grid CTAs tokenized; primary uses --color-accent.
 */

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { useKanaProgress } from "@/stores/kanaProgress";
import { HIRAGANA_ROWS, KATAKANA_ROWS } from "@/lib/kana/chart";
import type { Script } from "@/lib/kana/types";

interface AnswerLog {
  script: Script;
  kana: string;
  correct: boolean;
  starsBefore: number;
  starsAfter: number;
}

interface SessionSnapshot {
  mode: "hiragana" | "katakana" | "mixed";
  log: AnswerLog[];
  unlocked: string[]; // rowIds unlocked during this session
}

interface Props {
  /** null = no session data on disk (e.g. user navigated here directly). */
  snapshot: SessionSnapshot | null;
}

export function KanaSessionSummary({ snapshot }: Props) {
  const incrementSessionsCompleted = useKanaProgress((s) => s.incrementSessionsCompleted);
  const hiragana = useKanaProgress((s) => s.hiragana);
  const katakana = useKanaProgress((s) => s.katakana);

  // Increment exactly once on mount when a real snapshot was found.
  // useRef guard defeats React 19 StrictMode dev double-effect (RESEARCH Pitfall 2).
  const incrementedRef = useRef(false);
  useEffect(() => {
    if (snapshot && !incrementedRef.current) {
      incrementedRef.current = true;
      incrementSessionsCompleted();
    }
  }, [snapshot, incrementSessionsCompleted]);

  // Aggregate deltas per (script,kana). One row per unique char, summed touches,
  // last starsAfter wins (so multiple touches reflect the final state).
  // Hooks must run in the same order on every render — compute BEFORE the early
  // return below. When snapshot is null we just get an empty array.
  const charSummary = useMemo(() => {
    if (!snapshot) return [];
    const map = new Map<
      string,
      { script: Script; kana: string; before: number; after: number; touches: number; rights: number }
    >();
    for (const a of snapshot.log) {
      const key = `${a.script}:${a.kana}`;
      const existing = map.get(key);
      if (existing) {
        existing.after = a.starsAfter;
        existing.touches += 1;
        if (a.correct) existing.rights += 1;
      } else {
        map.set(key, {
          script: a.script,
          kana: a.kana,
          before: a.starsBefore,
          after: a.starsAfter,
          touches: 1,
          rights: a.correct ? 1 : 0,
        });
      }
    }
    return [...map.values()].sort((x, y) => y.after - y.before - (x.after - x.before)); // biggest gainers first
  }, [snapshot]);

  // Weakest 5 (lowest current stars) — read latest from store, not from log,
  // so the watch list matches what the user sees on the grid afterwards.
  const weakest = useMemo(() => {
    const all: Array<{ script: Script; kana: string; stars: number }> = [];
    for (const a of charSummary) {
      const stars = (a.script === "hiragana" ? hiragana : katakana)[a.kana] ?? 0;
      all.push({ script: a.script, kana: a.kana, stars });
    }
    return all.sort((x, y) => x.stars - y.stars).slice(0, 5);
  }, [charSummary, hiragana, katakana]);

  if (!snapshot) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-center shadow-[var(--shadow-card-ring-strong)]">
        <h2 className="text-xl font-semibold text-[var(--color-text)]">
          No session data
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Looks like you reloaded the summary directly.
        </p>
        <Link
          href="/kana"
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

  const unlockLabels = snapshot.unlocked.map((id) => {
    // Try both row arrays — the snapshot doesn't carry script-per-unlock, but row labels are shared by id.
    const hit = HIRAGANA_ROWS.find((r) => r.id === id) ?? KATAKANA_ROWS.find((r) => r.id === id);
    return hit?.label ?? id;
  });

  return (
    <div className="flex flex-col gap-6 rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card-ring-strong)] sm:p-6">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-[var(--color-text)]">
          Session complete
        </h1>
        <p className="mt-2 text-lg text-[var(--color-text-muted)]">
          {correctCount} / {total} correct · {accuracyPct}%
        </p>
      </header>

      {snapshot.unlocked.length > 0 && (
        <section className="rounded-[var(--radius-lg)] border border-[var(--color-jlpt-n3-ring)] bg-[var(--color-jlpt-n3-bg)] p-4">
          <h2 className="text-base font-semibold text-[var(--color-jlpt-n3)]">
            New row{snapshot.unlocked.length > 1 ? "s" : ""} unlocked
          </h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-[var(--color-jlpt-n3)]">
            {unlockLabels.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-base font-semibold text-[var(--color-text)]">
          Per-character changes
        </h2>
        <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card-2)]">
          {charSummary.map((c) => {
            const delta = c.after - c.before;
            const sign = delta > 0 ? "+" : delta < 0 ? "" : "±";
            return (
              <li
                key={`${c.script}:${c.kana}`}
                className="flex flex-col gap-1 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl text-[var(--color-text)]">
                    {c.kana}
                  </span>
                  <span className="text-xs text-[var(--color-text-dim)]">
                    ({c.script === "hiragana" ? "hira" : "kata"})
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
                    ({sign}
                    {delta})
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
          <h2 className="mb-3 text-base font-semibold text-[var(--color-text)]">
            Watch list
          </h2>
          <ul className="flex flex-wrap gap-2">
            {weakest.map((w) => (
              <li
                key={`${w.script}:${w.kana}`}
                className="rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-card-2)] px-3 py-1 text-sm"
              >
                <span className="text-base text-[var(--color-text)]">
                  {w.kana}
                </span>
                <span className="ml-2 text-xs text-[var(--color-text-muted)]">
                  {w.stars}★
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/kana/session?mode=${snapshot.mode}`}
          className="flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 text-center text-sm font-semibold [color:white] shadow-[var(--shadow-button-red)] hover:bg-[var(--color-accent)]/90"
        >
          Next session
        </Link>
        <Link
          href="/kana"
          className="flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border-strong)] px-4 text-center text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-card-2)]"
        >
          Back to grid
        </Link>
      </div>
    </div>
  );
}
