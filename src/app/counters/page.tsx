"use client";

import Link from "next/link";
import { useCounterProgress } from "@/stores/counterProgress";
import { CounterGrid } from "./components/CounterGrid";

/**
 * /counters landing page.
 *
 * Client component — reads the persisted counterProgress store (SSR would
 * hydration-mismatch). Mirrors the /kana landing page pattern.
 *
 * No auth gate: public access (same as /kana FREE-03).
 */
export default function CountersLandingPage() {
  const hasHydrated = useCounterProgress((s) => s._hasHydrated);

  if (!hasHydrated) {
    return (
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 animate-pulse">
        <div className="h-36 w-full rounded-[var(--radius-2xl)] bg-[var(--color-card-2)]" />
        <div className="h-20 w-full rounded-[var(--radius-2xl)] bg-[var(--color-card-2)]" />
        <div className="h-80 w-full rounded-[var(--radius-2xl)] bg-[var(--color-card-2)]" />
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card-ring-strong)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
          Foundations
        </p>
        <h1 className="mt-1 text-3xl font-bold text-[var(--color-text)]">
          Counters Trainer
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-muted)]">
          Drill Japanese counting words (助数詞) with phonetic drill and meaning
          recognition. Master <em>hon</em> (本) first, then unlock the rest.
        </p>
      </header>

      <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-[var(--shadow-card-ring)] sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--color-text-muted)]">
            Each session: 20 questions, both reading and meaning drill.
          </p>
          <Link
            href="/counters/session"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-6 text-sm font-semibold [color:white] shadow-[var(--shadow-button-red)] hover:bg-[var(--color-accent)]/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
          >
            Start session
          </Link>
        </div>
      </div>

      <CounterGrid />
    </main>
  );
}
