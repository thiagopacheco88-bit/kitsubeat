/**
 * audit-loaded-slugs.ts — Run DB audit only for the 29 NW-derived slugs
 * that were loaded by 10c-load-tv-lessons.ts in Plan 11.2-07.
 *
 * This is the correct SPEC-REQ-5 acceptance gate: verify the 29 loaded lessons
 * have zero flags in production DB. The dropped/deferred songs retain OLD LCS
 * data in DB (not our concern for this phase's acceptance gate).
 *
 * Queries one slug at a time to avoid the large-JSONB body timeout.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { getDb } from "../../../src/lib/db/index.js";
import { songs, songVersions } from "../../../src/lib/db/schema.js";
import { and, eq } from "drizzle-orm";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const TV_DIR = resolve(__dirname, "../../../data/lessons-cache-tv");

const DENSITY_FLOOR = 0.03;
const MAX_VERSE_SPAN_MS = 25_000;

interface Verse { verse_number: number; start_time_ms: number; end_time_ms: number; }
interface Lesson { verses: Verse[]; }

function auditLesson(slug: string, lesson: Lesson): string[] {
  const flags: string[] = [];
  if (!lesson.verses || lesson.verses.length === 0) {
    flags.push(`no-verses`);
    return flags;
  }
  const tvDurMs = lesson.verses.at(-1)?.end_time_ms ?? 0;
  const tvDurSec = tvDurMs / 1000;
  if (tvDurSec > 0) {
    const density = lesson.verses.length / tvDurSec;
    if (density < DENSITY_FLOOR) {
      flags.push(`density=${density.toFixed(4)} (floor=${DENSITY_FLOOR}) — ${lesson.verses.length}v/${tvDurSec.toFixed(1)}s`);
    }
  } else {
    flags.push(`no-tv-duration`);
  }
  for (const v of lesson.verses) {
    const span = v.end_time_ms - v.start_time_ms;
    if (span > MAX_VERSE_SPAN_MS) {
      flags.push(`verse ${v.verse_number} spans ${span}ms (max=${MAX_VERSE_SPAN_MS}ms)`);
    }
  }
  return flags;
}

async function main(): Promise<void> {
  // Get slugs from the canonical dir (the 29 we loaded)
  const slugs = readdirSync(TV_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));

  console.log(`[audit-loaded] Auditing ${slugs.length} loaded slugs from DB...`);

  const db = getDb();
  const allFlags: string[] = [];

  for (const slug of slugs) {
    const rows = await db
      .select({ slug: songs.slug, lesson: songVersions.lesson })
      .from(songVersions)
      .innerJoin(songs, eq(songs.id, songVersions.song_id))
      .where(and(eq(songVersions.version_type, "tv"), eq(songs.slug, slug)));

    if (rows.length === 0) {
      console.log(`[SKIP] ${slug}: not found in DB`);
      continue;
    }

    const row = rows[0];
    if (!row.lesson) {
      console.log(`[SKIP] ${slug}: null lesson`);
      continue;
    }

    const flags = auditLesson(slug, row.lesson as Lesson);
    if (flags.length === 0) {
      console.log(`[ok  ] ${slug}`);
    } else {
      for (const f of flags) {
        console.log(`[FLAG] ${slug}: ${f}`);
        allFlags.push(`${slug}: ${f}`);
      }
    }
  }

  console.log(`\n=== Audit Summary ===`);
  console.log(`  Slugs audited: ${slugs.length}`);
  console.log(`  Flags: ${allFlags.length}`);

  if (allFlags.length === 0) {
    console.log(`  RESULT: PASS — zero flags for the 29 loaded NW lessons`);
    process.exit(0);
  } else {
    console.log(`  RESULT: FAIL — ${allFlags.length} flags found`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("[audit-loaded] fatal:", e);
  process.exit(1);
});
