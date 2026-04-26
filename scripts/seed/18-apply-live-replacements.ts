/**
 * 18-apply-live-replacements.ts — Persist the picks from
 * data/live-versions-replacements.json.
 *
 * For each proposal with a valid pick, flips the youtube_id in:
 *   1. data/songs-manifest.json                (authoritative metadata)
 *   2. data/songs-manifest-pending-whisper.json (if present — WhisperX queue)
 *   3. song_versions (Neon) — version_type='full'
 *
 * Also resets timing_data + timing_youtube_id + lyrics_offset_ms on the DB
 * row so the WhisperX pipeline re-keys cleanly to the new video. synced_lrc
 * is retained — it tracks the audio master, not the video.
 *
 * Proposals with a null pick or score below MIN_ACCEPT are listed and skipped.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/18-apply-live-replacements.ts --dry-run
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/18-apply-live-replacements.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { and, eq } from "drizzle-orm";

import { getDb } from "../../src/lib/db/index.js";
import { songs, songVersions } from "../../src/lib/db/schema.js";

const DRY_RUN = process.argv.includes("--dry-run");
// Confidence floor. Below this the pick is shown but not applied.
const MIN_ACCEPT_SCORE = 65;

interface Pick {
  id: string;
  channel: string;
  duration: number;
  title: string;
  score: number;
  reasons: string[];
}

interface Proposal {
  slug: string;
  current_youtube_id: string | null;
  current_live_title: string;
  artist: string;
  title: string;
  anime: string;
  pick: Pick | null;
}

interface ManifestEntry {
  slug: string;
  youtube_id: string | null;
  [k: string]: unknown;
}

async function main() {
  const root = resolve(process.cwd());
  const proposals = JSON.parse(
    readFileSync(resolve(root, "data/live-versions-replacements.json"), "utf8")
  ) as Proposal[];

  const accepted = proposals.filter(
    (p) => p.pick && p.pick.score >= MIN_ACCEPT_SCORE
  );
  const lowConfidence = proposals.filter(
    (p) => p.pick && p.pick.score < MIN_ACCEPT_SCORE
  );
  const noPick = proposals.filter((p) => !p.pick);

  console.log(`=== apply-live-replacements (${DRY_RUN ? "DRY RUN" : "APPLY"}) ===\n`);
  console.log(`proposals:       ${proposals.length}`);
  console.log(`accepted (≥${MIN_ACCEPT_SCORE}): ${accepted.length}`);
  console.log(`low confidence:  ${lowConfidence.length}`);
  console.log(`no pick found:   ${noPick.length}`);
  console.log("");

  if (accepted.length > 0) {
    console.log("--- accepted ---");
    accepted.forEach((p) => {
      console.log(
        `  ${p.slug}  score=${p.pick!.score}  dur=${p.pick!.duration}s  channel="${p.pick!.channel}"`
      );
      console.log(`    → ${p.pick!.id}  ${p.pick!.title}`);
    });
    console.log("");
  }
  if (lowConfidence.length > 0) {
    console.log("--- low confidence (skipped) ---");
    lowConfidence.forEach((p) =>
      console.log(
        `  ${p.slug}  score=${p.pick!.score}  title="${p.pick!.title}"`
      )
    );
    console.log("");
  }
  if (noPick.length > 0) {
    console.log("--- no pick ---");
    noPick.forEach((p) => console.log(`  ${p.slug}  (current: ${p.current_live_title})`));
    console.log("");
  }

  if (accepted.length === 0) {
    console.log("nothing to apply.");
    return;
  }

  // ── 1. Update manifest
  const manifestPath = resolve(root, "data/songs-manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as ManifestEntry[];
  const bySlug = new Map(manifest.map((e) => [e.slug, e]));
  let manifestUpdates = 0;
  for (const p of accepted) {
    const entry = bySlug.get(p.slug);
    if (!entry) {
      console.log(`  [WARN] ${p.slug} not in manifest`);
      continue;
    }
    if (entry.youtube_id === p.pick!.id) continue;
    entry.youtube_id = p.pick!.id;
    manifestUpdates++;
  }
  if (!DRY_RUN && manifestUpdates > 0) {
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  }
  console.log(
    `[manifest]        ${manifestUpdates} updates ${DRY_RUN ? "(not written)" : "written"}`
  );

  // ── 2. Update pending-whisper queue if present
  const pendingPath = resolve(root, "data/songs-manifest-pending-whisper.json");
  if (existsSync(pendingPath)) {
    const pending = JSON.parse(readFileSync(pendingPath, "utf8")) as ManifestEntry[];
    const idMap = new Map(accepted.map((p) => [p.slug, p.pick!.id]));
    let pendingSwaps = 0;
    for (const entry of pending) {
      const next = idMap.get(entry.slug);
      if (next && entry.youtube_id !== next) {
        entry.youtube_id = next;
        pendingSwaps++;
      }
    }
    if (!DRY_RUN && pendingSwaps > 0) {
      writeFileSync(pendingPath, JSON.stringify(pending, null, 2) + "\n", "utf8");
    }
    console.log(
      `[pending-whisper] ${pendingSwaps} swaps ${DRY_RUN ? "(not written)" : "written"}`
    );
  }

  // ── 3. Update song_versions (full)
  let dbUpdates = 0;
  let dbMissing = 0;
  if (!DRY_RUN) {
    const db = getDb();
    for (const p of accepted) {
      const rows = await db
        .select({ id: songs.id })
        .from(songs)
        .where(eq(songs.slug, p.slug));
      const song = rows[0];
      if (!song) {
        console.log(`  [db miss] ${p.slug} — not in songs table`);
        dbMissing++;
        continue;
      }
      await db
        .update(songVersions)
        .set({
          youtube_id: p.pick!.id,
          timing_data: null,
          timing_youtube_id: null,
          lyrics_offset_ms: 0,
          updated_at: new Date(),
        })
        .where(
          and(
            eq(songVersions.song_id, song.id),
            eq(songVersions.version_type, "full")
          )
        );
      dbUpdates++;
    }
  }
  console.log(
    `[song_versions]   ${dbUpdates} updates${dbMissing ? `, ${dbMissing} missing` : ""}${DRY_RUN ? " (dry-run — skipped)" : ""}`
  );

  console.log(
    DRY_RUN ? "\n(DRY RUN — re-run without --dry-run to persist)" : "\nDone."
  );
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
