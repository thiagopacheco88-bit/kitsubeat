/**
 * sync-lessons-to-song-versions.ts
 *
 * The app reads lesson content from `song_versions.lesson`, not `songs.lesson`.
 * The 05-insert-db script only writes to the songs table. This script fills
 * the gap by pushing data/lessons-cache/<slug>.json into the matching
 * song_versions row (version_type = 'full' by default).
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/sync-lessons-to-song-versions.ts
 *   npx tsx ... scripts/sync-lessons-to-song-versions.ts --version=tv
 *   npx tsx ... scripts/sync-lessons-to-song-versions.ts --slug=blue-bird-ikimonogakari
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { existsSync, readdirSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { and, eq } from "drizzle-orm";

import { getDb } from "../src/lib/db/index.js";
import { songs, songVersions } from "../src/lib/db/schema.js";

interface Args {
  slug: string | null;
  version: "full" | "tv";
}

function parseArgs(): Args {
  const args: Args = { slug: null, version: "full" };
  for (const raw of process.argv.slice(2)) {
    if (raw.startsWith("--slug=")) args.slug = raw.slice("--slug=".length);
    else if (raw === "--version=tv") args.version = "tv";
    else if (raw === "--version=full") args.version = "full";
  }
  return args;
}

async function main() {
  const args = parseArgs();
  const suffix = args.version === "tv" ? "-tv" : "";
  const dir = resolve(`data/lessons-cache${suffix}`);

  if (!existsSync(dir)) {
    console.error(`Lessons cache dir missing: ${dir}`);
    process.exit(1);
  }

  // Load manifest so we can populate song_versions.youtube_id on insert/update.
  // 05-insert-db.ts attempts to set songs.youtube_id, but that column was moved
  // to song_versions in a schema migration; drizzle silently drops the unknown
  // field, so without this lookup the YouTube embed never renders on the page.
  const manifestPath = resolve(`data/songs-manifest${suffix}.json`);
  const manifest: Array<{ slug: string; youtube_id: string | null }> = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf8"))
    : [];
  const ytBySlug = new Map(manifest.map((s) => [s.slug, s.youtube_id ?? null]));
  console.log(`Manifest: ${manifest.length} entries; ${[...ytBySlug.values()].filter(Boolean).length} have youtube_id`);

  const files = args.slug
    ? [`${args.slug}.json`]
    : readdirSync(dir).filter((f) => f.endsWith(".json"));

  console.log(`=== sync-lessons-to-song-versions (${args.version}) ===`);
  console.log(`Input: ${dir}`);
  console.log(`Files: ${files.length}\n`);

  const db = getDb();

  let updated = 0;
  let inserted = 0;
  let missingSong = 0;
  let skipped = 0;

  for (const file of files) {
    const path = join(dir, file);
    if (!existsSync(path)) {
      skipped++;
      continue;
    }
    const slug = file.replace(/\.json$/, "");
    const lesson = JSON.parse(readFileSync(path, "utf8"));

    const songRow = await db
      .select({ id: songs.id })
      .from(songs)
      .where(eq(songs.slug, slug))
      .limit(1);
    if (!songRow.length) {
      console.warn(`[miss] ${slug} — no matching song row`);
      missingSong++;
      continue;
    }
    const songId = songRow[0].id;

    const existing = await db
      .select({ id: songVersions.id })
      .from(songVersions)
      .where(
        and(
          eq(songVersions.song_id, songId),
          eq(songVersions.version_type, args.version)
        )
      )
      .limit(1);

    const youtubeId = ytBySlug.get(slug) ?? null;

    if (existing.length) {
      await db
        .update(songVersions)
        .set({
          lesson,
          // Backfill youtube_id when missing; preserve any existing value otherwise
          ...(youtubeId ? { youtube_id: youtubeId } : {}),
          updated_at: new Date(),
        })
        .where(eq(songVersions.id, existing[0].id));
      updated++;
      console.log(`[upd] ${slug} — vocab ${lesson?.vocabulary?.length ?? 0}, yt=${youtubeId ?? "null"}`);
    } else {
      await db.insert(songVersions).values({
        song_id: songId,
        version_type: args.version,
        youtube_id: youtubeId,
        lesson,
      });
      inserted++;
      console.log(`[new] ${slug} — vocab ${lesson?.vocabulary?.length ?? 0}, yt=${youtubeId ?? "null"}`);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Missing song row: ${missingSong}`);
  console.log(`Skipped: ${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
