/**
 * restore-tv-lessons-from-snapshot.ts — Rollback escape hatch for Plan 11.2-07.
 *
 * Reads tv-lessons-pre-rework-snapshot.json and writes each lesson back to
 * song_versions.lesson for the matching slug + version_type='tv' row.
 *
 * GATED behind --confirm because this is destructive against production Neon.
 * Without --confirm, prints the planned UPDATE count and exits without writing.
 *
 * Per T-11.2-08 (STRIDE): default is DRY RUN; --confirm required for writes;
 * prints row count + slugs before write so operator can verify scope.
 *
 * Usage:
 *   npx tsx .planning/phases/11.2-tv-derive-rework-demucs-nw/restore-tv-lessons-from-snapshot.ts
 *   npx tsx .planning/phases/11.2-tv-derive-rework-demucs-nw/restore-tv-lessons-from-snapshot.ts --confirm
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

// ---------------------------------------------------------------------------
// Snapshot shape validation (ASVS L1: input validation before restore)
// ---------------------------------------------------------------------------
interface SnapshotRow {
  slug: string;
  lesson: unknown; // jsonb — may be null for pre-rework stragglers
}

function isSnapshotRow(x: unknown): x is SnapshotRow {
  if (typeof x !== "object" || x === null) return false;
  const r = x as Record<string, unknown>;
  return typeof r.slug === "string" && "lesson" in r;
}

function validateSnapshot(raw: unknown): SnapshotRow[] {
  if (!Array.isArray(raw)) {
    throw new Error("Snapshot JSON must be an array of {slug, lesson} rows");
  }
  for (let i = 0; i < raw.length; i++) {
    if (!isSnapshotRow(raw[i])) {
      throw new Error(
        `Snapshot row ${i} is invalid — expected {slug: string, lesson: any}`
      );
    }
  }
  return raw as SnapshotRow[];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const confirm = args.includes("--confirm");

  // Snapshot file must exist before restore can proceed
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    console.error(`[restore] snapshot missing: ${SNAPSHOT_PATH}`);
    console.error(`[restore] Run snapshot-tv-lessons.ts first to create it.`);
    process.exit(1);
  }

  // Parse + validate snapshot
  let snap: SnapshotRow[];
  try {
    const raw = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf-8"));
    snap = validateSnapshot(raw);
  } catch (e) {
    console.error(`[restore] invalid snapshot: ${(e as Error).message}`);
    process.exit(1);
  }

  console.log(`[restore] snapshot has ${snap.length} rows`);

  // Print slug list for operator verification
  const slugList = snap.map((r) => r.slug).join(", ");
  console.log(`[restore] slugs: ${slugList}`);
  console.log();

  if (!confirm) {
    console.log(`[restore] DRY RUN — pass --confirm to actually restore.`);
    console.log(`[restore] would UPDATE ${snap.length} song_versions.lesson rows.`);
    console.log(`[restore] null-lesson rows: ${snap.filter((r) => r.lesson === null).length}`);
    return;
  }

  // --confirm path: write rows back to DB
  // Mirror 10c-load-tv-lessons.ts WHERE clause exactly:
  //   WHERE song_versions.song_id = songs.id AND songs.slug = ? AND song_versions.version_type = 'tv'
  const { getDb } = await import("../../../src/lib/db/index.js");
  const { songs, songVersions } = await import("../../../src/lib/db/schema.js");
  const { and, eq } = await import("drizzle-orm");

  const db = getDb();

  // Pre-load song_id → slug map for efficient matching (single SELECT)
  const songRows = await db
    .select({ id: songs.id, slug: songs.slug })
    .from(songs);

  const songIdBySlug = new Map<string, string>();
  for (const s of songRows) {
    songIdBySlug.set(s.slug, s.id);
  }

  let updated = 0;
  let missing = 0;
  const errors: Array<{ slug: string; error: string }> = [];

  for (const row of snap) {
    const songId = songIdBySlug.get(row.slug);
    if (!songId) {
      console.warn(`[restore] [missing_song] ${row.slug} — not found in songs table, skipping`);
      missing++;
      continue;
    }

    try {
      // Mirror 10c-load-tv-lessons.ts update shape exactly
      await db
        .update(songVersions)
        .set({
          lesson: row.lesson,
          updated_at: new Date(),
        })
        .where(
          and(
            eq(songVersions.song_id, songId),
            eq(songVersions.version_type, "tv")
          )
        );

      console.log(
        `[restore] [ok] ${row.slug}${row.lesson === null ? " (null lesson — straggler)" : ""}`
      );
      updated++;
    } catch (e) {
      const msg = (e as Error).message;
      console.error(`[restore] [error] ${row.slug} — ${msg}`);
      errors.push({ slug: row.slug, error: msg });
    }
  }

  console.log("\n=== Restore Summary ===");
  console.log(`  updated:       ${updated}`);
  console.log(`  missing_songs: ${missing}`);
  console.log(`  errors:        ${errors.length}`);

  if (errors.length > 0) {
    console.error("[restore] errors during restore — some rows may not have been restored");
    process.exit(1);
  }

  console.log("[restore] done.");
}

main().catch((e) => {
  console.error("[restore] fatal:", e);
  process.exit(1);
});
