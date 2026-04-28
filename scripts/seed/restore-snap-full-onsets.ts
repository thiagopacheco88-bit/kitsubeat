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
const SNAPSHOT_PATH = resolve(__dirname, "../../.planning/snap-full-onsets-snapshot.json");

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
console.log(`Snapshot from ${snap.generated_at} — ${snap.rows.length} rows`);

if (!apply) {
  console.log("\nWould restore:");
  for (const r of snap.rows) {
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

for (const r of snap.rows) {
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
    process.stdout.write(`\r  ${applied}/${snap.rows.length} restored`);
  } catch (err) {
    failed.push(`${r.slug}: ${(err as Error).message}`);
  }
}
console.log();
if (failed.length) for (const f of failed) console.log(`  FAILED: ${f}`);
console.log(`\nRestored ${applied}/${snap.rows.length}.`);
process.exit(failed.length ? 1 : 0);
