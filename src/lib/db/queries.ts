import { eq, sql, asc } from "drizzle-orm";
import { db } from "./index";
import { songs } from "./schema";

/**
 * Get all songs with metadata for the browse page.
 * Excludes lesson/timing JSONB to keep payload small.
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
      youtube_id: songs.youtube_id,
      youtube_id_short: songs.youtube_id_short,
      year_launched: songs.year_launched,
      jlpt_level: songs.jlpt_level,
      difficulty_tier: songs.difficulty_tier,
      genre_tags: songs.genre_tags,
      mood_tags: songs.mood_tags,
    })
    .from(songs)
    .where(sql`${songs.lesson} is not null`)
    .orderBy(asc(songs.popularity_rank));
}

export type SongListItem = Awaited<ReturnType<typeof getAllSongs>>[number];

/**
 * Get a single song by slug, including full lesson JSONB.
 */
export async function getSongBySlug(slug: string) {
  const rows = await db
    .select()
    .from(songs)
    .where(eq(songs.slug, slug))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Get featured songs for the home page.
 * Picks songs that have lessons, ordered by difficulty for variety.
 */
export async function getFeaturedSongs(limit: number = 6) {
  return db
    .select({
      id: songs.id,
      slug: songs.slug,
      title: songs.title,
      artist: songs.artist,
      anime: songs.anime,
      youtube_id: songs.youtube_id,
      jlpt_level: songs.jlpt_level,
      difficulty_tier: songs.difficulty_tier,
    })
    .from(songs)
    .where(sql`${songs.lesson} is not null`)
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
      youtube_id: sql<string | null>`min(${songs.youtube_id})`,
    })
    .from(songs)
    .where(sql`${songs.lesson} is not null`)
    .groupBy(songs.anime)
    .orderBy(sql`count(*) desc`)
    .limit(limit);
}

export type AnimeGroup = Awaited<ReturnType<typeof getTopAnime>>[number];
