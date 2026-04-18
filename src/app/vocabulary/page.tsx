export const dynamic = "force-dynamic";

import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getVocabularyDashboard } from "@/lib/db/queries";
import { isPremium } from "@/app/actions/userPrefs";
import VocabularyList from "./VocabularyList";
import FilterControls from "./FilterControls";

import { PLACEHOLDER_USER_ID } from "@/lib/user-prefs";

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
  const userId = PLACEHOLDER_USER_ID;

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
    <main className="mx-auto max-w-5xl px-4 py-8 text-white">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your vocabulary</h1>
          <p className="mt-1 text-sm text-gray-400">
            {rows.length} {rows.length === 1 ? "word" : "words"} with mastery
          </p>
        </div>
      </header>
      <FilterControls
        initial={{ tier: sp.tier, song: sp.song, sort: sp.sort }}
        sources={sources}
      />
      <VocabularyList rows={displayed} />
      {!premium && hiddenCount > 0 && (
        <div className="mt-8 rounded-xl border border-red-800/50 bg-red-950/30 p-6 text-center">
          <p className="text-sm text-gray-300">
            Showing the first {FREE_PREVIEW_LIMIT} of {rows.length} words.
          </p>
          <p className="mt-2 text-lg font-semibold text-white">
            Upgrade to see {hiddenCount} more and unlock the cross-song review queue.
          </p>
          <Link
            href="/profile"
            className="mt-4 inline-block rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
          >
            Upgrade
          </Link>
        </div>
      )}
    </main>
  );
}
