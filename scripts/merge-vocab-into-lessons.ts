/**
 * merge-vocab-into-lessons.ts — replace lesson vocabulary[] with the annotated
 * deterministic-extract output.
 *
 * Reads:
 *   data/vocab-annotated{,-tv}/<slug>.json  → { slug, vocabulary: [...] }
 *   data/lessons-cache{,-tv}/<slug>.json    → full lesson with old vocabulary[]
 *
 * Writes:
 *   data/lessons-cache{,-tv}/<slug>.json    → same lesson, vocabulary[] swapped
 *
 * Preserves all other lesson fields (verses, grammar_points, jlpt_level, etc.).
 * Any existing vocab_item_id UUIDs are dropped; the backfill script re-patches
 * them on the next run.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/merge-vocab-into-lessons.ts
 *   npx tsx ... scripts/merge-vocab-into-lessons.ts --slug=blue-bird-ikimonogakari
 *   npx tsx ... scripts/merge-vocab-into-lessons.ts --version=tv
 *   npx tsx ... scripts/merge-vocab-into-lessons.ts --dry-run
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";

interface Args {
  slug: string | null;
  version: "full" | "tv";
  dryRun: boolean;
}

function parseArgs(): Args {
  const args: Args = { slug: null, version: "full", dryRun: false };
  for (const raw of process.argv.slice(2)) {
    if (raw.startsWith("--slug=")) args.slug = raw.slice("--slug=".length);
    else if (raw === "--version=tv") args.version = "tv";
    else if (raw === "--version=full") args.version = "full";
    else if (raw === "--dry-run") args.dryRun = true;
  }
  return args;
}

function cachePaths(version: "full" | "tv") {
  const suffix = version === "tv" ? "-tv" : "";
  return {
    annotatedDir: resolve(`data/vocab-annotated${suffix}`),
    lessonsDir: resolve(`data/lessons-cache${suffix}`),
  };
}

async function main() {
  const args = parseArgs();
  const { annotatedDir, lessonsDir } = cachePaths(args.version);

  if (!existsSync(annotatedDir)) {
    console.error(`Annotated dir missing: ${annotatedDir}`);
    process.exit(1);
  }
  if (!existsSync(lessonsDir)) {
    console.error(`Lessons-cache dir missing: ${lessonsDir}`);
    process.exit(1);
  }

  const files = args.slug
    ? [`${args.slug}.json`]
    : readdirSync(annotatedDir).filter((f) => f.endsWith(".json"));

  console.log(`=== merge-vocab-into-lessons (${args.version})${args.dryRun ? " [dry-run]" : ""} ===`);
  console.log(`Annotated: ${annotatedDir}`);
  console.log(`Lessons:   ${lessonsDir}`);
  console.log(`Files:     ${files.length}\n`);

  let merged = 0;
  let skipped = 0;

  for (const file of files) {
    const annotPath = join(annotatedDir, file);
    const lessonPath = join(lessonsDir, file);

    if (!existsSync(annotPath)) {
      console.warn(`[skip] ${file} — no annotated file`);
      skipped++;
      continue;
    }
    if (!existsSync(lessonPath)) {
      console.warn(`[skip] ${file} — no lesson file`);
      skipped++;
      continue;
    }

    const annot = JSON.parse(readFileSync(annotPath, "utf8"));
    const lesson = JSON.parse(readFileSync(lessonPath, "utf8"));

    if (!Array.isArray(annot.vocabulary)) {
      console.warn(`[skip] ${file} — annotated.vocabulary not an array`);
      skipped++;
      continue;
    }

    const oldCount = Array.isArray(lesson.vocabulary) ? lesson.vocabulary.length : 0;
    const newCount = annot.vocabulary.length;

    lesson.vocabulary = annot.vocabulary;

    if (!args.dryRun) {
      writeFileSync(lessonPath, JSON.stringify(lesson, null, 2) + "\n", "utf8");
    }

    merged++;
    console.log(`[ok] ${file} — vocabulary: ${oldCount} → ${newCount}`);
  }

  console.log(`\n=== Summary ===`);
  console.log(`Merged:  ${merged}`);
  console.log(`Skipped: ${skipped}`);
  if (args.dryRun) console.log(`(dry-run; no files written)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
