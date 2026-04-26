/**
 * snapshot-tv-lessons.ts — Pre-rollout snapshot of song_versions.lesson for version_type='tv'.
 *
 * Per D-09 (CONTEXT.md): writes to .planning/phases/11.2-.../tv-lessons-pre-rework-snapshot.json,
 * which IS committed to git (the data/ gitignore does not cover .planning/).
 *
 * Run BEFORE Plan 11.2-07's directory swap + 10c-load-tv-lessons.ts invocation.
 *
 * Usage:
 *   npx tsx .planning/phases/11.2-tv-derive-rework-demucs-nw/snapshot-tv-lessons.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const SNAPSHOT_PATH = path.resolve(
  __dirname,
  "tv-lessons-pre-rework-snapshot.json"
);

async function main(): Promise<void> {
  // Late import — allows dotenv to load DATABASE_URL first
  const { getDb } = await import("../../../src/lib/db/index.js");
  const { songs, songVersions } = await import("../../../src/lib/db/schema.js");
  const { eq } = await import("drizzle-orm");

  const db = getDb();

  // SELECT slug, lesson FROM song_versions JOIN songs WHERE version_type='tv'
  // slug lives on the songs table; song_versions holds the lesson jsonb
  const rows = await db
    .select({
      slug: songs.slug,
      lesson: songVersions.lesson,
    })
    .from(songVersions)
    .innerJoin(songs, eq(songs.id, songVersions.song_id))
    .where(eq(songVersions.version_type, "tv"));

  console.log(`[snapshot] queried ${rows.length} TV rows`);

  // Validate: expect ~56–60 rows (per SPEC.md: 60 TV song_versions rows)
  if (rows.length === 0) {
    console.error("[snapshot] ERROR: 0 rows returned — DB may be empty or DATABASE_URL is wrong");
    process.exit(1);
  }

  const nullLessons = rows.filter((r) => r.lesson === null).length;
  if (nullLessons > 0) {
    console.log(`[snapshot] note: ${nullLessons} rows have null lesson (stragglers — snapshotted as null)`);
  }

  // Write snapshot JSON — array of {slug, lesson}
  // tv-lessons-pre-rework-snapshot.json is committed to git per D-09
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(rows, null, 2), "utf-8");
  console.log(`[snapshot] wrote ${rows.length} rows to ${SNAPSHOT_PATH}`);
  console.log(`[snapshot] done — commit this file before running 10c-load-tv-lessons.ts`);
}

main().catch((e) => {
  console.error("[snapshot] fatal:", e);
  process.exit(1);
});
