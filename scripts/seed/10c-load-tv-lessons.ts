/**
 * 10c-load-tv-lessons.ts — Load derived TV lessons from disk into song_versions.lesson.
 *
 * Reads data/lessons-cache-tv/{slug}.json (produced by 10b-derive-tv-lessons.ts)
 * and updates the `lesson`, `jlpt_level`, `difficulty_tier` columns on each
 * song_versions row where version_type='tv'.
 *
 * Usage:
 *   npx tsx scripts/seed/10c-load-tv-lessons.ts                # all TV rows
 *   npx tsx scripts/seed/10c-load-tv-lessons.ts --slug <slug>  # one song
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { and, eq } from "drizzle-orm";

import { getDb } from "../../src/lib/db/index.js";
import { songs, songVersions } from "../../src/lib/db/schema.js";
import { LessonSchema } from "../types/lesson.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../../");
const TV_LESSONS_DIR = join(PROJECT_ROOT, "data/lessons-cache-tv");

function parseArgs(): { slug: string | null } {
  const out = { slug: null as string | null };
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === "--slug") out.slug = process.argv[++i];
    else if (a.startsWith("--slug=")) out.slug = a.slice("--slug=".length);
  }
  return out;
}

async function main(): Promise<void> {
  const { slug: onlySlug } = parseArgs();
  const db = getDb();

  const rows = await db
    .select({
      slug: songs.slug,
      song_id: songs.id,
      version_id: songVersions.id,
    })
    .from(songVersions)
    .innerJoin(songs, eq(songs.id, songVersions.song_id))
    .where(eq(songVersions.version_type, "tv"));

  const target = onlySlug ? rows.filter((r) => r.slug === onlySlug) : rows;
  console.log(`=== 10c-load-tv-lessons: ${target.length} TV row(s) ===\n`);

  let loaded = 0;
  let missing = 0;
  let invalid = 0;
  let errors = 0;

  for (const row of target) {
    const path = join(TV_LESSONS_DIR, `${row.slug}.json`);
    if (!existsSync(path)) {
      console.log(`[missing_file ] ${row.slug}`);
      missing++;
      continue;
    }

    try {
      const parsed = LessonSchema.safeParse(JSON.parse(readFileSync(path, "utf-8")));
      if (!parsed.success) {
        console.warn(
          `[invalid      ] ${row.slug} — ${parsed.error.errors[0]?.message}`
        );
        invalid++;
        continue;
      }
      const lesson = parsed.data;

      await db
        .update(songVersions)
        .set({
          lesson,
          updated_at: new Date(),
        })
        .where(
          and(
            eq(songVersions.song_id, row.song_id),
            eq(songVersions.version_type, "tv")
          )
        );

      console.log(
        `[ok           ] ${row.slug}  verses=${lesson.verses.length}  vocab=${lesson.vocabulary.length}`
      );
      loaded++;
    } catch (err) {
      console.error(`[error        ] ${row.slug} — ${(err as Error).message}`);
      errors++;
    }
  }

  console.log("\n=== Summary ===");
  console.log(`  loaded:       ${loaded}`);
  console.log(`  missing_file: ${missing}`);
  console.log(`  invalid:      ${invalid}`);
  console.log(`  errors:       ${errors}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
