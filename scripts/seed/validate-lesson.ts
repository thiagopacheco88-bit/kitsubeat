/**
 * validate-lesson.ts — Validate a lessons-cache JSON file against LessonSchema.
 *
 * Run before 05-insert-db to catch schema issues without a DB round-trip.
 * Common catches:
 *   - additional_examples must be string[], not object[]
 *   - compound_note for single-kanji entries: omit key (undefined), never null
 *   - vocab_item_id: omit key when not yet backfilled (undefined, not null)
 *
 * Usage:
 *   npx tsx scripts/seed/validate-lesson.ts <slug>
 *   npx tsx scripts/seed/validate-lesson.ts angel-and-devil-gren-boyz
 *   npm run validate:lesson -- <slug>
 */

import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { LessonSchema } from "../types/lesson.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../../");

const slug = process.argv[2];
if (!slug) {
  console.error("usage: validate-lesson.ts <slug>");
  process.exit(1);
}

const lessonPath = join(ROOT, "data/lessons-cache", `${slug}.json`);
if (!existsSync(lessonPath)) {
  console.error(`[validate] No lesson cache found: ${lessonPath}`);
  process.exit(1);
}

const raw = JSON.parse(readFileSync(lessonPath, "utf-8"));
const result = LessonSchema.safeParse(raw);

if (result.success) {
  const { verses, vocabulary, grammar_points } = result.data;
  console.log(`[validate] ✓ ${slug}`);
  console.log(`  verses:        ${verses.length}`);
  console.log(`  vocabulary:    ${vocabulary.length} (${vocabulary.filter(v => v.vocab_item_id).length} with vocab_item_id)`);
  console.log(`  grammar_points: ${grammar_points.length}`);
  process.exit(0);
} else {
  console.error(`[validate] ✗ ${slug} — ${result.error.issues.length} issue(s):`);
  for (const issue of result.error.issues) {
    const path = issue.path.join(".");
    console.error(`  ${path}: ${issue.message} (expected ${issue.expected ?? "?"}, got ${issue.received ?? "?"})`);
  }
  process.exit(1);
}
