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
  }
}
`;

type AniListMedia = {
  id: number;
  title: { english: string | null; native: string | null; romaji: string | null };
  bannerImage: string | null;
  coverImage: { extraLarge: string | null; large: string | null };
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
      await db
        .insert(animeMetadata)
        .values({
          anime,
          anilist_id: media.id,
          title_english: media.title.english ?? media.title.romaji,
          title_native: media.title.native,
          banner_image: media.bannerImage,
          cover_image: media.coverImage.extraLarge ?? media.coverImage.large,
          fetched_at: new Date(),
        })
        .onConflictDoUpdate({
          target: animeMetadata.anime,
          set: {
            anilist_id: media.id,
            title_english: media.title.english ?? media.title.romaji,
            title_native: media.title.native,
            banner_image: media.bannerImage,
            cover_image: media.coverImage.extraLarge ?? media.coverImage.large,
            fetched_at: new Date(),
          },
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
