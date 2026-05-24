/**
 * scripts/seed/21-seed-new-anime-metadata.ts
 *
 * Fetches AniList metadata for anime that are in the vocab catalog but NOT in
 * the songs table (so script 13 would skip them). Idempotent — rows already
 * present are skipped unless --refresh is passed.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/21-seed-new-anime-metadata.ts
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/21-seed-new-anime-metadata.ts --refresh
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb } from "../../src/lib/db/index.js";
import { animeMetadata } from "../../src/lib/db/schema.js";
import { eq } from "drizzle-orm";

const ANILIST_URL = "https://graphql.anilist.co";
const RATE_LIMIT_MS = 700;

// Slug → { storeName (animeMetadata.anime key), anilistSearch }
const NEW_ANIME: Array<{ slug: string; storeName: string; anilistSearch: string }> = [
  { slug: "demon-slayer",     storeName: "Demon Slayer",     anilistSearch: "Kimetsu no Yaiba" },
  { slug: "death-note",       storeName: "Death Note",       anilistSearch: "Death Note" },
  { slug: "dragon-ball-z",    storeName: "Dragon Ball Z",    anilistSearch: "Dragon Ball Z" },
  { slug: "hunter-x-hunter",  storeName: "Hunter x Hunter",  anilistSearch: "Hunter x Hunter 2011" },
  { slug: "tokyo-ghoul",      storeName: "Tokyo Ghoul",      anilistSearch: "Tokyo Ghoul" },
  { slug: "jujutsu-kaisen",   storeName: "Jujutsu Kaisen",   anilistSearch: "Jujutsu Kaisen" },
  { slug: "my-hero-academia", storeName: "My Hero Academia", anilistSearch: "Boku no Hero Academia" },
  { slug: "fairy-tail",       storeName: "Fairy Tail",       anilistSearch: "Fairy Tail" },
  { slug: "code-geass",       storeName: "Code Geass",       anilistSearch: "Code Geass Hangyaku no Lelouch" },
  { slug: "chainsaw-man",     storeName: "Chainsaw Man",     anilistSearch: "Chainsaw Man" },
];

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

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const refresh = process.argv.includes("--refresh");
  const db = getDb();

  const existing = new Set(
    (await db.select({ anime: animeMetadata.anime }).from(animeMetadata)).map((r) => r.anime)
  );

  const todo = NEW_ANIME.filter((a) => refresh || !existing.has(a.storeName));

  console.log(`${NEW_ANIME.length} vocab-only anime, ${existing.size} already cached, ${todo.length} to fetch`);

  let ok = 0;
  let miss = 0;

  for (let i = 0; i < todo.length; i++) {
    const { storeName, anilistSearch } = todo[i];
    process.stdout.write(`[${i + 1}/${todo.length}] ${storeName} (search: "${anilistSearch}") ... `);

    const media = await fetchAnime(anilistSearch);

    if (!media) {
      console.log("NOT FOUND");
      miss++;
    } else {
      const topTags = (media.tags ?? [])
        .filter((t) => !t.isMediaSpoiler && t.rank >= 60)
        .sort((a, b) => b.rank - a.rank)
        .slice(0, 10)
        .map((t) => t.name);

      await db
        .insert(animeMetadata)
        .values({
          anime: storeName,
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
        })
        .onConflictDoUpdate({
          target: animeMetadata.anime,
          set: {
            anilist_id: media.id,
            title_english: media.title.english ?? media.title.romaji,
            title_native: media.title.native,
            banner_image: media.bannerImage,
            cover_image: media.coverImage.extraLarge ?? media.coverImage.large,
            genres: media.genres ?? [],
            tags: topTags,
            description: media.description,
            fetched_at: new Date(),
          },
        });

      console.log(`OK — ${media.title.english ?? media.title.romaji}`);
      ok++;
    }

    if (i < todo.length - 1) await sleep(RATE_LIMIT_MS);
  }

  console.log(`\nDone — ${ok} fetched, ${miss} not found`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
