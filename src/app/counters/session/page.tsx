"use client";

import { Suspense } from "react";
import { CounterSession } from "../components/CounterSession";

export default function CounterSessionPage() {
  return (
    <main className="mx-auto flex min-h-[80vh] max-w-2xl flex-col px-4 py-6 sm:px-6">
      <Suspense
        fallback={
          <div className="h-80 animate-pulse rounded-[var(--radius-2xl)] bg-[var(--color-card-2)]" />
        }
      >
        <CounterSession />
      </Suspense>
    </main>
  );
}
