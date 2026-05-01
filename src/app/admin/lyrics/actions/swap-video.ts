"use server";

/**
 * Phase 11.5 SPEC #19/#20/#21 + D-09/D-10/D-11/D-12: YouTube swap server action.
 *
 * Validates URL → audit log insert → guarded status flip → spawn detached orchestrator.
 *
 * Spawn is detached (+ child.unref()) so dev-server reload doesn't kill the
 * long-running pipeline process (SWAP-T-02 mitigation).
 *
 * Status visibility: client polls /api/admin/song/[id]/pipeline-status.
 *
 * Security:
 *   T-11.5-05: new URL() parse + ALLOWED_HOSTS hostname allowlist + 11-char anchored regex.
 *   SWAP-T-01: UPDATE WHERE pipeline_status='idle' guard prevents double-trigger (Pitfall 12).
 *   SWAP-T-04: changed_by sourced from server-side requireAdminUser() → admin.id.
 */

export const runtime = "nodejs";

import { spawn } from "node:child_process";
import path from "node:path";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireAdminUser } from "@/lib/admin/require-admin";

// T-11.5-05: hostname allowlist — only these domains are accepted
const ALLOWED_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
]);

// T-11.5-05: anchored 11-char video ID regex
const VIDEO_ID_RE = /^([a-zA-Z0-9_-]{11})$/;

export interface SwapVideoInput {
  songVersionId: string;
  slug: string;
  newYoutubeUrl: string;
  steps: ("audio" | "whisper" | "lesson" | "lyrics" | "insert")[];
  reason: string;
  /** D-12: true when this call is a retry (was previously rerun_failed) */
  isRetry?: boolean;
  /** D-12: step name to resume from on retry */
  resumeFrom?: string;
}

export type SwapVideoOutput =
  | { ok: true; jobStartedAt: string; newYoutubeId: string }
  | {
      ok: false;
      error:
        | "invalid_url"
        | "pipeline_already_in_progress"
        | "song_not_found"
        | string;
    };

export async function swapVideo(
  input: SwapVideoInput
): Promise<SwapVideoOutput> {
  // Step 1: admin gate (SWAP-T-04 — admin.id is server-side, cannot be forged)
  const admin = await requireAdminUser();

  // Step 2: validate URL (T-11.5-05)
  let url: URL;
  try {
    url = new URL(input.newYoutubeUrl);
  } catch {
    return { ok: false, error: "invalid_url" };
  }
  if (!ALLOWED_HOSTS.has(url.hostname)) {
    return { ok: false, error: "invalid_url" };
  }

  // Extract 11-char video ID — supports youtu.be/<id>, ?v=<id>, /embed/<id>
  let candidate: string | null = null;
  if (url.searchParams.has("v")) {
    candidate = url.searchParams.get("v");
  } else if (url.hostname === "youtu.be") {
    candidate = url.pathname.slice(1);
  } else {
    // /embed/<id> path
    const m = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]+)/);
    if (m) candidate = m[1];
  }
  if (!candidate || !VIDEO_ID_RE.test(candidate)) {
    return { ok: false, error: "invalid_url" };
  }
  const newYoutubeId = candidate;

  // Step 3: read current youtube_id for audit log (SPEC #21)
  const curResult = await db.execute<{ youtube_id: string | null }>(sql`
    SELECT youtube_id FROM song_versions WHERE id = ${input.songVersionId}::uuid LIMIT 1
  `);
  const curRows = Array.isArray(curResult)
    ? curResult
    : (curResult.rows ?? []);
  if (curRows.length === 0) return { ok: false, error: "song_not_found" };
  const oldYoutubeId = curRows[0].youtube_id;

  // Step 4a: guarded status flip (SWAP-T-01 / Pitfall 12)
  // Only flips if pipeline_status = 'idle' — prevents double-trigger.
  const updResult = await db.execute<{ id: string }>(sql`
    UPDATE song_versions
       SET youtube_id          = ${newYoutubeId},
           pipeline_status     = 'rerun_in_progress',
           pipeline_step       = 'queued',
           pipeline_started_at = now()
     WHERE id              = ${input.songVersionId}::uuid
       AND pipeline_status  = 'idle'
     RETURNING id::text AS id
  `);
  const updRows = Array.isArray(updResult)
    ? updResult
    : (updResult.rows ?? []);

  if (updRows.length === 0 && !input.isRetry) {
    // Not idle and not a retry — guard rejected
    return { ok: false, error: "pipeline_already_in_progress" };
  }

  // Step 4b: for retry, status was 'rerun_failed' — flip back without idle guard
  if (input.isRetry) {
    await db.execute(sql`
      UPDATE song_versions
         SET pipeline_status     = 'rerun_in_progress',
             pipeline_step       = ${input.resumeFrom ?? "queued"},
             pipeline_started_at = now()
       WHERE id = ${input.songVersionId}::uuid
    `);
  }

  // Step 5: insert audit log row (SPEC #21)
  await db.execute(sql`
    INSERT INTO song_video_history
      (song_version_id, old_youtube_id, new_youtube_id, changed_by, reason)
    VALUES
      (${input.songVersionId}::uuid, ${oldYoutubeId}, ${newYoutubeId}, ${admin.id}, ${input.reason})
  `);

  // Step 6: spawn orchestrator detached (D-09, SWAP-T-02)
  // Using 'npx tsx' so the script gets all node_modules resolution.
  const stepsArg = input.steps.join(",");
  const scriptPath = path.resolve(
    process.cwd(),
    "scripts/seed/swap-video-pipeline.ts"
  );
  const spawnArgs = [
    "tsx",
    scriptPath,
    `--slug=${input.slug}`,
    `--new-youtube-id=${newYoutubeId}`,
    `--steps=${stepsArg}`,
  ];
  if (input.isRetry && input.resumeFrom) {
    spawnArgs.push(`--resume-from=${input.resumeFrom}`);
  }

  const child = spawn("npx", spawnArgs, {
    detached: true,
    stdio: "ignore",
    env: process.env,
    cwd: process.cwd(),
  });
  child.unref(); // allow dev server to exit independently (SWAP-T-02)

  return { ok: true, jobStartedAt: new Date().toISOString(), newYoutubeId };
}
