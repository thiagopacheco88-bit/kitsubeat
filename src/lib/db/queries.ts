import { cache } from "react";
import { unstable_cache } from "next/cache";
import { eq, sql, asc, desc, inArray, and } from "drizzle-orm";
import { db } from "./index";
import {
  songs,
  songVersions,
  vocabularyItems,
  vocabGlobal,
  userSongProgress,
  userVerseDomination,
  users,
  userCosmetics,
  rewardSlotDefinitions,
  activityEvents,
  songPlays,
  deriveStars,
  type SongVersion,
} from "./schema";
import { REVIEW_NEW_DAILY_CAP } from "@/lib/user-prefs";

// ---------------------------------------------------------------------------
// Song detail page
// ---------------------------------------------------------------------------

/**
 * Phase 13 CR-01 fix: cross-request lesson cache.
 *
 * Layering (outer → inner):
 *   1. React `cache()` — per-request memo. Dedupes `generateMetadata` +
 *      `SongPlayerPage` within the same request. Not invalidatable.
 *   2. `unstable_cache(...)` — cross-request data cache, keyed by slug, tagged
 *      `song:${slug}`. `revalidateTag('song:${slug}')` (called by writers via
 *      `src/app/actions/cache.ts`) invalidates this layer cleanly.
 *
 * The wrapper is built per-slug so the tag closes over the slug argument.
 * `revalidate: false` means the cache is held until the tag is busted — D-02
 * "tag-only on lesson edit, no TTL safety net".
 */
async function fetchSongBySlugUncached(slug: string) {
  const rows = await db
    .select()
    .from(songs)
    .where(eq(songs.slug, slug))
    .limit(1);

  const song = rows[0] ?? null;
  if (!song) return null;

  const versions = await db
    .select()
    .from(songVersions)
    .where(eq(songVersions.song_id, song.id));

  return { ...song, versions };
}

export const getSongBySlug = cache(async (slug: string) => {
  return unstable_cache(
    () => fetchSongBySlugUncached(slug),
    ["song-by-slug", slug],
    { tags: [`song:${slug}`], revalidate: false },
  )();
});

/**
 * Phase 13 CR-01 fix: cache the per-song vocabulary enrichment SELECT under
 * the same `song:${slug}` tag so writers only need to revalidate one tag per
 * slug. Returns enrichment fields keyed by vocab_item_id; the page-level
 * code merges them into each VocabEntry.
 *
 * Wrapped per-slug so the tag closes over the slug argument. The vocab-id list
 * is part of the cache key so a lesson edit that adds/removes vocab busts the
 * cache via the `song:${slug}` tag (the new vocab-id list will look like a
 * different cache key on the next request anyway, but the tag is the
 * authoritative invalidation handle).
 */
async function fetchVocabularyEnrichmentUncached(vocabIds: string[]) {
  if (vocabIds.length === 0) {
    return [] as Array<{
      id: string;
      mnemonic: unknown;
      kanji_breakdown: unknown;
      image_url: string | null;
    }>;
  }
  return db
    .select({
      id: vocabularyItems.id,
      mnemonic: vocabularyItems.mnemonic,
      kanji_breakdown: vocabularyItems.kanji_breakdown,
      image_url: vocabularyItems.image_url,
    })
    .from(vocabularyItems)
    .where(inArray(vocabularyItems.id, vocabIds));
}

export const getVocabularyEnrichmentForSong = cache(
  async (slug: string, vocabIds: string[]) => {
    const sortedIds = [...vocabIds].sort();
    return unstable_cache(
      () => fetchVocabularyEnrichmentUncached(sortedIds),
      ["vocab-enrichment-for-song", slug, sortedIds.join(",")],
      { tags: [`song:${slug}`], revalidate: false },
    )();
  },
);

export type SongWithVersions = NonNullable<Awaited<ReturnType<typeof getSongBySlug>>>;

// ---------------------------------------------------------------------------
// Browse / list pages
// ---------------------------------------------------------------------------

/**
 * Get all songs with metadata for the browse page.
 * Includes the preferred youtube_id (tv > full) for thumbnails.
 *
 * Phase 10 Plan 07 — when `userId` is supplied, five per-user progress fields
 * are joined in via a single correlated SELECT against `user_song_progress`:
 * ex1_2_3 / ex4 / ex5 / ex6 / ex7 best_accuracy (all nullable). SongCard then
 * computes stars (via deriveStars, consuming ex6) and bonus badge (via
 * deriveBonusBadge, consuming ex5 + ex7) at render time.
 *
 * The subquery uses `LIMIT 1 ORDER BY tv first` on `user_song_progress` joined
 * by `song_version_id → song_versions.id` WHERE `song_id = songs.id`. That
 * matches the same version the thumbnail is sourced from, so stars surfaced on
 * the catalog card correspond to the version the user plays when they click
 * in. No N+1: a single catalog query still returns the 200 rows.
 *
 * Unauthenticated callers pass no userId — the accuracy fields return null and
 * SongCard short-circuits to the zero-star / no-bonus branch (no ribbon, no
 * badge).
 */
export async function getAllSongs(userId?: string | null) {
  const userIdParam = userId ?? null;
  return db
    .select({
      id: songs.id,
      slug: songs.slug,
      title: songs.title,
      artist: songs.artist,
      anime: songs.anime,
      season_info: songs.season_info,
      youtube_id: sql<string | null>`(
        SELECT sv.youtube_id FROM song_versions sv
        WHERE sv.song_id = songs.id AND sv.youtube_id IS NOT NULL
        ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
        LIMIT 1
      )`,
      year_launched: songs.year_launched,
      jlpt_level: songs.jlpt_level,
      difficulty_tier: songs.difficulty_tier,
      genre_tags: songs.genre_tags,
      mood_tags: songs.mood_tags,
      // Phase 10 Plan 07 — per-user accuracy fields for the SongCard stars +
      // bonus-badge derivation. NULL for unauthenticated callers AND for
      // rows where the user has never attempted the respective exercise.
      // Scoped to the tv-preferred song_version so the stars match the
      // version the user plays when they click into the card.
      ex1_2_3_best_accuracy: sql<number | null>`(
        SELECT p.ex1_2_3_best_accuracy FROM user_song_progress p
        INNER JOIN song_versions sv ON sv.id = p.song_version_id
        WHERE sv.song_id = songs.id AND p.user_id = ${userIdParam}
        ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
        LIMIT 1
      )`,
      ex4_best_accuracy: sql<number | null>`(
        SELECT p.ex4_best_accuracy FROM user_song_progress p
        INNER JOIN song_versions sv ON sv.id = p.song_version_id
        WHERE sv.song_id = songs.id AND p.user_id = ${userIdParam}
        ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
        LIMIT 1
      )`,
      ex5_best_accuracy: sql<number | null>`(
        SELECT p.ex5_best_accuracy FROM user_song_progress p
        INNER JOIN song_versions sv ON sv.id = p.song_version_id
        WHERE sv.song_id = songs.id AND p.user_id = ${userIdParam}
        ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
        LIMIT 1
      )`,
      ex6_best_accuracy: sql<number | null>`(
        SELECT p.ex6_best_accuracy FROM user_song_progress p
        INNER JOIN song_versions sv ON sv.id = p.song_version_id
        WHERE sv.song_id = songs.id AND p.user_id = ${userIdParam}
        ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
        LIMIT 1
      )`,
      ex7_best_accuracy: sql<number | null>`(
        SELECT p.ex7_best_accuracy FROM user_song_progress p
        INNER JOIN song_versions sv ON sv.id = p.song_version_id
        WHERE sv.song_id = songs.id AND p.user_id = ${userIdParam}
        ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
        LIMIT 1
      )`,
      // Phase 13 — grammar session accuracy (new Star 3 gate for songs with
      // grammar). Same subquery shape as the Ex5-7 columns; NULL for users who
      // haven't finished a grammar session yet.
      grammar_best_accuracy: sql<number | null>`(
        SELECT p.grammar_best_accuracy FROM user_song_progress p
        INNER JOIN song_versions sv ON sv.id = p.song_version_id
        WHERE sv.song_id = songs.id AND p.user_id = ${userIdParam}
        ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
        LIMIT 1
      )`,
      // Phase 13 — true if ANY of this song's versions has at least one entry
      // in song_version_grammar_rules. Drives the deriveStars(songHasGrammar)
      // branch so Star 3 checks grammar_best_accuracy on grammar songs and
      // ex6_best_accuracy on vocab-only songs.
      has_grammar: sql<boolean>`EXISTS (
        SELECT 1 FROM song_version_grammar_rules svgr
        INNER JOIN song_versions sv ON sv.id = svgr.song_version_id
        WHERE sv.song_id = songs.id
      )`,
      completion_pct: sql<number | null>`(
        SELECT p.completion_pct FROM user_song_progress p
        INNER JOIN song_versions sv ON sv.id = p.song_version_id
        WHERE sv.song_id = songs.id AND p.user_id = ${userIdParam}
        ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
        LIMIT 1
      )`,
      // Phase 11.6 — average of the three per-track pcts (Vocab + Grammar + Kanji).
      // Drives the song-card circular ring as a "real progress" signal in place
      // of the legacy session-count completion_pct (which incremented +15/+30 per
      // session and didn't reflect mastery).
      //
      // NULLs (track row absent / pct not yet computed) are treated as 0 via
      // COALESCE — a brand-new song reads 0/0/0 = 0%. Returns text per Pitfall 6
      // (neon-http boxes numeric as string).
      avg_track_pct: sql<string | null>`(
        SELECT ROUND(
          (
            COALESCE(p.vocab_track_pct, 0) +
            COALESCE(p.grammar_track_pct, 0) +
            COALESCE(p.kanji_track_pct, 0)
          ) / 3.0,
          0
        )::text
        FROM user_song_progress p
        INNER JOIN song_versions sv ON sv.id = p.song_version_id
        WHERE sv.song_id = songs.id AND p.user_id = ${userIdParam}
        ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
        LIMIT 1
      )`,
      // Learner count: distinct (user_id OR session_key) across all versions
      // of this song. COALESCE lets anonymous plays (user_id NULL) contribute
      // as distinct by session_key — each tab/mount counts once, matching the
      // "social proof" intent (how many humans have listened) without letting
      // a single replaying user inflate the number.
      learner_count: sql<number>`(
        SELECT COUNT(DISTINCT COALESCE(sp.user_id, sp.session_key))::int
        FROM song_plays sp
        INNER JOIN song_versions sv ON sv.id = sp.song_version_id
        WHERE sv.song_id = songs.id
      )`,
      // Phase 11.6 SPEC-REQ-14 — verses dominated as a percent.
      //
      // Numerator: count of user_verse_domination rows for this user across
      // the tv-preferred song_version. Denominator: jsonb_array_length of
      // the lesson's verses array on the same version.
      //
      // Why lesson JSONB and NOT song_version_grammar_rules.verse_number — the
      // grammar-rules table is song-level (no per-verse rows; verse_number is
      // not a column there). The lesson.verses[] array is the canonical source
      // of truth for "how many verses does this song have"; verse domination
      // is computed against vocab + grammar + kanji items per verse upstream
      // (Plan 11.6-05) and the denominator is just the verse count.
      //
      // Returns numeric (string per Pitfall 6 — neon-http boxes numeric as
      // string). NULL for unauthenticated callers OR for songs where the
      // user has zero dominated verses (downstream parseFloat handles NULL).
      verses_dominated_pct: sql<string | null>`(
        SELECT CASE
          WHEN COALESCE(verse_total.cnt, 0) = 0 THEN NULL
          ELSE ROUND(
            (COALESCE(dom.cnt, 0)::numeric / verse_total.cnt::numeric) * 100,
            0
          )::text
        END
        FROM (
          SELECT jsonb_array_length(sv.lesson -> 'verses') AS cnt, sv.id AS sv_id
          FROM song_versions sv
          WHERE sv.song_id = songs.id AND sv.lesson IS NOT NULL
          ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
          LIMIT 1
        ) AS verse_total
        LEFT JOIN (
          SELECT COUNT(*)::int AS cnt, uvd.song_version_id
          FROM user_verse_domination uvd
          WHERE uvd.user_id = ${userIdParam}
          GROUP BY uvd.song_version_id
        ) AS dom
          ON dom.song_version_id = verse_total.sv_id
      )`,
    })
    .from(songs)
    .where(sql`EXISTS (
      SELECT 1 FROM song_versions sv
      WHERE sv.song_id = ${songs.id} AND sv.lesson IS NOT NULL
    ) AND ${songs.language} = 'ja'
    AND ${songs.quality_status} = 'active'
    AND EXISTS (
      SELECT 1 FROM song_versions sv
      WHERE sv.song_id = ${songs.id} AND sv.pipeline_status = 'idle'
    )`)
    .orderBy(asc(songs.popularity_rank));
}

export type SongListItem = Awaited<ReturnType<typeof getAllSongs>>[number];

// ---------------------------------------------------------------------------
// Home page carousels
// ---------------------------------------------------------------------------

/**
 * Get featured songs for the home page.
 */
export async function getFeaturedSongs(limit: number = 6) {
  return db
    .select({
      id: songs.id,
      slug: songs.slug,
      title: songs.title,
      artist: songs.artist,
      anime: songs.anime,
      youtube_id: sql<string | null>`(
        SELECT sv.youtube_id FROM song_versions sv
        WHERE sv.song_id = songs.id AND sv.youtube_id IS NOT NULL
        ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
        LIMIT 1
      )`,
      jlpt_level: songs.jlpt_level,
      difficulty_tier: songs.difficulty_tier,
    })
    .from(songs)
    .where(sql`EXISTS (
      SELECT 1 FROM song_versions sv
      WHERE sv.song_id = ${songs.id} AND sv.lesson IS NOT NULL
    ) AND ${songs.language} = 'ja'
    AND ${songs.quality_status} = 'active'
    AND EXISTS (
      SELECT 1 FROM song_versions sv
      WHERE sv.song_id = ${songs.id} AND sv.pipeline_status = 'idle'
    )`)
    .orderBy(asc(songs.popularity_rank))
    .limit(limit);
}

/**
 * Phase 14.2 SPEC §Req 4 — Continue Learning carousel data path.
 *
 * Returns up to `limit` rows of in-progress songs for the user, sorted by
 * `user_song_progress.updated_at DESC`. Filter is `completion_pct > 0`
 * (D-01) — single-column expression of "the user has engaged with this
 * lesson." Returned shape mirrors getFeaturedSongs + adds completion_pct
 * + updated_at (D-03) + stars (D-14, derived at read time via deriveStars
 * — SAME helper getAllSongs uses (line 572) and SongCard renders).
 *
 * youtube_id resolves via the same correlated subquery getFeaturedSongs
 * uses (TV version preferred, else first non-null). jlpt_level carried
 * for parity (ContinueCard does not currently render it but D-03 keeps
 * the field for future-proofing).
 *
 * stars derivation (D-14): JOIN brings ex1_2_3 / ex4 / ex6 / grammar
 * accuracy + has_grammar EXISTS subquery; deriveStars() is applied in
 * the post-query map. Single source of truth — no new threshold logic
 * invented in this query. SongCard.tsx + getAllSongs use the same
 * helper (queries.ts line 572).
 */
export async function getContinueLearning(
  userId: string,
  limit: number = 3,
) {
  const rows = await db
    .select({
      slug: songs.slug,
      title: songs.title,
      artist: songs.artist,
      anime: songs.anime,
      youtube_id: sql<string | null>`(
        SELECT sv2.youtube_id
        FROM song_versions sv2
        WHERE sv2.song_id = ${songs.id} AND sv2.youtube_id IS NOT NULL
        ORDER BY CASE sv2.version_type WHEN 'tv' THEN 0 ELSE 1 END
        LIMIT 1
      )`,
      jlpt_level: songs.jlpt_level,
      completion_pct: userSongProgress.completion_pct,
      updated_at: userSongProgress.updated_at,
      // D-14 — accuracy columns for read-time stars derivation. Read
      // directly from the joined user_song_progress row (no subquery
      // needed because we ALREADY join on it for the filter).
      ex1_2_3_best_accuracy: userSongProgress.ex1_2_3_best_accuracy,
      ex4_best_accuracy: userSongProgress.ex4_best_accuracy,
      ex6_best_accuracy: userSongProgress.ex6_best_accuracy,
      grammar_best_accuracy: userSongProgress.grammar_best_accuracy,
      // has_grammar EXISTS — same shape getAllSongs uses (queries.ts line 208).
      has_grammar: sql<boolean>`EXISTS (
        SELECT 1 FROM song_version_grammar_rules svgr
        INNER JOIN song_versions sv3 ON sv3.id = svgr.song_version_id
        WHERE sv3.song_id = ${songs.id}
      )`,
    })
    .from(userSongProgress)
    .innerJoin(songVersions, eq(songVersions.id, userSongProgress.song_version_id))
    .innerJoin(songs, eq(songs.id, songVersions.song_id))
    .where(
      and(
        eq(userSongProgress.user_id, userId),
        sql`${userSongProgress.completion_pct} > 0`,
        eq(songs.language, "ja"),
        eq(songs.quality_status, "active"),
      ),
    )
    .orderBy(desc(userSongProgress.updated_at))
    .limit(limit);

  // Apply deriveStars at read time — SAME helper getAllSongs (line 572) +
  // SongCard.tsx use. Single source of truth for the mastery threshold.
  // Strip the raw accuracy columns from the returned shape per D-03 (they
  // are implementation detail; the public contract exposes only `stars`).
  return rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    artist: r.artist,
    anime: r.anime,
    youtube_id: r.youtube_id,
    jlpt_level: r.jlpt_level,
    completion_pct: r.completion_pct,
    updated_at: r.updated_at,
    stars: deriveStars(
      {
        ex1_2_3_best_accuracy: r.ex1_2_3_best_accuracy,
        ex4_best_accuracy: r.ex4_best_accuracy,
        ex6_best_accuracy: r.ex6_best_accuracy,
        grammar_best_accuracy: r.grammar_best_accuracy,
      },
      r.has_grammar ?? false,
    ),
  }));
}

// =============================================================================
// Phase 14.2 SPEC §Req 3 — HeroFeatured data path
// =============================================================================

/**
 * HeroSongRow — the song fields returned by getHeroSong in all branches.
 * verse_count is derived via jsonb_array_length(sv.lesson->'verses');
 * COALESCE-wrapped to 0 when lesson IS NULL (JSONB shape verified in
 * 14.2-01-VERIFICATIONS.md §V2 — path is { verses: [...] }).
 */
export interface HeroSongRow {
  slug: string;
  title: string;
  artist: string;
  anime: string;
  youtube_id: string | null;
  jlpt_level: string | null;
  verse_count: number;
}

export type HeroCtaLabel = "Resume Lesson" | "Try Free Lesson" | "Start Learning";
export type HeroSource = "current_path" | "fallback_featured" | "unauth_featured";

export interface HeroSongResult {
  song: HeroSongRow;
  ctaLabel: HeroCtaLabel;
  ctaHref: string;
  source: HeroSource;
}

/**
 * Internal helper: select the full hero song row for a given slug.
 * Returns null if the slug does not resolve to an active ja song with a lesson.
 */
async function selectHeroSongRowBySlug(slug: string): Promise<HeroSongRow | null> {
  const outerSongsId = sql.raw('"songs"."id"');
  const rows = await db
    .select({
      slug: songs.slug,
      title: songs.title,
      artist: songs.artist,
      anime: songs.anime,
      jlpt_level: songs.jlpt_level,
      youtube_id: sql<string | null>`(
        SELECT sv.youtube_id FROM song_versions sv
        WHERE sv.song_id = ${outerSongsId} AND sv.youtube_id IS NOT NULL
        ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
        LIMIT 1
      )`,
      verse_count: sql<number>`COALESCE((
        SELECT jsonb_array_length(sv.lesson->'verses')
        FROM song_versions sv
        WHERE sv.song_id = ${outerSongsId} AND sv.lesson IS NOT NULL
        ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
        LIMIT 1
      ), 0)`,
    })
    .from(songs)
    .where(
      and(
        eq(songs.slug, slug),
        eq(songs.language, "ja"),
        eq(songs.quality_status, "active"),
        sql`EXISTS (SELECT 1 FROM song_versions sv WHERE sv.song_id = ${songs.id} AND sv.lesson IS NOT NULL)`,
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Internal helper: select the top featured hero song row (popularity_rank ASC).
 * Throws if no active ja song with a lesson is available — the seed pipeline must
 * guarantee at least one row (CONTEXT D-04 / T-14.2-03-05 disposition: accept throw,
 * page-level error boundary catches and renders error UI).
 */
async function selectTopFeaturedHeroRow(): Promise<HeroSongRow> {
  const outerSongsId = sql.raw('"songs"."id"');
  const rows = await db
    .select({
      slug: songs.slug,
      title: songs.title,
      artist: songs.artist,
      anime: songs.anime,
      jlpt_level: songs.jlpt_level,
      youtube_id: sql<string | null>`(
        SELECT sv.youtube_id FROM song_versions sv
        WHERE sv.song_id = ${outerSongsId} AND sv.youtube_id IS NOT NULL
        ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END LIMIT 1
      )`,
      verse_count: sql<number>`COALESCE((
        SELECT jsonb_array_length(sv.lesson->'verses')
        FROM song_versions sv
        WHERE sv.song_id = ${outerSongsId} AND sv.lesson IS NOT NULL
        ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END LIMIT 1
      ), 0)`,
    })
    .from(songs)
    .where(
      and(
        eq(songs.language, "ja"),
        eq(songs.quality_status, "active"),
        sql`EXISTS (
          SELECT 1 FROM song_versions sv
          WHERE sv.song_id = ${songs.id} AND sv.lesson IS NOT NULL
        )`,
      ),
    )
    .orderBy(asc(songs.popularity_rank))
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw new Error(
      "[hero-song] no active featured song available — seed pipeline must guarantee >=1 row",
    );
  }
  return row;
}

/**
 * Phase 14.2 SPEC §Req 3 — HeroFeatured data path with auth-aware fallback.
 *
 * Three branches per CONTEXT D-04:
 *   - userId === null            → top featured, 'Try Free Lesson', source 'unauth_featured', no warn
 *   - userId set, slug resolves  → resolved row, 'Resume Lesson', source 'current_path', no warn
 *   - userId set, slug missing   → top featured, 'Start Learning', source 'fallback_featured'
 *                                   + console.warn IFF slug WAS set but didn't resolve (D-06)
 *
 * verse_count via jsonb_array_length(sv.lesson->'verses') — JSONB path { verses: [...] }
 * verified in 14.2-01-VERIFICATIONS.md §V2. COALESCE-wrapped to 0 when lesson IS NULL.
 */
export async function getHeroSong(userId: string | null): Promise<HeroSongResult> {
  // Branch 1 — unauth.
  if (!userId) {
    const song = await selectTopFeaturedHeroRow();
    return {
      song,
      ctaLabel: "Try Free Lesson",
      ctaHref: `/songs/${song.slug}`,
      source: "unauth_featured",
    };
  }

  // Branch 2/3 — auth.
  const state = await getUserGamificationState(userId);
  const slug = state.current_path_node_slug;

  if (slug) {
    const resolved = await selectHeroSongRowBySlug(slug);
    if (resolved) {
      return {
        song: resolved,
        ctaLabel: "Resume Lesson",
        ctaHref: `/songs/${resolved.slug}`,
        source: "current_path",
      };
    }
    // Slug WAS set but didn't resolve — D-06 mandates the warn.
    console.warn(
      `[hero-song] ${slug} (current_path_node_slug) missing or lessonless — falling back to top featured`,
    );
  }

  // Branch 3 — auth fallback (null slug OR drifted slug).
  const song = await selectTopFeaturedHeroRow();
  return {
    song,
    ctaLabel: "Start Learning",
    ctaHref: `/songs/${song.slug}`,
    source: "fallback_featured",
  };
}

/**
 * Get anime franchises (merging seasons/movies) with song counts.
 */
export async function getTopAnimeFranchises(limit: number = 10) {
  return db
    .select({
      anime: sql<string>`regexp_replace(
        ${songs.anime},
        '( Season\\s.*| Final Season.*|:\\s.*|\\sII$|\\sIII$|\\sIV$| the Movie.*| Alternative.*| Extra.*)',
        '',
        'i'
      )`,
      count: sql<number>`count(*)::int`,
      youtube_id: sql<string | null>`(array_agg(
        (SELECT sv.youtube_id FROM song_versions sv
         WHERE sv.song_id = songs.id AND sv.youtube_id IS NOT NULL
         ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
         LIMIT 1)
        ORDER BY songs.popularity_rank ASC NULLS LAST
      ) FILTER (WHERE EXISTS (
        SELECT 1 FROM song_versions sv
        WHERE sv.song_id = songs.id AND sv.youtube_id IS NOT NULL
      )))[1]`,
      banner_image: sql<string | null>`(array_agg(
        (SELECT am.banner_image FROM anime_metadata am
         WHERE am.anime = songs.anime LIMIT 1)
        ORDER BY songs.popularity_rank ASC NULLS LAST
      ) FILTER (WHERE EXISTS (
        SELECT 1 FROM anime_metadata am
        WHERE am.anime = songs.anime AND am.banner_image IS NOT NULL
      )))[1]`,
      cover_image: sql<string | null>`(array_agg(
        (SELECT am.cover_image FROM anime_metadata am
         WHERE am.anime = songs.anime LIMIT 1)
        ORDER BY songs.popularity_rank ASC NULLS LAST
      ) FILTER (WHERE EXISTS (
        SELECT 1 FROM anime_metadata am
        WHERE am.anime = songs.anime AND am.cover_image IS NOT NULL
      )))[1]`,
    })
    .from(songs)
    .where(sql`EXISTS (
      SELECT 1 FROM song_versions sv
      WHERE sv.song_id = ${songs.id} AND sv.lesson IS NOT NULL
    ) AND ${songs.language} = 'ja'
    AND ${songs.quality_status} = 'active'
    AND EXISTS (
      SELECT 1 FROM song_versions sv
      WHERE sv.song_id = ${songs.id} AND sv.pipeline_status = 'idle'
    )`)
    .groupBy(sql`regexp_replace(
      ${songs.anime},
      '( Season\\s.*| Final Season.*|:\\s.*|\\sII$|\\sIII$|\\sIV$| the Movie.*| Alternative.*| Extra.*)',
      '',
      'i'
    )`)
    .orderBy(sql`count(*) desc`)
    .limit(limit);
}

/**
 * Get top artists with song counts.
 */
export async function getTopArtists(limit: number = 10) {
  return db
    .select({
      artist: songs.artist,
      count: sql<number>`count(*)::int`,
      youtube_id: sql<string | null>`(array_agg(
        (SELECT sv.youtube_id FROM song_versions sv
         WHERE sv.song_id = songs.id AND sv.youtube_id IS NOT NULL
         ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
         LIMIT 1)
        ORDER BY songs.popularity_rank ASC NULLS LAST
      ))[1]`,
    })
    .from(songs)
    .where(sql`EXISTS (
      SELECT 1 FROM song_versions sv
      WHERE sv.song_id = ${songs.id} AND sv.lesson IS NOT NULL
    ) AND ${songs.language} = 'ja'
    AND ${songs.quality_status} = 'active'
    AND EXISTS (
      SELECT 1 FROM song_versions sv
      WHERE sv.song_id = ${songs.id} AND sv.pipeline_status = 'idle'
    )`)
    .groupBy(songs.artist)
    .orderBy(sql`count(*) desc`)
    .limit(limit);
}

// ---------------------------------------------------------------------------
// vocab_global materialized view
// ---------------------------------------------------------------------------

/**
 * Refresh the vocab_global materialized view.
 *
 * Should be called after any INSERT/UPDATE on song_versions that modifies lesson content.
 * Uses CONCURRENTLY when the view has at least one row (requires the unique index).
 * Falls back to a blocking refresh on first run (before backfill populates vocab_item_id).
 *
 * Decision: Materialized view refresh on song update (not cron) — locked in research.
 */
export async function refreshVocabGlobal(): Promise<void> {
  try {
    await db.refreshMaterializedView(vocabGlobal).concurrently();
  } catch (err) {
    // CONCURRENTLY requires at least one row and the unique index.
    // On first run (before backfill), fall back to a blocking refresh.
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes("concurrently") ||
      message.includes("CONCURRENTLY") ||
      message.includes("at least one row")
    ) {
      await db.refreshMaterializedView(vocabGlobal);
    } else {
      throw err;
    }
  }
}

/**
 * Get beginner-friendly songs (JLPT N5/N4).
 */
export async function getBeginnerSongs(limit: number = 10) {
  return db
    .select({
      id: songs.id,
      slug: songs.slug,
      title: songs.title,
      artist: songs.artist,
      anime: songs.anime,
      youtube_id: sql<string | null>`(
        SELECT sv.youtube_id FROM song_versions sv
        WHERE sv.song_id = songs.id AND sv.youtube_id IS NOT NULL
        ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
        LIMIT 1
      )`,
      jlpt_level: songs.jlpt_level,
      difficulty_tier: songs.difficulty_tier,
    })
    .from(songs)
    .where(sql`EXISTS (
      SELECT 1 FROM song_versions sv
      WHERE sv.song_id = ${songs.id} AND sv.lesson IS NOT NULL
    ) AND ${songs.jlpt_level} IN ('N5', 'N4') AND ${songs.language} = 'ja'
    AND ${songs.quality_status} = 'active'
    AND EXISTS (
      SELECT 1 FROM song_versions sv
      WHERE sv.song_id = ${songs.id} AND sv.pipeline_status = 'idle'
    )`)
    .orderBy(asc(songs.popularity_rank))
    .limit(limit);
}

/**
 * Get recently added songs.
 */
export async function getRecentSongs(limit: number = 10) {
  return db
    .select({
      id: songs.id,
      slug: songs.slug,
      title: songs.title,
      artist: songs.artist,
      anime: songs.anime,
      youtube_id: sql<string | null>`(
        SELECT sv.youtube_id FROM song_versions sv
        WHERE sv.song_id = songs.id AND sv.youtube_id IS NOT NULL
        ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
        LIMIT 1
      )`,
      jlpt_level: songs.jlpt_level,
      difficulty_tier: songs.difficulty_tier,
    })
    .from(songs)
    .where(sql`EXISTS (
      SELECT 1 FROM song_versions sv
      WHERE sv.song_id = ${songs.id} AND sv.lesson IS NOT NULL
    ) AND ${songs.language} = 'ja'
    AND ${songs.quality_status} = 'active'
    AND EXISTS (
      SELECT 1 FROM song_versions sv
      WHERE sv.song_id = ${songs.id} AND sv.pipeline_status = 'idle'
    )`)
    .orderBy(sql`${songs.created_at} desc`)
    .limit(limit);
}

// ---------------------------------------------------------------------------
// User song progress
// ---------------------------------------------------------------------------

/**
 * Get a user's progress for a single song version.
 * Returns the row with derived stars, or null if no progress yet.
 */
export async function getUserSongProgress(
  userId: string,
  songVersionId: string
) {
  const rows = await db
    .select()
    .from(userSongProgress)
    .where(
      sql`${userSongProgress.user_id} = ${userId} AND ${userSongProgress.song_version_id} = ${songVersionId}::uuid`
    )
    .limit(1);

  const row = rows[0] ?? null;
  if (!row) return null;

  // Phase 13 — resolve songHasGrammar for this specific version so Star 3
  // uses the grammar_best_accuracy gate when grammar exists.
  const [{ n: ruleCount } = { n: 0 }] = await db.execute<{ n: number }>(sql`
    SELECT COUNT(*)::int AS n
    FROM song_version_grammar_rules
    WHERE song_version_id = ${songVersionId}::uuid
  `).then((r) => (Array.isArray(r) ? r : (r.rows ?? [])));
  const songHasGrammar = Number(ruleCount ?? 0) > 0;

  return {
    ...row,
    stars: deriveStars(
      {
        ex1_2_3_best_accuracy: row.ex1_2_3_best_accuracy,
        ex4_best_accuracy: row.ex4_best_accuracy,
        ex6_best_accuracy: row.ex6_best_accuracy,
        grammar_best_accuracy: row.grammar_best_accuracy,
      },
      songHasGrammar
    ),
  };
}

export type UserSongProgressWithStars = NonNullable<
  Awaited<ReturnType<typeof getUserSongProgress>>
>;

/**
 * Get a user's progress for a batch of song versions.
 * Returns a Map<songVersionId, progress> using a single IN query.
 * Prevents N+1 queries on the browse page.
 *
 * TODO: wire into the browse page once Clerk auth lands — currently unused.
 */
export async function getUserSongProgressBatch(
  userId: string,
  songVersionIds: string[]
): Promise<Map<string, UserSongProgressWithStars>> {
  if (songVersionIds.length === 0) return new Map();

  const rows = await db
    .select()
    .from(userSongProgress)
    .where(
      sql`${userSongProgress.user_id} = ${userId} AND ${userSongProgress.song_version_id} = ANY(${sql.raw(`ARRAY[${songVersionIds.map((id) => `'${id}'`).join(",")}]::uuid[]`)})`
    );

  // Phase 13 — one round-trip to learn which song versions have grammar rules.
  const grammarRows = await db.execute<{ song_version_id: string }>(sql`
    SELECT DISTINCT song_version_id
    FROM song_version_grammar_rules
    WHERE song_version_id = ANY(${sql.raw(`ARRAY[${songVersionIds.map((id) => `'${id}'`).join(",")}]::uuid[]`)})
  `);
  const grammarRowsArr = Array.isArray(grammarRows)
    ? grammarRows
    : (grammarRows.rows ?? []);
  const grammarVersionSet = new Set<string>(
    grammarRowsArr.map((r) => r.song_version_id)
  );

  const result = new Map<string, UserSongProgressWithStars>();
  for (const row of rows) {
    const songHasGrammar = grammarVersionSet.has(row.song_version_id);
    result.set(row.song_version_id, {
      ...row,
      stars: deriveStars(
        {
          ex1_2_3_best_accuracy: row.ex1_2_3_best_accuracy,
          ex4_best_accuracy: row.ex4_best_accuracy,
          ex6_best_accuracy: row.ex6_best_accuracy,
          grammar_best_accuracy: row.grammar_best_accuracy,
        },
        songHasGrammar
      ),
    });
  }
  return result;
}

// =============================================================================
// Phase 11: Cross-Song Vocabulary — five read-only query functions
// =============================================================================

/**
 * Dashboard row shape for getVocabularyDashboard.
 *
 * Phase 11.6 Plan 11: dual-card per word — romaji_meaning and kanji_kana tracked
 * independently. The dashboard surfaces both indicators per word.
 *
 * Tier → romaji_state mapping (LOCKED — Path B, phase-local 3-bucket split):
 *   tierFilter 3 (Mastered)  → romaji_state = 2
 *   tierFilter 2 (Known)     → romaji_state = 3
 *   tierFilter 1 (Learning)  → romaji_state = 1
 *
 * Tier grouping uses romaji_meaning (the foundational track per SPEC R18).
 * kanji_state may diverge from romaji_state — this is expected and shown in the UI.
 *
 * DIVERGENCE NOTE: this mapping deliberately differs from src/lib/fsrs/tier.ts,
 * which collapses state=1 and state=3 into TIER_LEARNING (a 2-bucket post-new split).
 * The dashboard is the only surface where users distinguish "relearning" (state=3) from
 * "fresh learning" (state=1), so a richer 3-bucket split is warranted here.
 * tierFor() is NOT modified — the divergence is dashboard-local only.
 *
 * Backward-compat: `state` and `due` alias romaji_state/romaji_due so legacy code
 * (e.g. SeenInExpander, tier buckets) continues to work without changes.
 */
export interface DashboardRow {
  vocab_item_id: string;
  dictionary_form: string;
  reading: string;
  romaji: string;
  meaning: unknown;
  part_of_speech: string;
  jlpt_level: string | null;
  /** romaji_meaning FSRS state — drives tier grouping (SPEC R18). */
  romaji_state: 0 | 1 | 2 | 3;
  /** romaji_meaning due date. */
  romaji_due: Date;
  /** kanji_kana FSRS state — null if no kanji_kana card exists yet. */
  kanji_state: 0 | 1 | 2 | 3 | null;
  /** kanji_kana due date — null if no kanji_kana card exists yet. */
  kanji_due: Date | null;
  /** Alias for romaji_state — retained for backward compat (VocabularyList bucket split). */
  state: 0 | 1 | 2 | 3;
  /** Alias for romaji_due — retained for backward compat. */
  due: Date;
  last_review: Date | null;
  reps: number;
  source_song_count: number;
}

/**
 * Returns known-word counts for a specific song and user.
 *
 * Services: CROSS-01 (song-page vocabulary pill)
 *
 * "Known" = state IN (1, 2, 3) — Pitfall 1 in RESEARCH.md: tier 2+ maps to states 1,2,3
 * (NOT raw state >= 2). State 0 is "New/unseen", which is NOT known.
 *
 * DISTINCT on vocab_item_id in the CTE avoids double-counting songs that have both
 * tv and full versions in vocab_global — Pitfall 2 in RESEARCH.md.
 *
 * @param userId  Clerk user_id (text PK in users table)
 * @param songId  UUID of the song (songs.id, NOT song_versions.id)
 */
export async function getKnownWordCountForSong(
  userId: string,
  songId: string
): Promise<{ total: number; known: number; mastered: number; learning: number }> {
  const r = await db.execute<{
    total: number;
    known: number;
    mastered: number;
    learning: number;
  }>(sql`
    WITH song_vocab AS (
      SELECT DISTINCT vg.vocab_item_id
      FROM vocab_global vg
      WHERE vg.song_id = ${songId}::uuid
    )
    SELECT
      COUNT(*)::int                                                        AS total,
      COUNT(*) FILTER (WHERE m.state IN (1, 2, 3))::int                   AS known,
      COUNT(*) FILTER (WHERE m.state = 2)::int                            AS mastered,
      COUNT(*) FILTER (WHERE m.state IN (1, 3))::int                      AS learning
    FROM song_vocab s
    LEFT JOIN user_vocab_mastery m
      ON m.vocab_item_id = s.vocab_item_id
      AND m.user_id = ${userId}
  `);

  const rows = Array.isArray(r) ? r : (r.rows ?? []);
  const row = rows[0] as { total: number; known: number; mastered: number; learning: number } | undefined;
  return {
    total:    Number(row?.total    ?? 0),
    known:    Number(row?.known    ?? 0),
    mastered: Number(row?.mastered ?? 0),
    learning: Number(row?.learning ?? 0),
  };
}

/**
 * Returns the total count of vocabulary items a user has ever seen (state IN (1,2,3)).
 *
 * Services: CROSS-02 (global learned-word counter)
 *
 * No JOIN to vocab_global needed — mastery rows are already keyed by vocab_item_id.
 * "Known" = state IN (1,2,3) — Pitfall 1: NOT state >= 2.
 *
 * @param userId  Clerk user_id
 */
export async function getGlobalLearnedCount(userId: string): Promise<number> {
  const r = await db.execute<{ count: number }>(sql`
    SELECT COUNT(*)::int AS count
    FROM user_vocab_mastery
    WHERE user_id = ${userId}
      AND state IN (1, 2, 3)
  `);

  const raw = Array.isArray(r) ? r : (r.rows ?? []);
  return Number((raw[0] as { count: number } | undefined)?.count ?? 0);
}

/**
 * Returns all songs where a specific vocabulary item appears.
 *
 * Services: CROSS-03 (seen-in-songs for vocabulary feedback)
 *
 * DISTINCT is mandatory: vocab_global has one row per (vocab_item_id, song_id, version_type),
 * so a song with both tv+full versions would appear twice without DISTINCT — Pitfall 2.
 *
 * @param vocabItemId  UUID of the vocabulary item (vocabulary_items.id)
 */
export async function getSeenInSongsForVocab(
  vocabItemId: string
): Promise<Array<{ slug: string; title: string; anime: string }>> {
  const r = await db.execute<{ slug: string; title: string; anime: string }>(sql`
    SELECT DISTINCT s.slug, s.title, s.anime
    FROM vocab_global vg
    JOIN songs s ON s.id = vg.song_id
    WHERE vg.vocab_item_id = ${vocabItemId}::uuid
    ORDER BY s.title ASC
  `);

  const rows = Array.isArray(r) ? r : (r.rows ?? []);
  return rows as Array<{ slug: string; title: string; anime: string }>;
}

/**
 * Returns the user's vocabulary dashboard rows with optional filtering.
 *
 * Services: CROSS-04 (vocabulary dashboard)
 *
 * Phase 11.6 Plan 11 rewrite — GROUP BY vocab_item_id with CASE aggregation per
 * card_kind. Each row now carries romaji_state/romaji_due (romaji_meaning card) and
 * kanji_state/kanji_due (kanji_kana card, null if no mastery row exists yet).
 *
 * Tier → romaji_state mapping (LOCKED — Path B, phase-local 3-bucket split):
 *   tierFilter 3 (Mastered)  → HAVING romaji_state = 2
 *   tierFilter 2 (Known)     → HAVING romaji_state = 3
 *   tierFilter 1 (Learning)  → HAVING romaji_state = 1
 *   omitted                  → no HAVING clause
 *
 * DIVERGENCE: This mapping diverges from src/lib/fsrs/tier.ts (collapses 1+3 to
 * TIER_LEARNING). The dashboard uses this richer split. tierFor() is unchanged.
 *
 * Base WHERE includes vocab items where the user has a romaji_meaning card with
 * state IN (1,2,3). New (state=0) romaji cards are excluded — users should only see
 * words they have actively started. Words without any romaji_meaning card are excluded.
 *
 * ORDER BY: romaji_due (the foundational track per SPEC R18) per sortDirection.
 * Rows with no romaji due date land NULLS LAST.
 *
 * source_song_count: number of distinct songs the word appears in — used for
 * the expandable "Seen in N songs" chip.
 *
 * @param userId  Clerk user_id
 * @param opts    Optional filters: tierFilter, sourceSongId, limit, sortDirection
 */
export async function getVocabularyDashboard(
  userId: string,
  opts: {
    tierFilter?: 1 | 2 | 3;
    sourceSongId?: string;
    limit?: number;
    sortDirection?: "asc" | "desc";
  } = {}
): Promise<DashboardRow[]> {
  const orderDir = opts.sortDirection === "asc" ? sql`ASC` : sql`DESC`;

  // Phase-local tier → romaji_state mapping (Path B, 3-bucket split). See JSDoc above.
  // The HAVING clause filters on the aggregated romaji_meaning state.
  let tierStateValue: number | null = null;
  if (opts.tierFilter === 3) tierStateValue = 2;
  else if (opts.tierFilter === 2) tierStateValue = 3;
  else if (opts.tierFilter === 1) tierStateValue = 1;

  const tierHaving = tierStateValue !== null
    ? sql`HAVING MAX(CASE WHEN m.card_kind = 'romaji_meaning' THEN m.state END) = ${tierStateValue}`
    : sql``;

  const sourceSongClause = opts.sourceSongId
    ? sql`AND vi.id IN (SELECT vg2.vocab_item_id FROM vocab_global vg2 WHERE vg2.song_id = ${opts.sourceSongId}::uuid)`
    : sql``;

  const limitClause = opts.limit != null ? sql` LIMIT ${opts.limit}` : sql``;

  const r = await db.execute<{
    vocab_item_id: string;
    dictionary_form: string;
    reading: string;
    romaji: string;
    meaning: unknown;
    part_of_speech: string;
    jlpt_level: string | null;
    romaji_state: number | null;
    romaji_due: string | null;
    kanji_state: number | null;
    kanji_due: string | null;
    last_review: string | null;
    reps: number;
    source_song_count: number;
  }>(sql`
    SELECT
      vi.id::text AS vocab_item_id,
      vi.dictionary_form,
      vi.reading,
      vi.romaji,
      vi.meaning,
      vi.part_of_speech,
      vi.jlpt_level::text,
      MAX(CASE WHEN m.card_kind = 'romaji_meaning' THEN m.state END)       AS romaji_state,
      MAX(CASE WHEN m.card_kind = 'romaji_meaning' THEN m.due::text END)   AS romaji_due,
      MAX(CASE WHEN m.card_kind = 'kanji_kana' THEN m.state END)           AS kanji_state,
      MAX(CASE WHEN m.card_kind = 'kanji_kana' THEN m.due::text END)       AS kanji_due,
      MAX(CASE WHEN m.card_kind = 'romaji_meaning' THEN m.last_review::text END) AS last_review,
      COALESCE(MAX(CASE WHEN m.card_kind = 'romaji_meaning' THEN m.reps END), 0) AS reps,
      (
        SELECT COUNT(DISTINCT vg.song_id)::int
        FROM vocab_global vg
        WHERE vg.vocab_item_id = vi.id
      ) AS source_song_count
    FROM vocabulary_items vi
    JOIN user_vocab_mastery m
      ON m.vocab_item_id = vi.id
      AND m.user_id = ${userId}
    WHERE vi.id IN (
      SELECT DISTINCT m2.vocab_item_id
      FROM user_vocab_mastery m2
      WHERE m2.user_id = ${userId}
        AND m2.card_kind = 'romaji_meaning'
        AND m2.state IN (1, 2, 3)
    )
    ${sourceSongClause}
    GROUP BY vi.id, vi.dictionary_form, vi.reading, vi.romaji, vi.meaning,
             vi.part_of_speech, vi.jlpt_level
    ${tierHaving}
    ORDER BY MAX(CASE WHEN m.card_kind = 'romaji_meaning' THEN m.due END) ${orderDir} NULLS LAST
    ${limitClause}
  `);

  const rows = Array.isArray(r) ? r : (r.rows ?? []);
  return (rows as Array<{
    vocab_item_id: string;
    dictionary_form: string;
    reading: string;
    romaji: string;
    meaning: unknown;
    part_of_speech: string;
    jlpt_level: string | null;
    romaji_state: number | null;
    romaji_due: string | null;
    kanji_state: number | null;
    kanji_due: string | null;
    last_review: string | null;
    reps: number;
    source_song_count: number;
  }>).map((row) => {
    const romajiState = (row.romaji_state ?? 1) as 0 | 1 | 2 | 3;
    const romajiDue = row.romaji_due ? new Date(row.romaji_due) : new Date();
    return {
      vocab_item_id: row.vocab_item_id,
      dictionary_form: row.dictionary_form,
      reading: row.reading,
      romaji: row.romaji,
      meaning: row.meaning,
      part_of_speech: row.part_of_speech,
      jlpt_level: row.jlpt_level,
      romaji_state: romajiState,
      romaji_due: romajiDue,
      kanji_state: row.kanji_state !== null ? (row.kanji_state as 0 | 1 | 2 | 3) : null,
      kanji_due: row.kanji_due ? new Date(row.kanji_due) : null,
      // Backward-compat aliases so existing VocabularyList bucket logic still works.
      state: romajiState,
      due: romajiDue,
      last_review: row.last_review ? new Date(row.last_review) : null,
      reps: Number(row.reps),
      source_song_count: Number(row.source_song_count),
    };
  });
}

/**
 * Returns the due review queue split into due cards and new cards.
 *
 * Services: CROSS-05 (/review queue)
 *
 * Two separate db.execute calls — neon-http has no callback transactions
 * (Pitfall 4 in RESEARCH.md); sequential is correct and safe for reads.
 *
 * Due query: uncapped — all cards with due <= now and state IN (1,2,3).
 * New query: bounded by newCardCap — vocab_global items with no mastery row yet.
 * "Known" guard uses state IN (1,2,3) — Pitfall 1: NOT state >= 2.
 *
 * @param userId      Clerk user_id
 * @param newCardCap  Max new cards to return (Plan 05 computes REVIEW_NEW_DAILY_CAP minus already-consumed)
 * @param now         Timestamp for due comparison (default: current time; injectable for testing)
 */
export async function getDueReviewQueue(
  userId: string,
  newCardCap: number,
  now: Date = new Date()
): Promise<{
  due: Array<{ vocab_item_id: string; state: 0 | 1 | 2 | 3; due: Date; card_kind: "romaji_meaning" | "kanji_kana" }>;
  new: Array<{ vocab_item_id: string }>;
}> {
  // Query 1: due cards (uncapped)
  // Phase 11.6: SELECT now includes card_kind so queue-builder can route kanji_kana → vocab_typed.
  const dueR = await db.execute<{ vocab_item_id: string; state: number; due: string; card_kind: string }>(sql`
    SELECT m.vocab_item_id::text, m.state, m.due, m.card_kind
    FROM user_vocab_mastery m
    WHERE m.user_id = ${userId}
      AND m.state IN (1, 2, 3)
      AND m.due <= ${now.toISOString()}::timestamptz
    ORDER BY m.due ASC
  `);

  const dueRows = (Array.isArray(dueR) ? dueR : (dueR.rows ?? [])) as Array<{
    vocab_item_id: string;
    state: number;
    due: string;
    card_kind: string;
  }>;

  // Query 2: new cards (bounded by newCardCap)
  const newR = await db.execute<{ vocab_item_id: string }>(sql`
    SELECT DISTINCT vg.vocab_item_id::text
    FROM vocab_global vg
    WHERE NOT EXISTS (
      SELECT 1
      FROM user_vocab_mastery m
      WHERE m.user_id = ${userId}
        AND m.vocab_item_id = vg.vocab_item_id
    )
    ORDER BY vg.vocab_item_id
    LIMIT ${newCardCap}
  `);

  const newRows = (Array.isArray(newR) ? newR : (newR.rows ?? [])) as Array<{
    vocab_item_id: string;
  }>;

  return {
    due: dueRows.map((row) => ({
      vocab_item_id: row.vocab_item_id,
      state: row.state as 0 | 1 | 2 | 3,
      due: new Date(row.due),
      // Phase 11.6: card_kind propagated from DB; default romaji_meaning for safety
      card_kind: (row.card_kind === "kanji_kana" ? "kanji_kana" : "romaji_meaning") as "romaji_meaning" | "kanji_kana",
    })),
    new: newRows.map((row) => ({ vocab_item_id: row.vocab_item_id })),
  };
}

// ---------------------------------------------------------------------------
// Daily new-card budget
// ---------------------------------------------------------------------------

/**
 * Read the user's remaining daily new-card budget without modifying it.
 *
 * If the stored date is not today (UTC), the counter has rolled over and the
 * full REVIEW_NEW_DAILY_CAP is available.
 */
export async function getNewCardBudget(userId: string): Promise<number> {
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const rows = await db.execute<{
    review_new_today: number;
    review_new_today_date: string | null;
  }>(sql`
    SELECT review_new_today, review_new_today_date::text AS review_new_today_date
    FROM users WHERE id = ${userId}
  `);
  const raw = Array.isArray(rows) ? rows : (rows.rows ?? []);
  const row = raw[0];
  if (!row || row.review_new_today_date !== today) return REVIEW_NEW_DAILY_CAP;
  return Math.max(0, REVIEW_NEW_DAILY_CAP - Number(row.review_new_today));
}

// =============================================================================
// Phase 12 Plan 05: JLPT Gap + Gamification State
// =============================================================================

/**
 * Shape of one JLPT tier row returned by getJlptGapSummary.
 * total_count    — all vocabulary_items rows with this jlpt_level
 * mastered_count — rows where user_vocab_mastery.state = 2 for this user
 * known_count    — rows where state IN (1, 2, 3) for this user
 */
export interface JlptGapRow {
  jlpt_level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  total_count: number;
  mastered_count: number;
  known_count: number;
}

/**
 * Returns per-JLPT-tier mastery aggregates for the vocabulary gap panel.
 *
 * Ordered N5 → N1. If a tier has no vocabulary_items seeded it is omitted;
 * JlptGapSummary.tsx will render a "catalog data not yet seeded" row for any
 * missing tier.
 *
 * Live-derived: reads user_vocab_mastery JOIN vocabulary_items — NO new table.
 * Parallel taxonomy preserved: jlpt_level on vocabulary_items is untouched.
 */
export async function getJlptGapSummary(userId: string): Promise<JlptGapRow[]> {
  // Ensure the users row exists so LEFT JOINs work correctly for brand-new users.
  await db
    .insert(users)
    .values({ id: userId })
    .onConflictDoNothing({ target: users.id });

  const r = await db.execute<{
    jlpt_level: string;
    total_count: number;
    mastered_count: number;
    known_count: number;
  }>(sql`
    SELECT
      vi.jlpt_level::text                                              AS jlpt_level,
      COUNT(*)::int                                                    AS total_count,
      COUNT(*) FILTER (WHERE m.state = 2)::int                        AS mastered_count,
      COUNT(*) FILTER (WHERE m.state IN (1, 2, 3))::int               AS known_count
    FROM vocabulary_items vi
    LEFT JOIN user_vocab_mastery m
      ON m.vocab_item_id = vi.id AND m.user_id = ${userId}
    WHERE vi.jlpt_level IS NOT NULL
    GROUP BY vi.jlpt_level
    ORDER BY CASE vi.jlpt_level::text
      WHEN 'N5' THEN 1
      WHEN 'N4' THEN 2
      WHEN 'N3' THEN 3
      WHEN 'N2' THEN 4
      WHEN 'N1' THEN 5
    END ASC
  `);

  const rows = Array.isArray(r) ? r : (r.rows ?? []);
  return (rows as Array<{
    jlpt_level: string;
    total_count: number;
    mastered_count: number;
    known_count: number;
  }>).map((row) => ({
    jlpt_level: row.jlpt_level as JlptGapRow['jlpt_level'],
    total_count: Number(row.total_count),
    mastered_count: Number(row.mastered_count),
    known_count: Number(row.known_count),
  }));
}

/**
 * Full gamification state for the ProfileHud component.
 *
 * Fetches the user row (upsert-seeding defaults if missing) + LEFT JOINs to
 * user_cosmetics + reward_slot_definitions for equipped border + theme.
 *
 * equipped_border / equipped_theme are nullable — if the user has no
 * equipped cosmetic of that type, null is returned and the HUD renders the
 * default ring-2 ring-muted fallback.
 */
export interface GamificationState {
  xp_total: number;
  level: number;
  streak_current: number;
  streak_best: number;
  last_streak_date: string | null;
  sound_enabled: boolean;
  haptics_enabled: boolean;
  current_path_node_slug: string | null;
  equipped_border: { css_class: string; label: string } | null;
  equipped_theme: { css_vars: Record<string, string>; label: string } | null;
}

/**
 * Returns the user's full gamification state for HUD rendering.
 *
 * Cosmetic aggregation: fetches all equipped rows and partitions them by
 * slot_type in JS — avoids two separate subqueries and handles the case where
 * a user has no cosmetics at all (LEFT JOIN → null columns).
 */
export async function getUserGamificationState(userId: string): Promise<GamificationState> {
  // Ensure row exists (upsert-seed pattern used throughout the app).
  await db
    .insert(users)
    .values({ id: userId })
    .onConflictDoNothing({ target: users.id });

  // Fetch user row + all equipped cosmetic rows in one query.
  const r = await db.execute<{
    xp_total: number;
    level: number;
    streak_current: number;
    streak_best: number;
    last_streak_date: string | null;
    sound_enabled: boolean;
    haptics_enabled: boolean;
    current_path_node_slug: string | null;
    slot_type: string | null;
    slot_content: unknown;
  }>(sql`
    SELECT
      u.xp_total,
      u.level,
      u.streak_current,
      u.streak_best,
      u.last_streak_date::text AS last_streak_date,
      u.sound_enabled,
      u.haptics_enabled,
      u.current_path_node_slug,
      rsd.slot_type,
      rsd.content AS slot_content
    FROM users u
    LEFT JOIN user_cosmetics uc ON uc.user_id = u.id AND uc.equipped = true
    LEFT JOIN reward_slot_definitions rsd ON rsd.id = uc.slot_id AND rsd.active = true
    WHERE u.id = ${userId}
  `);

  const rows = Array.isArray(r) ? r : (r.rows ?? []);

  // All rows share the same user columns — use the first row as the base.
  const base = rows[0] as {
    xp_total: number;
    level: number;
    streak_current: number;
    streak_best: number;
    last_streak_date: string | null;
    sound_enabled: boolean;
    haptics_enabled: boolean;
    current_path_node_slug: string | null;
    slot_type: string | null;
    slot_content: unknown;
  } | undefined;

  // Defensive: should never happen after the upsert, but guard anyway.
  if (!base) {
    return {
      xp_total: 0,
      level: 1,
      streak_current: 0,
      streak_best: 0,
      last_streak_date: null,
      sound_enabled: true,
      haptics_enabled: true,
      current_path_node_slug: null,
      equipped_border: null,
      equipped_theme: null,
    };
  }

  // Partition equipped cosmetics by slot_type.
  let equipped_border: GamificationState['equipped_border'] = null;
  let equipped_theme: GamificationState['equipped_theme'] = null;

  for (const row of rows) {
    const typedRow = row as typeof base;
    if (!typedRow.slot_type || !typedRow.slot_content) continue;

    const content = typedRow.slot_content as Record<string, unknown>;
    if (typedRow.slot_type === 'avatar_border' && typeof content.css_class === 'string') {
      equipped_border = {
        css_class: content.css_class,
        label: typeof content.label === 'string' ? content.label : '',
      };
    } else if (typedRow.slot_type === 'color_theme' && content.css_vars && typeof content.css_vars === 'object') {
      equipped_theme = {
        css_vars: content.css_vars as Record<string, string>,
        label: typeof content.label === 'string' ? content.label : '',
      };
    }
  }

  return {
    xp_total: Number(base.xp_total),
    level: Number(base.level),
    streak_current: Number(base.streak_current),
    streak_best: Number(base.streak_best),
    last_streak_date: base.last_streak_date ?? null,
    sound_enabled: Boolean(base.sound_enabled),
    haptics_enabled: Boolean(base.haptics_enabled),
    current_path_node_slug: base.current_path_node_slug ?? null,
    equipped_border,
    equipped_theme,
  };
}

// ---------------------------------------------------------------------------
// Phase 11.6 SPEC-REQ-14 — verse-domination read helpers
// ---------------------------------------------------------------------------

/**
 * Returns the list of verse numbers a (user, song_version) pair has
 * dominated. Used by the song page SSR to render the static gold star next
 * to dominated verses in the lyrics view (D-14) and the X/Y verses counter
 * in the header (D-16).
 *
 * Order is unspecified — the caller checks membership via array .includes
 * (or builds a Set). Empty array for users with no domination rows on the
 * version OR for the placeholder/anonymous user_id.
 *
 * Phase 11.6-05 owns the writer (recordVocabAnswer's INSERT ON CONFLICT DO
 * NOTHING RETURNING). This reader is the SSR consumer.
 */
export async function getDominatedVerses(
  userId: string,
  songVersionId: string
): Promise<number[]> {
  const rows = await db
    .select({ verse_number: userVerseDomination.verse_number })
    .from(userVerseDomination)
    .where(
      and(
        eq(userVerseDomination.user_id, userId),
        eq(userVerseDomination.song_version_id, songVersionId)
      )
    );
  return rows.map((r) => r.verse_number);
}

// =============================================================================
// Phase 14.4: Virality & Engagement queries
// =============================================================================

/**
 * REQ-1: Home "X listening now" chip.
 * Returns Map<song_id, distinct_play_count> for songs with >=3 distinct listeners in last 30 min.
 * Anonymous plays (null user_id) counted. Authenticated plays filtered to opt-in users.
 * Cached 60s per CONTEXT D-10.
 */
export const getNowPlayingCounts = unstable_cache(
  async (): Promise<Map<string, number>> => {
    const rows = await db.execute(sql`
      SELECT sv.song_id::text AS song_id,
             COUNT(DISTINCT COALESCE(sp.user_id, sp.session_key)) AS listener_count
      FROM song_plays sp
      JOIN song_versions sv ON sv.id = sp.song_version_id
      LEFT JOIN users u ON u.id = sp.user_id
      WHERE sp.played_at >= now() - interval '30 minutes'
        AND (sp.user_id IS NULL OR u.social_activity_enabled = true)
      GROUP BY sv.song_id
      HAVING COUNT(DISTINCT COALESCE(sp.user_id, sp.session_key)) >= 3
    `);
    const rawRows = Array.isArray(rows) ? rows : ((rows as { rows?: unknown[] }).rows ?? []);
    return new Map(
      (rawRows as Array<{ song_id: string; listener_count: string | number }>).map((r) => [
        r.song_id,
        Number(r.listener_count),
      ])
    );
  },
  ["now-playing-counts"],
  { revalidate: 60 }
);

/**
 * REQ-2: Recently-mastered ticker.
 * Last N song-mastered events from opt-in users. No cache (freshness required).
 * D-09: first-name fetched separately via getTickerFirstName (unstable_cache 1h).
 */
export async function getRecentMasteryEvents(limit = 10) {
  return await db
    .select({
      id: activityEvents.id,
      user_id: activityEvents.user_id,
      song_id: activityEvents.song_id,
      created_at: activityEvents.created_at,
      song_title: songs.title,
      song_slug: songs.slug,
    })
    .from(activityEvents)
    .innerJoin(users, eq(activityEvents.user_id, users.id))
    .innerJoin(songs, eq(activityEvents.song_id, songs.id))
    .where(eq(users.social_activity_enabled, true))
    .orderBy(desc(activityEvents.created_at))
    .limit(limit);
}

/**
 * D-09: Ticker first-name — cached 1h per user. Fallback "Someone" when null.
 * RESEARCH Pitfall 4: userId MUST be in keyParts for per-user cache isolation.
 */
export const getTickerFirstName = (userId: string) =>
  unstable_cache(
    async () => {
      const { clerkClient } = await import("@clerk/nextjs/server");
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      return user.firstName ?? "Someone";
    },
    ["ticker-firstname", userId],
    { revalidate: 3600 }
  )();

/**
 * REQ-4: Cron daily-reminder user query.
 * Returns users eligible for the 19:00 local-time streak reminder.
 * Timezone-aware: EXTRACT(HOUR FROM now() AT TIME ZONE streak_tz) = 19
 */
export async function getActiveOptInUsersForDailyReminder() {
  const rows = await db.execute(sql`
    SELECT id, streak_current, last_streak_date::text AS last_streak_date, streak_tz
    FROM users
    WHERE social_activity_enabled = true
      AND streak_current > 0
      AND (last_streak_date IS NULL
           OR last_streak_date < (now() AT TIME ZONE COALESCE(streak_tz, 'UTC'))::date)
      AND EXTRACT(HOUR FROM (now() AT TIME ZONE COALESCE(streak_tz, 'UTC'))) = 19
  `);
  const rawRows = Array.isArray(rows) ? rows : ((rows as { rows?: unknown[] }).rows ?? []);
  return rawRows as Array<{
    id: string;
    streak_current: number;
    last_streak_date: string | null;
    streak_tz: string | null;
  }>;
}

/**
 * REQ-5: Cron weekly-recap user query.
 * Returns all opt-in users with streak + path context for recap rendering.
 */
export async function getActiveOptInUsersForWeeklyRecap() {
  return await db
    .select({
      id: users.id,
      streakCurrent: users.streakCurrent,
      streakBest: users.streakBest,
      currentPathNodeSlug: users.currentPathNodeSlug,
    })
    .from(users)
    .where(eq(users.social_activity_enabled, true));
}

