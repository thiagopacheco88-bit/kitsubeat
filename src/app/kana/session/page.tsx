"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import type { KanaMode } from "@/lib/kana/types";
import { KanaSession } from "../components/KanaSession";

function SessionInner() {
  const params = useSearchParams();
  const raw = params.get("mode");
  const mode: KanaMode =
    raw === "katakana" || raw === "mixed" ? raw : "hiragana";
  return <KanaSession mode={mode} />;
}

export default function KanaSessionPage() {
  return (
    <main className="mx-auto flex min-h-[80vh] max-w-2xl flex-col px-4 py-6 sm:px-6">
      <Suspense
        fallback={
          <div className="h-80 animate-pulse rounded-[var(--radius-2xl)] bg-[var(--color-card-2)]" />
        }
      >
        <SessionInner />
      </Suspense>
    </main>
  );
}
