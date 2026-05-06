"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
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
 * - Honors ?script=hiragana|katakana query param (CONTEXT D-05): pre-selects
 *   the matching mode on first mount. "mixed" is intentionally NOT accepted
 *   as a deep-link target — it's a deliberate user-toggle action only.
 */

/** T-14.1.11-01 mitigation: only accept exact enum values; fallback to hiragana. */
function isValidScriptParam(v: string | null): v is "hiragana" | "katakana" {
  return v === "hiragana" || v === "katakana";
}

export default function KanaLandingPage() {
  const searchParams = useSearchParams();
  const scriptParam = searchParams.get("script");
  const initialMode: KanaMode = isValidScriptParam(scriptParam)
    ? scriptParam
    : "hiragana";

  const hasHydrated = useKanaProgress((s) => s._hasHydrated);
  const [mode, setMode] = useState<KanaMode>(initialMode);

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
          Kana Trainer
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-muted)]">
          Drill hiragana and katakana with row-by-row unlocking and
          per-character mastery.
        </p>
      </header>

      <SignupNudge />

      <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-[var(--shadow-card-ring)] sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ModeToggle value={mode} onChange={setMode} />
        <Link
          href={`/kana/session?mode=${mode}`}
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-6 text-sm font-semibold [color:white] shadow-[var(--shadow-button-red)] hover:bg-[var(--color-accent)]/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
        >
          Start session ({mode === "mixed" ? "20 mixed" : `20 ${mode}`})
        </Link>
        </div>
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
