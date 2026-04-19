/**
 * src/lib/gamification/starter-songs.ts
 *
 * Three starter songs shown to new learners in the first-visit StarterPick modal.
 *
 * Slugs were USER-APPROVED at Plan 03 Task 2 (checkpoint:decision):
 *   - Distinct anime franchises: Attack on Titan, Death Note, Doraemon
 *   - Distinct moods: emotional/atmospheric, haunting/lyrical, upbeat/cheerful
 *   - JLPT spread: N4 / N4 / N5 (true beginner on-ramp via Doraemon)
 *   - All verified `difficulty_tier='basic'` with non-null lesson at DB-verify time
 *
 * Used by: Plan 06 StarterPick client component via a server action wrapper.
 */

import { db } from "../db";
import { songs } from "../db/schema";
import { inArray, sql } from "drizzle-orm";

// ─── Approved slug constant ───────────────────────────────────────────────────

/**
 * User-approved starter song slugs (Plan 03 decision checkpoint).
 *
 * Mutation of this tuple requires a new user-facing decision — do not change
 * without updating the checkpoint record in
 * .planning/phases/12-learning-path-and-gamification/12-03-SUMMARY.md.
 */
export const STARTER_SONG_SLUGS = [
  "under-the-tree-sim",           // UNDER THE TREE – Attack on Titan Final Season, N4
  "misa-no-uta-aya-hirano",       // Misa no Uta – Death Note, N4
  "yume-wo-kanaete-doraemon-mao", // Yume wo Kanaete Doraemon – Doraemon, N5
] as const satisfies readonly string[];

export type StarterSongSlug = (typeof STARTER_SONG_SLUGS)[number];

// ─── Row type ─────────────────────────────────────────────────────────────────

/**
 * Shape returned by getStarterSongs() and consumed by StarterPick card components.
 *
 * thumbnail_url is derived from youtube_id via YouTube's thumbnail CDN.
 * We expose the raw youtube_id so the caller can build whichever resolution
 * they need (hqdefault, mqdefault, etc.).
 */
export interface StarterSongRow {
  slug: string;
  title: string;
  anime: string;
  jlpt_level: string | null;
  youtube_id: string | null; // from the first available version with a lesson (tv preferred)
  thumbnail_url: string | null; // https://img.youtube.com/vi/{id}/hqdefault.jpg, or null
}

// ─── Query helper ─────────────────────────────────────────────────────────────

/**
 * Returns the 3 user-approved starter songs with enough metadata for the
 * StarterPick modal.
 *
 * Result order is stable and matches STARTER_SONG_SLUGS declaration order
 * (not DB insertion order or popularity rank), so the modal always shows
 * Attack on Titan → Death Note → Doraemon.
 *
 * Defensive guard: if any slug in STARTER_SONG_SLUGS is missing a non-null
 * lesson at query time, this function throws immediately naming the offending
 * slug. This is a development-time safety net — not a user-facing error.
 */
export async function getStarterSongs(): Promise<StarterSongRow[]> {
  const slugList = [...STARTER_SONG_SLUGS] as string[];

  const rows = await db
    .select({
      slug: songs.slug,
      title: songs.title,
      anime: songs.anime,
      jlpt_level: songs.jlpt_level,
      // tv-preferred youtube_id from the first version that has a lesson
      youtube_id: sql<string | null>`(
        SELECT sv.youtube_id
        FROM song_versions sv
        WHERE sv.song_id = ${songs.id}
          AND sv.lesson IS NOT NULL
        ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
        LIMIT 1
      )`,
      // Existence check: 1 if at least one version has a lesson, else null
      has_lesson: sql<number | null>`(
        SELECT 1
        FROM song_versions sv
        WHERE sv.song_id = ${songs.id}
          AND sv.lesson IS NOT NULL
        LIMIT 1
      )`,
    })
    .from(songs)
    .where(inArray(songs.slug, slugList));

  // Defensive check: surface missing or lesson-less slugs immediately
  const returnedSlugs = new Set(rows.map((r) => r.slug));
  const dbMissing = slugList.filter((s) => !returnedSlugs.has(s));
  const lessonMissing = rows
    .filter((r) => r.has_lesson === null || r.has_lesson === 0)
    .map((r) => r.slug);
  const allMissing = [...dbMissing, ...lessonMissing];

  if (allMissing.length > 0) {
    throw new Error(
      `[starter-songs] getStarterSongs(): the following slugs are missing from DB ` +
        `or have no non-null lesson — fix the DB or update STARTER_SONG_SLUGS: ` +
        allMissing.join(", ")
    );
  }

  // Re-order to match STARTER_SONG_SLUGS declaration order (stable, user-chosen)
  const rowMap = new Map(rows.map((r) => [r.slug, r]));
  return STARTER_SONG_SLUGS.map((slug) => {
    const r = rowMap.get(slug)!;
    const youtube_id = r.youtube_id ?? null;
    return {
      slug: r.slug,
      title: r.title,
      anime: r.anime,
      jlpt_level: r.jlpt_level,
      youtube_id,
      thumbnail_url: youtube_id
        ? `https://img.youtube.com/vi/${youtube_id}/hqdefault.jpg`
        : null,
    };
  });
}
