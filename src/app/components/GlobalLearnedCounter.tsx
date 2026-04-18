/**
 * GlobalLearnedCounter — server component showing total unique words learned.
 *
 * Renders in two variants:
 *   - "nav"     (default): compact link in the header nav bar
 *   - "profile": large display card above learning preferences
 *
 * Visible to ALL users (free and premium) — per CONTEXT.md CROSS-03, the counter
 * is a motivation lever: hiding it from free users reduces conversions.
 *
 * Counter visual: plain text "{n} words" — no emoji per project CLAUDE conventions.
 *
 * The /vocabulary link is a forward reference to Plan 04's route. It will 404
 * until Plan 04 ships; both plans are in the same phase/commit cycle.
 *
 * TODO(Phase 10 auth): replace PLACEHOLDER_USER_ID with Clerk auth().
 */

import Link from "next/link";
import { getGlobalLearnedCount } from "@/lib/db/queries";
import { PLACEHOLDER_USER_ID } from "@/lib/user-prefs";

interface Props {
  variant?: "nav" | "profile";
}

export default async function GlobalLearnedCounter({ variant = "nav" }: Props) {
  const count = await getGlobalLearnedCount(PLACEHOLDER_USER_ID);

  if (variant === "profile") {
    return (
      <section className="rounded-xl border border-gray-700 bg-gray-900 p-6">
        <h2 className="mb-1 text-sm uppercase tracking-wide text-gray-400">
          Words learned
        </h2>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-white">{count}</span>
          <span className="text-sm text-gray-400">unique Japanese words</span>
        </div>
        <Link
          href="/vocabulary"
          className="mt-4 inline-block text-sm text-red-400 hover:text-red-300"
        >
          View vocabulary dashboard -&gt;
        </Link>
      </section>
    );
  }

  // Plain text per project convention (no emoji).
  return (
    <Link
      href="/vocabulary"
      className="whitespace-nowrap text-sm text-gray-400 transition-colors hover:text-white"
      aria-label={`${count} unique Japanese words learned`}
    >
      {count} {count === 1 ? "word" : "words"}
    </Link>
  );
}
