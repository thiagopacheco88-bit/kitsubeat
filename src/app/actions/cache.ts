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
 * Tag format is locked at `song:${slug}` — page.tsx (after force-dynamic
 * removal) is implicitly tagged by the route, and Next.js's revalidateTag
 * invalidates the route's static data on the next request.
 */
export async function revalidateSongCache(slug: string): Promise<void> {
  revalidateTag(`song:${slug}`);
}
