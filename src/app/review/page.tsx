/**
 * /review — cross-song SRS review queue landing page.
 * Data fetching delegated to ReviewContent so the page shell renders
 * immediately and the stats stream in via Suspense.
 */
export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { getCurrentUserId } from "@/lib/user-prefs";
import { ReviewContent } from "./ReviewContent";

export default async function ReviewPage() {
  const userId = await getCurrentUserId();

  return (
    <Suspense fallback={
      <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-12 sm:px-6">
        <div className="animate-pulse rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-8 flex flex-col gap-5">
          <div className="h-8 w-48 rounded bg-[var(--color-card-2)]" />
          <div className="h-4 w-72 rounded bg-[var(--color-card-2)]" />
          <div className="h-4 w-56 rounded bg-[var(--color-card-2)]" />
          <div className="h-12 w-full rounded-[var(--radius-md)] bg-[var(--color-card-2)]" />
        </div>
      </div>
    }>
      <ReviewContent userId={userId} />
    </Suspense>
  );
}
