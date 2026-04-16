import { eq, sql, asc, inArray } from "drizzle-orm";
import { db } from "./index";
import {
  songs,
  songVersions,
  vocabGlobal,
  userSongProgress,
  deriveStars,
  type SongVersion,
} from "./schema";

// ---------------------------------------------------------------------------
// Song detail page
// ---------------------------------------------------------------------------

/**
 * Get a single song by slug, including all its versions (tv, full).
 */
export async function getSongBySlug(slug: string) {
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

export type SongWithVersions = NonNullable<Awaited<ReturnType<typeof getSongBySlug>>>;

// ---------------------------------------------------------------------------
// Browse / list pages
// ---------------------------------------------------------------------------

/**
 * Get all songs with metadata for the browse page.
 * Includes the preferred youtube_id (tv > full) for thumbnails.
 */
export async function getAllSongs() {
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
    })
    .from(songs)
    .where(sql`EXISTS (
      SELECT 1 FROM song_versions sv
      WHERE sv.song_id = ${songs.id} AND sv.lesson IS NOT NULL
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
    )`)
    .orderBy(asc(songs.popularity_rank))
    .limit(limit);
}

export type FeaturedSong = Awaited<ReturnType<typeof getFeaturedSongs>>[number];

/**
 * Get anime names with song counts for the "Browse by Anime" section.
 */
export async function getTopAnime(limit: number = 8) {
  return db
    .select({
      anime: songs.anime,
      count: sql<number>`count(*)::int`,
      youtube_id: sql<string | null>`(array_agg(
        (SELECT sv.youtube_id FROM song_versions sv
         WHERE sv.song_id = songs.id AND sv.version_type = 'tv' AND sv.youtube_id IS NOT NULL
         LIMIT 1)
        ORDER BY songs.popularity_rank ASC NULLS LAST
      ) FILTER (WHERE EXISTS (
        SELECT 1 FROM song_versions sv
        WHERE sv.song_id = songs.id AND sv.version_type = 'tv' AND sv.youtube_id IS NOT NULL
      )))[1]`,
    })
    .from(songs)
    .where(sql`EXISTS (
      SELECT 1 FROM song_versions sv
      WHERE sv.song_id = ${songs.id} AND sv.lesson IS NOT NULL
    )`)
    .groupBy(songs.anime)
    .orderBy(sql`count(*) desc`)
    .limit(limit);
}

export type AnimeGroup = Awaited<ReturnType<typeof getTopAnime>>[number];

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
         WHERE sv.song_id = songs.id AND sv.version_type = 'tv' AND sv.youtube_id IS NOT NULL
         LIMIT 1)
        ORDER BY songs.popularity_rank ASC NULLS LAST
      ) FILTER (WHERE EXISTS (
        SELECT 1 FROM song_versions sv
        WHERE sv.song_id = songs.id AND sv.version_type = 'tv' AND sv.youtube_id IS NOT NULL
      )))[1]`,
    })
    .from(songs)
    .where(sql`EXISTS (
      SELECT 1 FROM song_versions sv
      WHERE sv.song_id = ${songs.id} AND sv.lesson IS NOT NULL
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

export type AnimeFranchise = Awaited<ReturnType<typeof getTopAnimeFranchises>>[number];

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
    )`)
    .groupBy(songs.artist)
    .orderBy(sql`count(*) desc`)
    .limit(limit);
}

export type ArtistGroup = Awaited<ReturnType<typeof getTopArtists>>[number];

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
    ) AND ${songs.jlpt_level} IN ('N5', 'N4')`)
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

  return {
    ...row,
    stars: deriveStars({
      ex1_2_3_best_accuracy: row.ex1_2_3_best_accuracy,
      ex4_best_accuracy: row.ex4_best_accuracy,
    }),
  };
}

export type UserSongProgressWithStars = NonNullable<
  Awaited<ReturnType<typeof getUserSongProgress>>
>;

/**
 * Get a user's progress for a batch of song versions.
 * Returns a Map<songVersionId, progress> using a single IN query.
 * Prevents N+1 queries on the browse page (Phase 8 Research Pitfall 6).
 *
 * TODO: call this when Clerk auth is integrated — fetch user progress batch when Clerk auth is integrated
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

  const result = new Map<string, UserSongProgressWithStars>();
  for (const row of rows) {
    result.set(row.song_version_id, {
      ...row,
      stars: deriveStars({
        ex1_2_3_best_accuracy: row.ex1_2_3_best_accuracy,
        ex4_best_accuracy: row.ex4_best_accuracy,
      }),
    });
  }
  return result;
}

/**
 * Get classic/most popular songs.
 */
export async function getClassicSongs(limit: number = 10) {
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
    ) AND ${songs.popularity_rank} IS NOT NULL`)
    .orderBy(asc(songs.popularity_rank))
    .limit(limit);
}
