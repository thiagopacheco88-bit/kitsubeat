"use client";

/**
 * /kana/session/summary — post-session summary route.
 *
 * Reads the sessionStorage handoff written by KanaSession (Plan 09-05) under
 * the key `kitsubeat-kana-last-session` and forwards it to KanaSessionSummary.
 *
 * The snapshot read happens in useEffect (NOT during render) because
 * sessionStorage is not available during SSR. We deliberately do NOT clear
 * sessionStorage on render so refreshing the summary URL still shows the
 * same data — it's overwritten implicitly when the next session begins.
 *
 * Owner: Phase 09 plan 06.
 */

import { useEffect, useState } from "react";
import { KanaSessionSummary } from "../../components/KanaSessionSummary";

interface Snapshot {
  mode: "hiragana" | "katakana" | "mixed";
  log: Array<{
    script: "hiragana" | "katakana";
    kana: string;
    correct: boolean;
    starsBefore: number;
    starsAfter: number;
  }>;
  unlocked: string[];
}

export default function KanaSessionSummaryPage() {
  // Three-state machine: "loading" -> Snapshot | null. The "loading" state lets
  // us render a skeleton instead of flashing the empty fallback before the
  // useEffect fires.
  const [snapshot, setSnapshot] = useState<Snapshot | null | "loading">("loading");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem("kitsubeat-kana-last-session");
      if (!raw) {
        setSnapshot(null);
        return;
      }
      setSnapshot(JSON.parse(raw) as Snapshot);
      // Do NOT clear sessionStorage — user may refresh; it's overwritten on next session start.
    } catch {
      setSnapshot(null);
    }
  }, []);

  if (snapshot === "loading") {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <div className="h-64 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <KanaSessionSummary snapshot={snapshot} />
    </main>
  );
}
