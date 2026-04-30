"use server";

import { revalidateTag } from "next/cache";

/**
 * Phase 13 D-02: single sanctioned writer for the `song:${slug}` cache tag.
 *
 * Every code path that mutates a song's lesson body MUST call this after
 * the write commits. Writers in scope as of Phase 13:
 *   - scripts/seed/snap-full-onsets.ts   (WhisperX timing rewriter)
 *   - scripts/seed/05-insert-db.ts       (per-slug lesson upsert)
 *   - any future admin lesson-edit surface
 *
 * Tag format is locked at `song:${slug}`. Read-side registration lives in
 * `src/lib/db/queries.ts` (CR-01 fix): `getSongBySlug` and
 * `getVocabularyEnrichmentForSong` wrap their DB SELECTs in `unstable_cache`
 * with `tags: [\`song:${slug}\`]`. `revalidateTag(\`song:${slug}\`)` busts
 * BOTH cache entries in lockstep, so the next /songs/[slug] request reads
 * fresh data on every code path the page consumes.
 */
export async function revalidateSongCache(slug: string): Promise<void> {
  revalidateTag(`song:${slug}`);
}
