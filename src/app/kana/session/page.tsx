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
    <main className="mx-auto max-w-2xl p-6 min-h-[80vh]">
      <Suspense
        fallback={<div className="animate-pulse h-64 rounded bg-zinc-100" />}
      >
        <SessionInner />
      </Suspense>
    </main>
  );
}
