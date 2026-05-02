/**
 * 20-comfyui-batch-images.ts — Phase 11.6 batch driver. Generates a mnemonic
 * image for every vocabulary_items row where image_url IS NULL via a local
 * ComfyUI HTTP API (SDXL-Lightning, 4-step), writes PNG to
 * public/vocab-images/<vocab_item_id>.png, and UPDATEs vocabulary_items.image_url.
 * idempotent: re-runs skip already-populated rows; zero ComfyUI calls when done.
 *
 * Idempotency:
 *   - Per-row commit (NO transaction wrapper) — partial progress survives Ctrl-C / OOM.
 *   - Skip rows where image_url IS NOT NULL (re-runs are no-ops for already-populated).
 *   - Re-runs are zero-cost when fully populated (SPEC-REQ-8 acceptance).
 *
 * GPU detection (CONTEXT D-05):
 *   - Probes nvidia-smi at startup; selects model based on VRAM:
 *     >=8GB -> SDXL-Lightning (4-step)
 *     4-7GB -> SD 1.5 Turbo (1-step)
 *     <4GB or no NVIDIA -> fail with actionable error message.
 *
 * Threat T-11.6-02-01 mitigation: COMFYUI_URL must resolve to loopback 127.0.0.1
 *   (warns and aborts otherwise -- RCE/info-disclosure risk per CONTEXT D-10).
 *
 * Usage:
 *   npm run gen-image                          # full batch (only NULL rows)
 *   npm run gen-image -- --regenerate <uuid>   # one-shot retry per CONTEXT D-11
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { eq, isNull } from "drizzle-orm";
import {
  readFileSync, writeFileSync, mkdirSync, existsSync, statSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { execSync } from "node:child_process";
import { setTimeout as wait } from "node:timers/promises";
import { vocabularyItems } from "../../src/lib/db/schema.js";
import { getDb } from "../../src/lib/db/index.js";
import { localize, type Localizable } from "../../src/lib/types/lesson.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COMFYUI_URL = process.env.COMFYUI_URL ?? "http://127.0.0.1:8188";
const COMFYUI_OUTPUT_DIR = process.env.COMFYUI_OUTPUT_DIR; // required at runtime
const OUTPUT_DIR = resolve(process.cwd(), "public/vocab-images");
const WORKFLOW_PATH = resolve(process.cwd(), "scripts/seed/comfyui-workflows/mnemonic-flat.json");
const NEGATIVE_PROMPT = "text, words, letters, photorealistic, anime, manga, dark background, complex composition"; // CONTEXT D-06 -- locked
const PROMPT_TEMPLATE = (meaning: string, pos: string): string =>
  `flat illustration of: ${meaning} (${pos}), white background, no text, simple composition, clean lines, soft pastel colors`; // CONTEXT D-07 -- locked
const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_ITERATIONS = 120; // 120 * 1000ms = 2 min cap per image

// ---------------------------------------------------------------------------
// GPU probe (RESEARCH §Pattern 2 lines 350-384)
// ---------------------------------------------------------------------------

function probeVramMb(): number | null {
  try {
    const stdout = execSync(
      "nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits",
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], windowsHide: true }
    );
    const firstLine = stdout.trim().split("\n")[0];
    const mb = parseInt(firstLine, 10);
    return Number.isFinite(mb) && mb > 0 ? mb : null;
  } catch { return null; }
}

function selectModel(vramMb: number | null): { ckpt: string; steps: number } {
  if (vramMb === null) {
    throw new Error("[gpu-probe] No NVIDIA GPU detected. nvidia-smi missing from PATH or no NVIDIA GPU. Local image gen needs >=4GB VRAM. Install nvidia-smi or skip this batch.");
  }
  if (vramMb >= 8000) return { ckpt: "sdxl_lightning_4step.safetensors", steps: 4 };
  if (vramMb >= 4000) return { ckpt: "sd_turbo.safetensors", steps: 1 };
  throw new Error(`[gpu-probe] VRAM ${vramMb}MB < 4GB minimum. Local image gen unavailable.`);
}

// ---------------------------------------------------------------------------
// ComfyUI invocation (RESEARCH §Pattern 1 + EXDEV mitigation from Pitfall 2)
// ---------------------------------------------------------------------------

type HistoryEntry = {
  outputs?: {
    "9"?: {
      images?: Array<{ filename: string; subfolder: string; type: string }>;
    };
  };
};

async function generateImage(workflowJson: object, positivePrompt: string, outputPath: string): Promise<void> {
  // Inject prompt + random seed into workflow nodes
  const wf = JSON.parse(JSON.stringify(workflowJson)) as Record<string, {
    inputs: Record<string, unknown>;
  }>;
  wf["6"].inputs["text"] = positivePrompt;
  wf["7"].inputs["text"] = NEGATIVE_PROMPT;
  wf["3"].inputs["seed"] = Math.floor(Math.random() * 1e15);

  const queueResp = await fetch(`${COMFYUI_URL}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: wf, client_id: "kitsubeat-batch" }),
  });
  if (!queueResp.ok) throw new Error(`ComfyUI /prompt failed: ${queueResp.status}`);
  const { prompt_id } = (await queueResp.json()) as { prompt_id: string };

  // Poll /history/<prompt_id> until image appears
  for (let i = 0; i < POLL_TIMEOUT_ITERATIONS; i++) {
    await wait(POLL_INTERVAL_MS);
    const histResp = await fetch(`${COMFYUI_URL}/history/${prompt_id}`);
    if (!histResp.ok) continue;
    const hist = (await histResp.json()) as Record<string, HistoryEntry>;
    const entry = hist[prompt_id];
    const img = entry?.outputs?.["9"]?.images?.[0];
    if (img) {
      if (!COMFYUI_OUTPUT_DIR) {
        throw new Error("[fs] COMFYUI_OUTPUT_DIR is not set. Set it to ComfyUI's output/ absolute path. See RESEARCH §Pitfall 2.");
      }
      const srcPath = join(COMFYUI_OUTPUT_DIR, img.subfolder ?? "", img.filename);
      // EXDEV-safe: read+write instead of copyFileSync (cross-volume filesystem per Pitfall 2)
      const buf = readFileSync(srcPath);
      writeFileSync(outputPath, buf);
      // Sanity: file is non-trivial size (>1KB indicates valid PNG)
      const sz = statSync(outputPath).size;
      if (sz < 1024) throw new Error(`[fs] Generated PNG suspiciously small (${sz}B): ${outputPath}`);
      return;
    }
  }
  throw new Error(`ComfyUI generation timeout for prompt_id=${prompt_id}`);
}

// ---------------------------------------------------------------------------
// Loopback check — Threat T-11.6-02-01 mitigation (CONTEXT D-10)
// ---------------------------------------------------------------------------

function ensureLoopback(url: string): void {
  const u = new URL(url);
  const hostname = u.hostname;
  const isLoopback = hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
  if (!isLoopback) {
    throw new Error(`[security] COMFYUI_URL must resolve to a loopback address. Got: ${hostname}. ComfyUI on a non-loopback interface is an RCE/info-disclosure risk (CONTEXT D-10).`);
  }
}

// ---------------------------------------------------------------------------
// Main batch loop
// ---------------------------------------------------------------------------

async function runBatch(opts: { regenerateUuid?: string }): Promise<void> {
  ensureLoopback(COMFYUI_URL);
  const vramMb = probeVramMb();
  const model = selectModel(vramMb);
  console.log(`[gpu-probe] VRAM=${vramMb}MB -> model=${model.ckpt} steps=${model.steps}`);

  // Override workflow checkpoint based on probe (the JSON ships SDXL-Lightning by default)
  const workflowRaw = readFileSync(WORKFLOW_PATH, "utf8");
  const workflow = JSON.parse(workflowRaw) as Record<string, { inputs: Record<string, unknown> }>;
  workflow["4"].inputs["ckpt_name"] = model.ckpt;
  workflow["3"].inputs["steps"] = model.steps;

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const db = getDb();
  const rows = opts.regenerateUuid
    ? await db.select().from(vocabularyItems).where(eq(vocabularyItems.id, opts.regenerateUuid))
    : await db.select().from(vocabularyItems).where(isNull(vocabularyItems.image_url));

  console.log(`[batch] Rows to process: ${rows.length}`);
  let generated = 0, skipped = 0, failed = 0;

  for (const row of rows) {
    const outPath = join(OUTPUT_DIR, `${row.id}.png`);
    // Skip if file already exists AND DB has the URL (idempotent guard -- both layers must agree)
    if (!opts.regenerateUuid && existsSync(outPath) && row.image_url) {
      skipped++;
      continue;
    }
    try {
      const meaningEn = localize(row.meaning as Localizable, "en");
      const prompt = PROMPT_TEMPLATE(meaningEn ?? "", row.part_of_speech ?? "noun");
      await generateImage(workflow, prompt, outPath);
      // Per-row commit -- partial progress survives crashes (matches 11-enrich-vocab.ts:152-158)
      await db
        .update(vocabularyItems)
        .set({ image_url: `/vocab-images/${row.id}.png` })
        .where(eq(vocabularyItems.id, row.id));
      generated++;
      console.log(`[ok] ${row.dictionary_form} (${row.id})`);
    } catch (e) {
      failed++;
      console.error(`[fail] ${row.dictionary_form} (${row.id}):`, e instanceof Error ? e.message : e);
      // Continue -- partial progress per Pitfall 2/RESEARCH; do not throw out of loop
    }
  }
  console.log(`[batch] Done. generated=${generated} skipped=${skipped} failed=${failed}`);
}

// ---------------------------------------------------------------------------
// CLI arg parsing + invocation guard
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): { regenerateUuid?: string } {
  const idx = argv.indexOf("--regenerate");
  if (idx >= 0 && argv[idx + 1]) return { regenerateUuid: argv[idx + 1] };
  return {};
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  await runBatch(opts);
}

if (process.argv[1]?.endsWith("20-comfyui-batch-images.ts")) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
