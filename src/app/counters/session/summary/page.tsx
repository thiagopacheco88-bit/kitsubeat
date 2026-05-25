"use client";

/**
 * /counters/session/summary — post-session summary route.
 *
 * Reads sessionStorage written by CounterSession under
 * "kitsubeat-counter-last-session" and forwards it to CounterSessionSummary.
 * Mirrors the /kana/session/summary pattern.
 */

import { useEffect, useState } from "react";
import { CounterSessionSummary } from "../../components/CounterSessionSummary";

interface Snapshot {
  log: Array<{
    counterId: string;
    direction: "num-to-reading" | "reading-to-meaning";
    correct: boolean;
    starsBefore: number;
    starsAfter: number;
  }>;
  unlocked: string[]; // counter IDs unlocked during this session
}

export default function CounterSessionSummaryPage() {
  const [snapshot, setSnapshot] = useState<Snapshot | null | "loading">("loading");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem("kitsubeat-counter-last-session");
      if (!raw) {
        setSnapshot(null);
        return;
      }
      setSnapshot(JSON.parse(raw) as Snapshot);
    } catch {
      setSnapshot(null);
    }
  }, []);

  if (snapshot === "loading") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        <div className="h-80 animate-pulse rounded-[var(--radius-2xl)] bg-[var(--color-card-2)]" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <CounterSessionSummary snapshot={snapshot} />
    </main>
  );
}
