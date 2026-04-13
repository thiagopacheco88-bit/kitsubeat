import { z } from "zod";

/**
 * Schema for a single song entry in the manifest.
 * source_rankings tracks which sources surfaced the song and at what rank.
 */
export const SongManifestEntrySchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Must be kebab-case")
    .describe("Unique kebab-case identifier for this song"),
  title: z.string().describe("Song title"),
  artist: z.string().describe("Artist, band, or singer name"),
  anime: z.string().describe("Anime series this song is from"),
  season_info: z
    .string()
    .optional()
    .describe('Season or opening/ending number, e.g., "Naruto Shippuden OP 16"'),
  youtube_id: z
    .string()
    .nullable()
    .describe("YouTube video ID — null if not yet searched or not found"),
  year_launched: z
    .number()
    .int()
    .min(1980)
    .max(2030)
    .describe("Year the song was released"),
  genre_tags: z.array(z.string()).describe("Genre tags, e.g., ['rock', 'jpop']"),
  mood_tags: z
    .array(z.string())
    .describe("Mood tags, e.g., ['energetic', 'emotional']"),
  source_rankings: z
    .object({
      mal_rank: z
        .number()
        .nullable()
        .optional()
        .describe("MyAnimeList popularity rank (1 = most popular)"),
      spotify_rank: z
        .number()
        .nullable()
        .optional()
        .describe("Spotify popularity score rank (1 = most popular)"),
      anidb_rank: z
        .number()
        .nullable()
        .optional()
        .describe("AniDB popularity rank (1 = most popular)"),
    })
    .describe("Source rankings tracking which services surfaced this song"),
});

export type SongManifestEntry = z.infer<typeof SongManifestEntrySchema>;

/**
 * The full songs-manifest.json file is an array of SongManifestEntry objects.
 */
export const SongManifestSchema = z.array(SongManifestEntrySchema);

export type SongManifest = z.infer<typeof SongManifestSchema>;
