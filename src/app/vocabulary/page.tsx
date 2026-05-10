export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getVocabularyDashboard } from "@/lib/db/queries";
import { isPremium } from "@/app/actions/userPrefs";
import VocabularyList from "./VocabularyList";
import FilterControls from "./FilterControls";
import { JlptGapSummary } from "./JlptGapSummary";
import { EmptyState } from "@/components/ui/EmptyState";

import { getCurrentUserId } from "@/lib/user-prefs";

// Free users get the top 20 rows ordered by state DESC, last_review DESC NULLS LAST
// (Plan 01 default order). Preview cutoff is applied in-memory so we can show the
// accurate total + upgrade CTA without a second COUNT query.
// CONTEXT decision: top 20 most-mastered words, preserving Plan 01's default ORDER BY.
const FREE_PREVIEW_LIMIT = 20;

/**
 * Returns distinct songs that the user has at least one mastered/known/learning word in.
 * Private helper — intentionally NOT exported from queries.ts. Only used on this page.
 */
async function getVocabularySources(
  userId: string
): Promise<Array<{ id: string; title: string }>> {
  const result = await db.execute(sql`
    SELECT DISTINCT s.id, s.title
    FROM vocab_global vg
    JOIN user_vocab_mastery m ON m.vocab_item_id = vg.vocab_item_id
    JOIN songs s ON s.id = vg.song_id
    WHERE m.user_id = ${userId} AND m.state IN (1, 2, 3)
    ORDER BY s.title ASC
  `);
  const rows = Array.isArray(result) ? result : (result.rows ?? []);
  return rows.map((r) => ({
    id: r.id as string,
    title: r.title as string,
  }));
}

export default async function VocabularyPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; song?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const userId = await getCurrentUserId();

  const [premium, rows, sources] = await Promise.all([
    isPremium(userId),
    getVocabularyDashboard(userId, {
      tierFilter:
        sp.tier === "1" ? 1 : sp.tier === "2" ? 2 : sp.tier === "3" ? 3 : undefined,
      sourceSongId: sp.song,
      sortDirection: sp.sort === "asc" ? "asc" : "desc",
      // No SQL LIMIT — preview cutoff applied below via in-memory slice so the
      // header total and upgrade CTA both reflect the user's actual full count.
      limit: undefined,
    }),
    getVocabularySources(userId),
  ]);

  const displayed = premium ? rows : rows.slice(0, FREE_PREVIEW_LIMIT);
  const hiddenCount = premium ? 0 : Math.max(0, rows.length - FREE_PREVIEW_LIMIT);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 text-[var(--color-text)] sm:px-6">
      <header className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card-ring-strong)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
          Library
        </p>
        <h1 className="mt-1 text-3xl font-bold">Your vocabulary</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          {rows.length} {rows.length === 1 ? "word" : "words"} with mastery
        </p>
      </header>
      <Suspense fallback={
        <div className="animate-pulse rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 mb-6">
          <div className="mb-4 h-5 w-32 rounded bg-[var(--color-card-2)]" />
          <ul className="space-y-4">
            {["N5","N4","N3","N2","N1"].map((l) => (
              <li key={l} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-10 rounded-full bg-[var(--color-card-2)]" />
                  <div className="h-4 w-28 rounded bg-[var(--color-card-2)]" />
                </div>
                <div className="h-2 w-full rounded-full bg-[var(--color-card-2)]" />
              </li>
            ))}
          </ul>
        </div>
      }>
        <JlptGapSummary userId={userId} />
      </Suspense>
      <FilterControls
        initial={{ tier: sp.tier, song: sp.song, sort: sp.sort }}
        sources={sources}
      />
      <VocabularyList rows={displayed} />
      {!premium && hiddenCount > 0 && (
        <div>
          <EmptyState
            heading={`Showing the first ${FREE_PREVIEW_LIMIT} of ${rows.length} words`}
            body={`Upgrade to see ${hiddenCount} more and unlock the cross-song review queue.`}
            ctaLabel="Upgrade"
            ctaHref="/profile"
          />
        </div>
      )}
    </main>
  );
}
