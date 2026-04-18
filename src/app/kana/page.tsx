"use client";

import Link from "next/link";
import { useState } from "react";
import { useKanaProgress } from "@/stores/kanaProgress";
import type { KanaMode } from "@/lib/kana/types";
import { KanaGrid } from "./components/KanaGrid";
import { ModeToggle } from "./components/ModeToggle";
import { SignupNudge } from "./components/SignupNudge";

/**
 * Public /kana landing page.
 *
 * - Client Component: reads from the persisted kanaProgress store, so SSR
 *   would hydration-mismatch (RESEARCH Pitfall 1).
 * - No auth gate: FREE-03 demands public access; the route deliberately
 *   skips every premium / access-check helper.
 * - Owns the local `mode` state (hiragana / katakana / mixed). Mode is NOT
 *   persisted — it resets on reload by design (out of scope for v1).
 * - Renders a skeleton until the store hydrates (pattern lifted from
 *   `src/app/songs/[slug]/components/ExerciseTab.tsx`).
 * - Start CTA navigates to `/kana/session?mode={mode}` — the session route
 *   is built in Plan 09-05; this href is the contract.
 */
export default function KanaLandingPage() {
  const hasHydrated = useKanaProgress((s) => s._hasHydrated);
  const [mode, setMode] = useState<KanaMode>("hiragana");

  if (!hasHydrated) {
    return (
      <main className="mx-auto max-w-5xl p-6 flex flex-col gap-6 animate-pulse">
        <div className="h-8 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-12 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-64 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-6 flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Kana Trainer</h1>
        <p className="text-sm text-zinc-500">
          Drill hiragana and katakana with row-by-row unlocking and
          per-character mastery.
        </p>
      </header>

      <SignupNudge />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ModeToggle value={mode} onChange={setMode} />
        <Link
          href={`/kana/session?mode=${mode}`}
          className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          Start session ({mode === "mixed" ? "20 mixed" : `20 ${mode}`})
        </Link>
      </div>

      <div className="flex flex-col gap-8">
        {(mode === "hiragana" || mode === "mixed") && (
          <KanaGrid script="hiragana" />
        )}
        {(mode === "katakana" || mode === "mixed") && (
          <KanaGrid script="katakana" />
        )}
      </div>
    </main>
  );
}
