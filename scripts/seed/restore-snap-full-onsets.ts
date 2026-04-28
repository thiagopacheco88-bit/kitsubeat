/**
 * restore-snap-full-onsets.ts — Roll back snap-full-onsets.ts.
 *
 * Reads .planning/snap-full-onsets-snapshot.json and writes the original
 * synced_lrc / lyrics_offset_ms / lyrics_source / lesson back to the DB.
 *
 * Usage:
 *   npx tsx scripts/seed/restore-snap-full-onsets.ts          # dry-run
 *   npx tsx scripts/seed/restore-snap-full-onsets.ts --apply
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DEFAULT_SNAPSHOT_PATH = resolve(__dirname, "../../.planning/snap-full-onsets-snapshot.json");

const argsAll = process.argv.slice(2);
const snapshotIdx = argsAll.indexOf("--snapshot");
const SNAPSHOT_PATH =
  snapshotIdx !== -1 && argsAll[snapshotIdx + 1] ? resolve(argsAll[snapshotIdx + 1]) : DEFAULT_SNAPSHOT_PATH;
const slugIdx = argsAll.indexOf("--slug");
const slugFilter = slugIdx !== -1 && argsAll[slugIdx + 1] ? argsAll[slugIdx + 1] : null;

interface SnapshotRow {
  slug: string;
  song_version_id: string;
  snapshot: {
    synced_lrc: unknown;
    lyrics_offset_ms: number;
    lyrics_source: string | null;
    lesson: unknown;
  };
}
interface Snapshot {
  generated_at: string;
  scope: string[];
  rows: SnapshotRow[];
}

const apply = process.argv.includes("--apply");

if (!existsSync(SNAPSHOT_PATH)) {
  console.error(`Snapshot not found: ${SNAPSHOT_PATH}`);
  process.exit(1);
}

const snap = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf-8")) as Snapshot;
const rows = slugFilter ? snap.rows.filter((r) => r.slug === slugFilter) : snap.rows;
console.log(`Snapshot: ${SNAPSHOT_PATH}`);
console.log(`Generated: ${snap.generated_at} — ${snap.rows.length} rows total, restoring ${rows.length}${slugFilter ? ` (filter: ${slugFilter})` : ""}`);

if (rows.length === 0) {
  console.error(`No rows match filter: ${slugFilter}`);
  process.exit(1);
}

if (!apply) {
  console.log("\nWould restore:");
  for (const r of rows) {
    console.log(`  ${r.slug}: lyrics_source=${r.snapshot.lyrics_source} offset=${r.snapshot.lyrics_offset_ms}ms`);
  }
  console.log("\n(dry-run — re-run with --apply)");
  process.exit(0);
}

const { getDb } = await import("../../src/lib/db/index.js");
const { songVersions } = await import("../../src/lib/db/schema.js");
const { eq } = await import("drizzle-orm");

const db = getDb();
let applied = 0;
const failed: string[] = [];

for (const r of rows) {
  try {
    await db
      .update(songVersions)
      .set({
        synced_lrc: r.snapshot.synced_lrc as unknown as never,
        lyrics_offset_ms: r.snapshot.lyrics_offset_ms,
        lyrics_source: r.snapshot.lyrics_source,
        lesson: r.snapshot.lesson as unknown as never,
      })
      .where(eq(songVersions.id, r.song_version_id));
    applied++;
    process.stdout.write(`\r  ${applied}/${rows.length} restored`);
  } catch (err) {
    failed.push(`${r.slug}: ${(err as Error).message}`);
  }
}
console.log();
if (failed.length) for (const f of failed) console.log(`  FAILED: ${f}`);
console.log(`\nRestored ${applied}/${rows.length}.`);
process.exit(failed.length ? 1 : 0);
