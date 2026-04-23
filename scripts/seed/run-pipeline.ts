/**
 * run-pipeline.ts — KitsuBeat content pipeline orchestrator
 *
 * Runs all seed steps in sequence with checkpoint/resume:
 *   Step 1:  Build manifest       (01-build-manifest.ts)
 *   Step 2:  Fetch lyrics         (02-fetch-lyrics.ts)
 *   Step 3:  Extract timing       (04-extract-timing.py --batch)
 *   Step 4:  Detect beats         (04c-detect-beats.py --all)   [NEW]
 *   Step 5:  Validate lyrics      (03b-validate-lyrics-vs-whisper.ts)
 *   Step 6:  Backfill lyrics      (04b-backfill-whisper-lyrics.ts — uses beats)
 *   Step 7:  Validate retime      (validate-retime.ts)          [NEW]
 *   Step 8:  Generate content     (03-generate-content.ts)
 *   Step 9:  Push DB schema       (drizzle-kit push)
 *   Step 10: Insert into DB       (05-insert-db.ts)
 *
 * Checkpoint detection: each step checks for the presence of its expected
 * output before running. If output already exists, the step is skipped.
 *
 * Usage:
 *   npx tsx scripts/seed/run-pipeline.ts              # Run all pending steps
 *   npx tsx scripts/seed/run-pipeline.ts --dry-run    # Show what would run
 *   npx tsx scripts/seed/run-pipeline.ts --from 3     # Start from step 3
 *   npx tsx scripts/seed/run-pipeline.ts --step 2     # Run only step 2
 *
 * Environment variables (from .env.local):
 *   Steps 1:       YOUTUBE_API_KEY (Spotify gracefully skipped — API locked since Mar 2025)
 *   Step 6:        ANTHROPIC_API_KEY
 *   Steps 7-8:     DATABASE_URL
 */

import { config } from "dotenv";
import { execSync } from "child_process";
import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";

// Load env vars before any check
config({ path: ".env.local" });

// ──────────────────────────────────────────────────────────────────────────────
// CLI arg parsing
// ──────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const fromIdx = args.includes("--from")
  ? parseInt(args[args.indexOf("--from") + 1], 10)
  : null;
const stepOnly = args.includes("--step")
  ? parseInt(args[args.indexOf("--step") + 1], 10)
  : null;

// ──────────────────────────────────────────────────────────────────────────────
// Step definitions
// ──────────────────────────────────────────────────────────────────────────────

type StepStatus = "pending" | "skipped" | "completed" | "failed";

interface PipelineStep {
  number: number;
  name: string;
  command: string;
  /** Returns true if the step's output already exists and can be skipped */
  isComplete: () => boolean;
  /** Env vars required before this step runs */
  requiredEnvVars: string[];
}

const MANIFEST_PATH = "data/songs-manifest.json";
const LYRICS_CACHE_DIR = "data/lyrics-cache";
const TIMING_CACHE_DIR = "data/timing-cache";
const LESSONS_CACHE_DIR = "data/lessons-cache";
const BEAT_CACHE_DIR = "data/beat-cache";
const AUDIO_DIR = "public/audio";

function countFilesInDir(dir: string): number {
  if (!existsSync(dir)) return 0;
  try {
    return readdirSync(dir).filter((f) => f.endsWith(".json")).length;
  } catch {
    return 0;
  }
}

function getManifestCount(): number {
  if (!existsSync(MANIFEST_PATH)) return 0;
  try {
    const data = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return 0;
  }
}

function hasPendingWhisperEntries(): boolean {
  if (!existsSync(LYRICS_CACHE_DIR)) return false;
  try {
    const files = readdirSync(LYRICS_CACHE_DIR).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const content = readFileSync(join(LYRICS_CACHE_DIR, file), "utf-8");
      const parsed = JSON.parse(content);
      if (parsed.source === "pending_whisper") return true;
    }
    return false;
  } catch {
    return false;
  }
}

const STEPS: PipelineStep[] = [
  {
    number: 1,
    name: "Build manifest (Jikan + Spotify + AniDB + YouTube)",
    command: "npx tsx --tsconfig tsconfig.scripts.json scripts/seed/01-build-manifest.ts",
    isComplete: () => {
      const count = getManifestCount();
      if (count >= 200) return true;
      if (count > 0) {
        console.log(`    [Note] Manifest exists with ${count} songs (target: 200) — may need more YouTube quota`);
        return false;
      }
      return false;
    },
    requiredEnvVars: ["YOUTUBE_API_KEY"],
  },
  {
    number: 2,
    name: "Fetch lyrics (LRCLIB + Genius fallback + kuroshiro tokenization)",
    command: "npx tsx --tsconfig tsconfig.scripts.json scripts/seed/02-fetch-lyrics.ts",
    isComplete: () => {
      const manifestCount = getManifestCount();
      const lyricsCount = countFilesInDir(LYRICS_CACHE_DIR);
      if (manifestCount === 0) return false;
      return lyricsCount >= manifestCount;
    },
    requiredEnvVars: [], // GENIUS_API_KEY is optional
  },
  {
    number: 3,
    name: "Extract timing via WhisperX (word-level timestamps per song)",
    command: "python scripts/seed/04-extract-timing.py --batch data/songs-manifest.json --output-dir data/timing-cache",
    isComplete: () => {
      const timingCount = countFilesInDir(TIMING_CACHE_DIR);
      // Consider complete if there's at least 1 timing file; batch may run per-song
      return timingCount > 0;
    },
    requiredEnvVars: [],
  },
  {
    number: 4,
    name: "Detect beats via librosa (tempo grid for adaptive verse breaks)",
    command: "python scripts/seed/04c-detect-beats.py --all",
    isComplete: () => {
      // Complete when every mp3 has a matching beat-cache entry.
      if (!existsSync(AUDIO_DIR)) return true; // nothing to analyse
      const audioCount = readdirSync(AUDIO_DIR).filter((f) => f.endsWith(".mp3")).length;
      if (audioCount === 0) return true;
      const beatCount = countFilesInDir(BEAT_CACHE_DIR);
      return beatCount >= audioCount;
    },
    requiredEnvVars: [],
  },
  {
    number: 5,
    name: "Validate lyrics against WhisperX (flag mismatches, auto-demote clear wrongs)",
    command: "npx tsx --tsconfig tsconfig.scripts.json scripts/seed/03b-validate-lyrics-vs-whisper.ts",
    isComplete: () => {
      // Always re-run: the validator is fast and idempotent (quarantines rejects
      // so a second pass has nothing left to flip). The generated report is the
      // human-facing output — we want it fresh every pipeline run.
      return false;
    },
    requiredEnvVars: [],
  },
  {
    number: 6,
    name: "Backfill pending_whisper lyrics from WhisperX + beat-cache",
    command: "npx tsx --tsconfig tsconfig.scripts.json scripts/seed/04b-backfill-whisper-lyrics.ts",
    isComplete: () => {
      // Complete if no pending_whisper entries remain in lyrics-cache
      return !hasPendingWhisperEntries();
    },
    requiredEnvVars: [],
  },
  {
    number: 7,
    name: "Validate retime (intro padding, verse drift, cursor-skip)",
    command: "npx tsx --tsconfig tsconfig.scripts.json scripts/seed/validate-retime.ts",
    isComplete: () => {
      // Always re-run — the report is fresh every pipeline pass and the
      // validator is read-only.
      return false;
    },
    requiredEnvVars: [],
  },
  {
    number: 8,
    name: "Generate lesson content via Claude Batch API",
    command: "npx tsx --tsconfig tsconfig.scripts.json scripts/seed/03-generate-content.ts",
    isComplete: () => {
      const manifestCount = getManifestCount();
      const lessonsCount = countFilesInDir(LESSONS_CACHE_DIR);
      if (manifestCount === 0) return false;
      return lessonsCount >= manifestCount;
    },
    requiredEnvVars: ["ANTHROPIC_API_KEY"],
  },
  {
    number: 9,
    name: "Push DB schema to Neon Postgres (drizzle-kit push)",
    command: "npx drizzle-kit push",
    isComplete: () => {
      // Check: DATABASE_URL is set (we can't actually ping DB without connecting)
      // This step is considered pending unless the user manually marks it done
      // We check for the presence of the drizzle migration folder as a proxy
      return existsSync("drizzle") && readdirSync("drizzle").some((f) => f.endsWith(".sql"));
    },
    requiredEnvVars: ["DATABASE_URL"],
  },
  {
    number: 10,
    name: "Insert songs and lessons into Neon Postgres",
    command: "npx tsx --tsconfig tsconfig.scripts.json scripts/seed/05-insert-db.ts",
    isComplete: () => {
      // No local artifact to check; assume not done unless user confirms
      // In practice: run after Step 9 succeeds
      return false;
    },
    requiredEnvVars: ["DATABASE_URL"],
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Env var validation
// ──────────────────────────────────────────────────────────────────────────────

function validateEnvVars(step: PipelineStep): { valid: boolean; missing: string[] } {
  const missing = step.requiredEnvVars.filter((v) => !process.env[v]);
  return { valid: missing.length === 0, missing };
}

// ──────────────────────────────────────────────────────────────────────────────
// Pipeline runner
// ──────────────────────────────────────────────────────────────────────────────

async function runPipeline() {
  console.log("=".repeat(65));
  console.log("KitsuBeat Content Pipeline");
  console.log(`Mode: ${isDryRun ? "DRY RUN" : stepOnly ? `Step ${stepOnly} only` : fromIdx ? `From step ${fromIdx}` : "Full run (with checkpoint/resume)"}`);
  console.log("=".repeat(65));

  // Filter steps based on CLI flags
  let stepsToConsider = STEPS;
  if (stepOnly !== null) {
    stepsToConsider = STEPS.filter((s) => s.number === stepOnly);
    if (stepsToConsider.length === 0) {
      console.error(`[Error] Step ${stepOnly} does not exist. Valid steps: 1-10.`);
      process.exit(1);
    }
  }

  const results: { step: PipelineStep; status: StepStatus }[] = [];

  for (const step of STEPS) {
    const shouldConsider = stepsToConsider.includes(step);
    const isForced = fromIdx !== null && step.number >= fromIdx;

    // Determine completion status
    let isAlreadyComplete = false;
    if (!isForced) {
      try {
        isAlreadyComplete = step.isComplete();
      } catch (err) {
        // If check fails, treat as not complete
        isAlreadyComplete = false;
      }
    }

    if (!shouldConsider) {
      // Not in the steps we're running — mark as skipped for display
      results.push({ step, status: "skipped" });
      continue;
    }

    if (isAlreadyComplete && !isForced) {
      console.log(`\n[SKIP] Step ${step.number}: ${step.name}`);
      console.log(`       Output already exists — skipping.`);
      results.push({ step, status: "skipped" });
      continue;
    }

    // Validate env vars
    const { valid, missing } = validateEnvVars(step);

    // Show what would run (dry-run) — env var check is informational only
    if (isDryRun) {
      console.log(`\n[WOULD RUN] Step ${step.number}: ${step.name}`);
      console.log(`            Command: ${step.command}`);
      if (!valid) {
        console.log(`            [WARN] Missing env vars: ${missing.join(", ")}`);
      }
      results.push({ step, status: "pending" });
      continue;
    }

    if (!valid) {
      console.log(`\n[BLOCK] Step ${step.number}: ${step.name}`);
      console.log(`        Missing required environment variables:`);
      for (const v of missing) {
        console.log(`          - ${v}`);
      }
      console.log(`        Add these to .env.local and retry.`);
      results.push({ step, status: "failed" });

      // Stop pipeline — dependent steps cannot run
      console.log(`\n[STOP] Pipeline halted at Step ${step.number} due to missing env vars.`);
      break;
    }

    // Execute the step
    console.log(`\n[RUN] Step ${step.number}: ${step.name}`);
    console.log(`      Command: ${step.command}`);
    console.log("-".repeat(65));

    try {
      execSync(step.command, { stdio: "inherit" });
      console.log("-".repeat(65));
      console.log(`[DONE] Step ${step.number}: ${step.name}`);
      results.push({ step, status: "completed" });
    } catch (err) {
      console.log("-".repeat(65));
      console.error(`[FAIL] Step ${step.number}: ${step.name}`);
      console.error(`       Exit code: ${(err as NodeJS.ErrnoException).message ?? "unknown"}`);
      results.push({ step, status: "failed" });

      // Stop pipeline — dependent steps cannot run
      console.log(`\n[STOP] Pipeline halted at Step ${step.number}. Fix the error and re-run.`);
      break;
    }
  }

  // ── Summary table ──────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(65));
  console.log("Pipeline Summary");
  console.log("=".repeat(65));
  console.log(
    `${"Step".padEnd(6)}${"Status".padEnd(12)}Name`
  );
  console.log("-".repeat(65));

  for (const { step, status } of results) {
    const icon =
      status === "completed"
        ? "[DONE]  "
        : status === "skipped"
        ? "[SKIP]  "
        : status === "failed"
        ? "[FAIL]  "
        : "[PENDING]";

    console.log(
      `${String(step.number).padEnd(6)}${icon.padEnd(12)}${step.name}`
    );
  }

  console.log("=".repeat(65));

  const failed = results.filter((r) => r.status === "failed").length;
  const completed = results.filter((r) => r.status === "completed").length;
  const skipped = results.filter((r) => r.status === "skipped").length;

  if (isDryRun) {
    console.log(`Dry run complete. ${results.filter((r) => r.status === "pending").length} step(s) would run.`);
    console.log(`Remove --dry-run to execute.`);
  } else if (failed > 0) {
    console.log(`Result: ${completed} completed, ${skipped} skipped, ${failed} FAILED.`);
    process.exit(1);
  } else {
    console.log(`Result: ${completed} completed, ${skipped} skipped. Pipeline OK.`);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Entry point
// ──────────────────────────────────────────────────────────────────────────────

runPipeline().catch((err) => {
  console.error("[Fatal] Pipeline runner crashed:", err);
  process.exit(1);
});
