"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { VerbSession } from "../components/VerbSession";
import { FORM_GROUPS } from "@/lib/verbs/types";

function SessionInner() {
  const params = useSearchParams();
  const raw = params.get("group") ?? "";
  const validGroupId = FORM_GROUPS.find((g) => g.id === raw)?.id ?? FORM_GROUPS[0].id;
  return <VerbSession formGroupId={validGroupId} />;
}

export default function VerbSessionPage() {
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
