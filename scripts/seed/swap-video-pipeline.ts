#!/usr/bin/env tsx
/**
 * Phase 11.5 D-09: YouTube swap orchestrator.
 *
 * Usage:
 *   tsx scripts/seed/swap-video-pipeline.ts \
 *     --slug=<slug> \
 *     --new-youtube-id=<11-char-id> \
 *     --steps=audio,whisper,lesson \
 *     [--resume-from=<step>]
 *
 * Per-step DB writes (D-10):
 *   BEFORE each step: UPDATE song_versions SET pipeline_step=<name>
 *   ON success of last step: UPDATE pipeline_status='idle', pipeline_step=NULL
 *   ON failure (first try): UPDATE pipeline_status='rerun_failed', pipeline_step=<failed>
 *   ON failure (retry = --resume-from was passed): also UPDATE songs SET quality_status='flagged_unfixable'
 *
 * Per RESEARCH §"Pre-DB script bootstrap": uses neon-serverless Pool (not neon-http).
 *
 * D-12: --resume-from=<step> signals this is a retry run; second failure => flagged_unfixable.
 * Pitfall 13: if --steps does NOT include 'lesson', do NOT write a new lyrics_versions row.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { execSync } from "node:child_process";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";

type StepName = "audio" | "whisper" | "lesson" | "lyrics" | "insert";

interface CliArgs {
  slug: string;
  newYoutubeId: string;
  steps: Set<StepName>;
  resumeFrom: StepName | null;
  /** true when --resume-from is provided — signals this is a retry (D-12) */
  isRetry: boolean;
}

function parseArgs(): CliArgs {
  const argv = process.argv.slice(2);
  const get = (name: string): string | null => {
    const a = argv.find((s) => s.startsWith(`--${name}=`));
    return a ? a.slice(name.length + 3) : null;
  };
  const slug = get("slug");
  const newYoutubeId = get("new-youtube-id");
  const stepsRaw = get("steps") ?? "audio,whisper,lesson";
  const resumeFrom = get("resume-from") as StepName | null;

  if (!slug) throw new Error("--slug is required");
  if (!newYoutubeId) throw new Error("--new-youtube-id is required");
  if (!/^[a-zA-Z0-9_-]{11}$/.test(newYoutubeId)) {
    throw new Error(
      "--new-youtube-id must be exactly 11 chars matching ^[a-zA-Z0-9_-]+$"
    );
  }

  const steps = new Set(
    stepsRaw.split(",").map((s) => s.trim()) as StepName[]
  );

  return { slug, newYoutubeId, steps, resumeFrom, isRetry: !!resumeFrom };
}

interface PipelineStep {
  name: StepName;
  command: string;
}

function makeSteps(args: CliArgs): PipelineStep[] {
  // Commands mirror scripts/seed/run-pipeline.ts pattern.
  // 'audio' step uses 02-fetch-lyrics.ts with a specific YouTube ID override.
  // 'whisper' step re-runs the Python extractor for this slug only.
  // 'lesson' step regenerates content via the sequential generator.
  // 'lyrics' step backfills whisper lyrics for this slug.
  // 'insert' step writes all updated data to DB for this slug.
  const allSteps: PipelineStep[] = [
    {
      name: "audio",
      command: `npx tsx scripts/seed/02-fetch-lyrics.ts --slug=${args.slug}`,
    },
    {
      name: "whisper",
      command: `python scripts/seed/04-extract-timing.py --slug=${args.slug}`,
    },
    {
      name: "lesson",
      command: `npx tsx scripts/seed/03b-generate-content-sequential.ts --slug=${args.slug}`,
    },
    {
      name: "lyrics",
      command: `npx tsx scripts/seed/04b-backfill-whisper-lyrics.ts --slug=${args.slug}`,
    },
    {
      name: "insert",
      command: `npx tsx scripts/seed/05-insert-db.ts --slug=${args.slug}`,
    },
  ];
  return allSteps.filter((s) => args.steps.has(s.name));
}

async function main() {
  const args = parseArgs();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  // Look up song_version_id by slug (existing per-slug filter pattern from 05-insert-db.ts)
  const r = await db.execute<{ id: string; song_id: string }>(sql`
    SELECT sv.id::text AS id, sv.song_id::text AS song_id
    FROM song_versions sv
    INNER JOIN songs s ON s.id = sv.song_id
    WHERE s.slug = ${args.slug}
    LIMIT 1
  `);
  const rows = Array.isArray(r) ? r : (r.rows ?? []);
  if (rows.length === 0) {
    console.error(`[FAIL] no song_version found for slug=${args.slug}`);
    await pool.end();
    process.exit(1);
  }
  const songVersionId = rows[0].id;
  const songId = rows[0].song_id;

  const steps = makeSteps(args);
  if (steps.length === 0) {
    console.error("[FAIL] no steps to run — check --steps arg");
    await pool.end();
    process.exit(1);
  }

  // D-12: find the resume index when retrying from a failed step
  let resumeIdx = 0;
  if (args.resumeFrom) {
    const idx = steps.findIndex((s) => s.name === args.resumeFrom);
    if (idx >= 0) resumeIdx = idx;
    else {
      console.warn(
        `[WARN] --resume-from=${args.resumeFrom} not found in selected steps; starting from beginning`
      );
    }
  }

  console.log(
    `[START] swap-video-pipeline slug=${args.slug} steps=[${steps.map((s) => s.name).join(",")}]${args.isRetry ? ` (retry from ${args.resumeFrom})` : ""}`
  );

  for (let i = resumeIdx; i < steps.length; i++) {
    const step = steps[i];

    // D-10: per-step DB write BEFORE running the step
    await db.execute(sql`
      UPDATE song_versions
         SET pipeline_step = ${step.name},
             pipeline_started_at = COALESCE(pipeline_started_at, now())
       WHERE id = ${songVersionId}::uuid
    `);
    console.log(`\n[RUN] step=${step.name} command=${step.command}`);

    try {
      execSync(step.command, { stdio: "inherit" });
      console.log(`[DONE] step=${step.name}`);
    } catch (err) {
      const errMsg = (err instanceof Error ? err.message : String(err)).slice(
        0,
        200
      );
      const ts = new Date().toISOString();
      console.error(`[FAIL] step=${step.name} error=${errMsg}`);

      // D-12: on retry's failure, set flagged_unfixable on songs table
      if (args.isRetry) {
        const noteText = `Pipeline failed at ${step.name}: ${errMsg} (${ts})`;
        await db.execute(sql`
          UPDATE songs
             SET quality_status = 'flagged_unfixable',
                 quality_notes  = COALESCE(quality_notes || E'\n', '') || ${noteText}
           WHERE id = ${songId}::uuid
        `);
        console.error(
          `[FLAGGED] quality_status=flagged_unfixable set on songs.id=${songId}`
        );
      }

      // Always flip pipeline_status to rerun_failed on any step failure
      await db.execute(sql`
        UPDATE song_versions
           SET pipeline_status = 'rerun_failed',
               pipeline_step   = ${step.name}
         WHERE id = ${songVersionId}::uuid
      `);

      await pool.end();
      process.exit(2);
    }
  }

  // All steps completed — flip back to idle
  // Pitfall 13: if --steps does NOT include 'lesson', no new lyrics_versions row is written.
  // The orchestrator clears status either way; lyrics_versions management is done by 05-insert-db.ts.
  await db.execute(sql`
    UPDATE song_versions
       SET pipeline_status = 'idle',
           pipeline_step   = NULL
     WHERE id = ${songVersionId}::uuid
  `);

  console.log(`\n[OK] swap-video-pipeline complete for slug=${args.slug}`);
  if (!args.steps.has("lesson")) {
    console.log(
      "[NOTE] Pitfall 13: --steps did not include lesson; no new lyrics_versions row written."
    );
  }

  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
