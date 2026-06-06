/**
 * generate-scene-content.ts — Submit scenes to Claude Batch API for lesson generation.
 *
 * Reads data/scenes-manifest.json, uses WhisperX timing cache as dialogue text,
 * submits to Claude Batch API, validates with LessonSchema, writes to lessons-cache.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/generate-scene-content.ts
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/generate-scene-content.ts --slug=erwin-final-charge-aot
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/generate-scene-content.ts --limit 3
 */

import { config } from "dotenv";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { resolve, join } from "path";
import { fileURLToPath } from "url";

config({ path: ".env.local" });

import Anthropic from "@anthropic-ai/sdk";
import { LessonSchema, LESSON_JSON_SCHEMA } from "../types/lesson.js";
import { buildSceneLessonPrompt, type SceneManifestEntry, type DialogueSegment } from "../lib/scene-lesson-prompt.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../../");

const MANIFEST_PATH = join(ROOT, "data/scenes-manifest.json");
const TIMING_DIR = join(ROOT, "data/timing-cache");
const LESSONS_DIR = join(ROOT, "data/lessons-cache");

interface TimingWord {
  word: string;
  start: number;
  end: number;
  score: number;
}

interface TimingCache {
  slug: string;
  youtube_id: string;
  words?: TimingWord[];
  segments?: Array<{ start: number; end: number; text: string }>;
}

function wordsToSegments(words: TimingWord[]): DialogueSegment[] {
  if (!words.length) return [];
  const segs: DialogueSegment[] = [];
  let buf: TimingWord[] = [];
  let segStart = words[0].start;

  for (const w of words) {
    const gap = buf.length > 0 ? w.start - buf[buf.length - 1].end : 0;
    if (gap > 1.0 && buf.length > 0) {
      segs.push({ start: segStart, end: buf[buf.length - 1].end, text: buf.map((x) => x.word).join(" ").trim() });
      buf = [];
      segStart = w.start;
    }
    buf.push(w);
  }
  if (buf.length > 0) {
    segs.push({ start: segStart, end: buf[buf.length - 1].end, text: buf.map((x) => x.word).join(" ").trim() });
  }
  return segs.filter((s) => s.text.trim().length > 0);
}

function loadSegments(slug: string): DialogueSegment[] | null {
  const path = join(TIMING_DIR, `${slug}.json`);
  if (!existsSync(path)) return null;
  const timing: TimingCache = JSON.parse(readFileSync(path, "utf-8"));
  if (timing.segments?.length) {
    return timing.segments.map((s) => ({ start: s.start, end: s.end, text: s.text }));
  }
  if (timing.words?.length) {
    return wordsToSegments(timing.words);
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const slugArg = args.find((a) => a.startsWith("--slug="))?.split("=")[1];
  const limitArg = args.find((a) => a.startsWith("--limit="))?.split("=")[1];
  const limit = limitArg ? parseInt(limitArg, 10) : null;

  const manifest: SceneManifestEntry[] = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));

  let entries = slugArg ? manifest.filter((e) => e.slug === slugArg) : manifest;
  entries = entries.filter((e) => !existsSync(join(LESSONS_DIR, `${e.slug}.json`)));
  if (limit) entries = entries.slice(0, limit);

  if (entries.length === 0) {
    console.log("All scenes already have lessons cached.");
    return;
  }

  // Check which entries have timing data
  const ready = entries.filter((e) => {
    const segs = loadSegments(e.slug);
    if (!segs) {
      console.warn(`[SKIP] ${e.slug} — no timing cache (run 04-extract-timing.py first)`);
      return false;
    }
    return true;
  });

  if (ready.length === 0) {
    console.error("No scenes have timing data. Run the WhisperX step first.");
    process.exit(1);
  }

  console.log(`Submitting ${ready.length} scene(s) to Claude Batch API...`);
  mkdirSync(LESSONS_DIR, { recursive: true });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!, maxRetries: 3 });

  const requests = ready.map((scene) => {
    const segs = loadSegments(scene.slug)!;
    const prompt = buildSceneLessonPrompt(scene, segs);
    return {
      custom_id: scene.slug,
      params: {
        model: "claude-sonnet-4-6",
        max_tokens: 64000,
        messages: [{ role: "user" as const, content: prompt }],
        output_config: {
          format: { type: "json_schema", schema: LESSON_JSON_SCHEMA as unknown as Record<string, unknown> },
        } as unknown as Record<string, unknown>,
      },
    };
  });

  const batch = await client.messages.batches.create({ requests });
  console.log(`Batch submitted: ${batch.id}`);

  // Poll until done
  let status = await client.messages.batches.retrieve(batch.id);
  while (status.processing_status === "in_progress") {
    console.log(`[${new Date().toISOString()}] in_progress — ${JSON.stringify(status.request_counts)}`);
    await new Promise((r) => setTimeout(r, 30_000));
    status = await client.messages.batches.retrieve(batch.id);
  }
  console.log(`Batch complete: ${JSON.stringify(status.request_counts)}`);

  // Stream results
  let saved = 0;
  let failed = 0;
  for await (const result of await client.messages.batches.results(batch.id)) {
    const slug = result.custom_id;
    if (result.result.type !== "succeeded") {
      console.error(`[FAIL] ${slug}: ${result.result.type}`);
      failed++;
      continue;
    }
    try {
      const content = result.result.message.content[0];
      const raw = content.type === "text" ? JSON.parse(content.text) : (content as { type: "tool_use"; input: unknown }).input;
      const lesson = LessonSchema.parse(raw);
      const outPath = join(LESSONS_DIR, `${slug}.json`);
      writeFileSync(outPath, JSON.stringify(lesson, null, 2));
      console.log(`[OK] ${slug} → ${outPath}`);
      saved++;
    } catch (err) {
      console.error(`[FAIL] ${slug}: ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }

  console.log(`\nDone: ${saved} saved, ${failed} failed.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
