/**
 * 13-fetch-anime-metadata.ts — Populate anime_metadata rows from AniList GraphQL.
 *
 * Idempotent: rows already present are skipped. Rate-limited to AniList's 90
 * req/min cap. Stores bannerImage (landscape, ideal for carousel cards) and
 * coverImage.extraLarge (portrait fallback).
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/13-fetch-anime-metadata.ts
 *   (requires DATABASE_URL in .env.local)
 *
 * Flags:
 *   --refresh   Re-fetch entries older than 30 days (default: skip all existing)
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";
import { songs, animeMetadata } from "../../src/lib/db/schema.js";

const ANILIST_URL = "https://graphql.anilist.co";
const RATE_LIMIT_MS = 700; // AniList allows ~90/min; 700ms/req = ~85/min, leaves headroom.

const QUERY = `
query ($search: String) {
  Media(search: $search, type: ANIME) {
    id
    title { english native romaji }
    bannerImage
    coverImage { extraLarge large }
    startDate { year }
    genres
    tags { name rank isMediaSpoiler }
    description(asHtml: false)
    season
    seasonYear
    averageScore
    popularity
  }
}
`;

type AniListMedia = {
  id: number;
  title: { english: string | null; native: string | null; romaji: string | null };
  bannerImage: string | null;
  coverImage: { extraLarge: string | null; large: string | null };
  startDate: { year: number | null } | null;
  genres: string[] | null;
  tags: Array<{ name: string; rank: number; isMediaSpoiler: boolean }> | null;
  description: string | null;
  season: string | null;
  seasonYear: number | null;
  averageScore: number | null;
  popularity: number | null;
};

async function fetchAnime(search: string): Promise<AniListMedia | null> {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { search } }),
  });

  if (res.status === 429) {
    const retry = Number(res.headers.get("Retry-After") ?? "60");
    console.warn(`  [rate-limited] waiting ${retry}s`);
    await new Promise((r) => setTimeout(r, retry * 1000));
    return fetchAnime(search);
  }

  if (!res.ok) {
    console.warn(`  [http ${res.status}] ${search}`);
    return null;
  }

  const data = (await res.json()) as { data?: { Media?: AniListMedia | null } };
  return data.data?.Media ?? null;
}

async function main() {
  const refresh = process.argv.includes("--refresh");
  const db = getDb();

  const distinctAnime = await db
    .selectDistinct({ anime: songs.anime })
    .from(songs);

  const existing = new Set(
    (await db.select({ anime: animeMetadata.anime }).from(animeMetadata)).map(
      (r) => r.anime,
    ),
  );

  const todo = distinctAnime
    .map((r) => r.anime)
    .filter((a) => refresh || !existing.has(a));

  console.log(
    `${distinctAnime.length} distinct anime titles, ${existing.size} already cached, ${todo.length} to fetch`,
  );

  let ok = 0;
  let miss = 0;
  for (let i = 0; i < todo.length; i++) {
    const anime = todo[i];
    process.stdout.write(`[${i + 1}/${todo.length}] ${anime} ... `);

    const media = await fetchAnime(anime);
    if (!media) {
      console.log("NOT FOUND");
      miss++;
    } else {
      const topTags = (media.tags ?? [])
        .filter((t) => !t.isMediaSpoiler && t.rank >= 60)
        .sort((a, b) => b.rank - a.rank)
        .slice(0, 10)
        .map((t) => t.name);

      const values = {
        anime,
        anilist_id: media.id,
        title_english: media.title.english ?? media.title.romaji,
        title_native: media.title.native,
        banner_image: media.bannerImage,
        cover_image: media.coverImage.extraLarge ?? media.coverImage.large,
        start_year: media.startDate?.year ?? null,
        genres: media.genres ?? [],
        tags: topTags,
        description: media.description,
        season: media.season,
        season_year: media.seasonYear,
        average_score: media.averageScore,
        popularity: media.popularity,
        fetched_at: new Date(),
      };

      await db
        .insert(animeMetadata)
        .values(values)
        .onConflictDoUpdate({
          target: animeMetadata.anime,
          set: values,
        });
      console.log(
        `ok (banner=${media.bannerImage ? "Y" : "n"} cover=${media.coverImage.extraLarge ? "Y" : "n"})`,
      );
      ok++;
    }

    if (i < todo.length - 1) await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
  }

  const withBanner = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(animeMetadata)
    .where(sql`${animeMetadata.banner_image} IS NOT NULL`);

  console.log(
    `\nDone: ${ok} fetched, ${miss} not found. Total rows with banner: ${withBanner[0].n}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
