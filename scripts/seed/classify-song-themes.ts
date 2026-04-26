/**
 * classify-song-themes.ts — label non-OP/ED songs with a theme_type so the
 * catalog can display meaningful badges for inserts, OSTs, movie themes, and
 * character themes.
 *
 * Problem:
 *   ~92 of 323 songs have season_info = just the anime name (e.g. "Attack on
 *   Titan" for Bauklötze, an OST vocal track). The current formatSeasonInfo()
 *   regex only extracts "OP N" / "ED N", so these songs show nothing distinctive
 *   on SongCard.
 *
 * Solution:
 *   Ask Claude (Haiku 4.5) to classify each ambiguous song into:
 *     - Opening / Ending (+ number)  → already handled, only catches rare misses
 *     - Insert         → diegetic / episode-insert song
 *     - OST            → background score or vocal OST not tied to an OP/ED
 *     - Movie_Theme    → OP/ED of an anime film
 *     - Character_Theme → associated with a named character (+ subject name)
 *     - Unknown        → skip; leave season_info untouched
 *
 *   The classification is rewritten into season_info in a form the existing
 *   renderer understands ("{anime} Insert", "{anime} OST", "{anime} Movie Theme",
 *   "{anime} {Character} Theme"). formatSeasonInfo() on the card can be
 *   extended in a follow-up to surface these as badges.
 *
 * Safety:
 *   - Dry-run by default. Writes classifications to
 *     data/theme-classifications.json for review.
 *   - Pass --apply to persist to DB. Only rows with confidence="high" are
 *     written; medium/low stay in the JSON for manual review.
 *   - Only operates on songs whose current season_info is ambiguous (no OP|ED
 *     pattern and no existing Insert|OST|Movie|Character suffix). Safe to
 *     re-run.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/classify-song-themes.ts           # dry-run
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/classify-song-themes.ts --apply   # writes DB
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/classify-song-themes.ts --limit 5 # first 5 only
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import Anthropic from "@anthropic-ai/sdk";
import pLimit from "p-limit";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../src/lib/db/index.js";
import { songs } from "../../src/lib/db/schema.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MODEL = "claude-haiku-4-5";
const CONCURRENCY = 5;
const MAX_TOKENS = 512;
const OUT_PATH = resolve(process.cwd(), "data/theme-classifications.json");

// Existing labels formatSeasonInfo already recognises OR that this script has
// already written. A song matching any of these is considered "classified"
// and skipped.
const CLASSIFIED_RE =
  /\b(OP|ED|Opening|Ending|Insert|OST|Movie Theme|Character Theme|Theme)\b/i;

// ---------------------------------------------------------------------------
// Classification schema
// ---------------------------------------------------------------------------

const ThemeTypeEnum = z.enum([
  "Opening",
  "Ending",
  "Insert",
  "OST",
  "Movie_Theme",
  "Character_Theme",
  "Unknown",
]);

const ClassificationSchema = z.object({
  theme_type: ThemeTypeEnum,
  number: z.number().int().min(1).max(50).nullable(),
  subject: z.string().max(40).nullable(),
  confidence: z.enum(["high", "medium", "low"]),
  reason: z.string().max(200),
});

type Classification = z.infer<typeof ClassificationSchema>;

interface ClassificationRecord extends Classification {
  song_id: string;
  slug: string;
  title: string;
  artist: string;
  anime: string;
  year_launched: number | null;
  old_season_info: string | null;
  new_season_info: string | null;
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function buildPrompt(row: {
  title: string;
  artist: string;
  anime: string;
  year_launched: number | null;
}): string {
  return `You are classifying anime songs for a Japanese-learning catalog.

Given a song, classify its role in the anime. Return JSON only, matching this exact shape:

{
  "theme_type": "Opening" | "Ending" | "Insert" | "OST" | "Movie_Theme" | "Character_Theme" | "Unknown",
  "number": <integer 1-50, or null>,
  "subject": <string with character name, or null>,
  "confidence": "high" | "medium" | "low",
  "reason": <brief string, under 25 words>
}

Rules:
- "Opening" / "Ending": a TV series OP or ED. Include "number" if you are confident which OP/ED slot it occupies (e.g. Naruto Shippuden OP 3). Leave number null if unsure.
- "Insert": a song played inside an episode, NOT as the opening or ending slot. Common in Attack on Titan, Bleach, and musical anime.
- "OST": original soundtrack, instrumental or vocal, that plays as score (e.g. AoT's "Vogel im Käfig", "Bauklötze"). Not a title theme.
- "Movie_Theme": OP or ED of an anime film (e.g. SAO: Ordinal Scale theme).
- "Character_Theme": song associated with a named character. Set "subject" to the character's name (e.g. "Midoriya", "Eren").
- "Unknown": use when you cannot confidently place the song. Prefer Unknown over guessing — Unknown rows stay untouched.

Confidence guide:
- "high": you are certain; widely documented on MyAnimeList / AniList / Wikipedia.
- "medium": reasonable inference from title + anime.
- "low": guess. Will NOT be written to the database.

Song:
- Title: ${row.title}
- Artist: ${row.artist}
- Anime: ${row.anime}
- Year: ${row.year_launched ?? "unknown"}

Return JSON only, no prose.`;
}

// ---------------------------------------------------------------------------
// Compose new season_info from a classification
// ---------------------------------------------------------------------------

function composeSeasonInfo(anime: string, c: Classification): string | null {
  switch (c.theme_type) {
    case "Opening":
      return c.number != null && c.number > 1
        ? `${anime} OP ${c.number}`
        : `${anime} OP`;
    case "Ending":
      return c.number != null && c.number > 1
        ? `${anime} ED ${c.number}`
        : `${anime} ED`;
    case "Insert":
      return `${anime} Insert`;
    case "OST":
      return `${anime} OST`;
    case "Movie_Theme":
      return `${anime} Movie Theme`;
    case "Character_Theme":
      return c.subject
        ? `${anime} ${c.subject} Theme`
        : `${anime} Character Theme`;
    case "Unknown":
      return null;
  }
}

// ---------------------------------------------------------------------------
// Claude call + parse
// ---------------------------------------------------------------------------

async function classifyOne(
  client: Anthropic,
  row: { title: string; artist: string; anime: string; year_launched: number | null }
): Promise<Classification | { error: string }> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: "user", content: buildPrompt(row) }],
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? "";

  // Be forgiving: strip accidental code fences if the model uses them.
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let json: unknown;
  try {
    json = JSON.parse(stripped);
  } catch {
    return { error: `non-JSON response: ${text.slice(0, 120)}` };
  }

  const parsed = ClassificationSchema.safeParse(json);
  if (!parsed.success) {
    return { error: `zod failed: ${parsed.error.issues.map((i) => i.message).join("; ")}` };
  }
  return parsed.data;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = new Set(process.argv.slice(2));
  const apply = args.has("--apply");
  const limitArg = [...args].find((a) => a.startsWith("--limit="));
  const rowLimit = limitArg ? parseInt(limitArg.split("=")[1], 10) : Infinity;

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[classify-themes] ANTHROPIC_API_KEY not set in .env.local — aborting.");
    process.exit(1);
  }

  const db = getDb();
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    maxRetries: 3,
  });
  const limit = pLimit(CONCURRENCY);

  // Pull every song, then filter to the ambiguous ones in JS. The regex is
  // easier to maintain here than in SQL, and the table is small (~300 rows).
  const allRows = await db
    .select({
      id: songs.id,
      slug: songs.slug,
      title: songs.title,
      artist: songs.artist,
      anime: songs.anime,
      year_launched: songs.year_launched,
      season_info: songs.season_info,
    })
    .from(songs);

  const pending = allRows
    .filter((r) => !r.season_info || !CLASSIFIED_RE.test(r.season_info))
    .slice(0, rowLimit);

  console.log(
    `[classify-themes] ${pending.length} songs to classify (of ${allRows.length} total). mode=${apply ? "APPLY" : "dry-run"}`
  );

  if (pending.length === 0) {
    console.log("[classify-themes] Nothing to do. Exiting.");
    return;
  }

  const results: ClassificationRecord[] = [];
  let ok = 0;
  let fail = 0;
  let written = 0;
  const histogram: Record<string, number> = {};

  const tasks = pending.map((row) =>
    limit(async () => {
      const out = await classifyOne(client, row);

      if ("error" in out) {
        console.warn(`[fail] ${row.slug}: ${out.error}`);
        fail++;
        return;
      }

      const newSeason = composeSeasonInfo(row.anime, out);
      const record: ClassificationRecord = {
        song_id: row.id,
        slug: row.slug,
        title: row.title,
        artist: row.artist,
        anime: row.anime,
        year_launched: row.year_launched,
        old_season_info: row.season_info,
        new_season_info: newSeason,
        ...out,
      };
      results.push(record);
      histogram[out.theme_type] = (histogram[out.theme_type] ?? 0) + 1;
      ok++;

      const writable =
        apply &&
        out.confidence === "high" &&
        out.theme_type !== "Unknown" &&
        newSeason &&
        newSeason !== row.season_info;

      if (writable) {
        await db
          .update(songs)
          .set({ season_info: newSeason, updated_at: new Date() })
          .where(eq(songs.id, row.id));
        written++;
      }

      if ((ok + fail) % 20 === 0) {
        console.log(
          `[progress] ${ok} ok / ${fail} fail / ${pending.length} total — written=${written}`
        );
      }
    })
  );

  await Promise.all(tasks);

  // Sort results for stable diffs: highest-confidence named themes first.
  results.sort((a, b) => {
    const conf = { high: 0, medium: 1, low: 2 } as const;
    if (conf[a.confidence] !== conf[b.confidence]) return conf[a.confidence] - conf[b.confidence];
    return a.slug.localeCompare(b.slug);
  });

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(
    OUT_PATH,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        mode: apply ? "apply" : "dry-run",
        total: pending.length,
        succeeded: ok,
        failed: fail,
        written_to_db: written,
        histogram,
        results,
      },
      null,
      2
    )
  );

  console.log("");
  console.log(`[classify-themes] done. ok=${ok} fail=${fail} written=${written}`);
  console.log(`[classify-themes] histogram: ${JSON.stringify(histogram)}`);
  console.log(`[classify-themes] review file: ${OUT_PATH}`);
  if (!apply) {
    console.log("[classify-themes] dry-run only — re-run with --apply to persist high-confidence rows.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
