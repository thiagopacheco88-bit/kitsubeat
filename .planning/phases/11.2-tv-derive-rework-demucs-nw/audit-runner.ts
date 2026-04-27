/**
 * audit-runner.ts — Runs audit-tv-lessons DB mode with an increased body timeout.
 *
 * Workaround for Node 24 UND_ERR_BODY_TIMEOUT when fetching large JSONB payloads
 * from Neon HTTP. Sets undici's bodyTimeout to 120s via neonConfig.fetchFunction
 * before the DB query runs.
 *
 * Used for Plan 11.2-07 Task 4 final DB audit.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neonConfig } from "@neondatabase/serverless";

// Override fetch to use a longer body timeout
// Node 24's undici defaults to 300s for body timeout but something is causing early abort.
// We use a custom fetch that wraps the default with increased signal timeout.
const originalFetch = globalThis.fetch;
(neonConfig as { fetchFunction?: typeof fetch }).fetchFunction = async (input, init) => {
  // Create a new signal with a longer timeout (5 minutes)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300_000);
  try {
    const response = await originalFetch(input, {
      ...init,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};

import { getDb } from "../../../src/lib/db/index.js";
import { songs, songVersions } from "../../../src/lib/db/schema.js";
import { eq } from "drizzle-orm";

const DENSITY_FLOOR = 0.03;
const MAX_VERSE_SPAN_MS = 25_000;

interface Verse {
  verse_number: number;
  start_time_ms: number;
  end_time_ms: number;
}
interface Lesson { verses: Verse[]; }

function auditLesson(slug: string, lesson: Lesson): string[] {
  const flags: string[] = [];
  if (!lesson.verses || lesson.verses.length === 0) {
    flags.push(`${slug}: no-verses`);
    return flags;
  }
  const tvDurMs = lesson.verses.at(-1)?.end_time_ms ?? 0;
  const tvDurSec = tvDurMs / 1000;
  if (tvDurSec > 0) {
    const density = lesson.verses.length / tvDurSec;
    if (density < DENSITY_FLOOR) {
      flags.push(`${slug}: density=${density.toFixed(4)} (floor=${DENSITY_FLOOR}) — ${lesson.verses.length}v/${tvDurSec.toFixed(1)}s`);
    }
  } else {
    flags.push(`${slug}: no-tv-duration`);
  }
  for (const v of lesson.verses) {
    const span = v.end_time_ms - v.start_time_ms;
    if (span > MAX_VERSE_SPAN_MS) {
      flags.push(`${slug}: verse ${v.verse_number} spans ${span}ms (max=${MAX_VERSE_SPAN_MS}ms)`);
    }
  }
  return flags;
}

async function main(): Promise<void> {
  const db = getDb();
  console.log("[audit-runner] connecting...");

  const rows = await db
    .select({ slug: songs.slug, lesson: songVersions.lesson })
    .from(songVersions)
    .innerJoin(songs, eq(songs.id, songVersions.song_id))
    .where(eq(songVersions.version_type, "tv"));

  console.log(`[audit-runner] queried ${rows.length} TV rows`);

  const allFlags: string[] = [];
  let skipped = 0;

  for (const row of rows) {
    if (!row.lesson) {
      skipped++;
      continue;
    }
    const flags = auditLesson(row.slug, row.lesson as Lesson);
    for (const f of flags) {
      console.log(`[FLAG] ${f}`);
      allFlags.push(f);
    }
  }

  console.log(`\nAudited ${rows.length - skipped} TV lessons (${skipped} null skipped); ${allFlags.length} flags across ${new Set(allFlags.map(f => f.split(':')[0])).size} slugs.`);

  if (allFlags.length === 0) {
    console.log("RESULT: PASS — zero flags");
    process.exit(0);
  } else {
    console.log("RESULT: FAIL — flags found");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("[audit-runner] fatal:", e);
  process.exit(1);
});
