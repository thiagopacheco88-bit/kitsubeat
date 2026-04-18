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
      <div className="flex flex-col items-center gap-4 text-center">
        <h2 className="text-xl font-semibold">No session data</h2>
        <p className="text-sm text-zinc-500">Looks like you reloaded the summary directly.</p>
        <Link
          href="/kana"
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
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
    <div className="flex flex-col gap-6">
      <header className="text-center">
        <h1 className="text-3xl font-bold">Session complete</h1>
        <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-300">
          {correctCount} / {total} correct · {accuracyPct}%
        </p>
      </header>

      {snapshot.unlocked.length > 0 && (
        <section className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
          <h2 className="text-base font-semibold text-amber-900 dark:text-amber-100">
            New row{snapshot.unlocked.length > 1 ? "s" : ""} unlocked
          </h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-amber-900 dark:text-amber-100">
            {unlockLabels.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-base font-semibold">Per-character changes</h2>
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800">
          {charSummary.map((c) => {
            const delta = c.after - c.before;
            const sign = delta > 0 ? "+" : delta < 0 ? "" : "±";
            return (
              <li key={`${c.script}:${c.kana}`} className="flex items-center justify-between px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{c.kana}</span>
                  <span className="text-xs text-zinc-400">({c.script === "hiragana" ? "hira" : "kata"})</span>
                </div>
                <div className="text-xs text-zinc-500">
                  {c.before} → {c.after}{" "}
                  <span
                    className={
                      delta > 0
                        ? "text-emerald-600"
                        : delta < 0
                          ? "text-rose-600"
                          : "text-zinc-400"
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
          <h2 className="mb-3 text-base font-semibold">Watch list</h2>
          <ul className="flex flex-wrap gap-2">
            {weakest.map((w) => (
              <li
                key={`${w.script}:${w.kana}`}
                className="rounded-md border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
              >
                <span className="text-base">{w.kana}</span>
                <span className="ml-2 text-xs text-zinc-500">{w.stars}★</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/kana/session?mode=${snapshot.mode}`}
          className="flex-1 rounded-md bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Next session
        </Link>
        <Link
          href="/kana"
          className="flex-1 rounded-md border border-zinc-300 px-4 py-3 text-center text-sm font-semibold hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Back to grid
        </Link>
      </div>
    </div>
  );
}
