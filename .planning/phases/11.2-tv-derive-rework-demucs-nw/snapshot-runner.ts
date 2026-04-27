/**
 * snapshot-runner.ts — Wrapper for snapshot-tv-lessons.ts that uses top-level imports
 * to avoid the lazy-import hang on Windows/Node 24.
 *
 * This is a temporary workaround for Plan 11.2-07 Task 2. The original snapshot script
 * uses await import() inside main() which hangs on this environment.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { getDb } from "../../../src/lib/db/index.js";
import { songs, songVersions } from "../../../src/lib/db/schema.js";
import { eq } from "drizzle-orm";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const SNAPSHOT_PATH = path.resolve(
  __dirname,
  "tv-lessons-pre-rework-snapshot.json"
);

async function main(): Promise<void> {
  const db = getDb();

  console.log("[snapshot] connecting...");

  // SELECT slug, lesson FROM song_versions JOIN songs WHERE version_type='tv'
  const rows = await db
    .select({
      slug: songs.slug,
      lesson: songVersions.lesson,
    })
    .from(songVersions)
    .innerJoin(songs, eq(songs.id, songVersions.song_id))
    .where(eq(songVersions.version_type, "tv"));

  console.log(`[snapshot] queried ${rows.length} TV rows`);

  if (rows.length === 0) {
    console.error("[snapshot] ERROR: 0 rows returned — DB may be empty or DATABASE_URL is wrong");
    process.exit(1);
  }

  const nullLessons = rows.filter((r) => r.lesson === null).length;
  if (nullLessons > 0) {
    console.log(`[snapshot] note: ${nullLessons} rows have null lesson (stragglers — snapshotted as null)`);
  }

  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(rows, null, 2), "utf-8");
  console.log(`[snapshot] wrote ${rows.length} rows to ${SNAPSHOT_PATH}`);
  console.log(`[snapshot] done — commit this file before running 10c-load-tv-lessons.ts`);
  process.exit(0);
}

main().catch((e) => {
  console.error("[snapshot] fatal:", e);
  process.exit(1);
});
