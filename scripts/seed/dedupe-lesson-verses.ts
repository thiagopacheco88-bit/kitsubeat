/**
 * dedupe-lesson-verses.ts — Remove duplicate verses from lessons-cache JSONs.
 *
 * Duplicates can occur when apply-verse-patch.ts is re-run on an already-
 * patched lesson (the patch is idempotent per insertion point, not globally).
 *
 * Two verses are duplicates if their concatenated-surface-tokens match.
 * Keeps the first occurrence and renumbers verse_number sequentially.
 *
 * Usage:
 *   npx tsx scripts/seed/dedupe-lesson-verses.ts
 */

import { readFileSync, readdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const LESSONS_DIR = join(ROOT, "data/lessons-cache");

type Verse = {
  verse_number: number;
  tokens: { surface: string }[];
  [k: string]: unknown;
};

let totalRemoved = 0;
let affectedFiles = 0;

for (const file of readdirSync(LESSONS_DIR).filter((f) => f.endsWith(".json"))) {
  const path = join(LESSONS_DIR, file);
  const lesson = JSON.parse(readFileSync(path, "utf-8"));
  const verses: Verse[] = lesson.verses ?? [];
  const seen = new Set<string>();
  const kept: Verse[] = [];
  for (const v of verses) {
    const sig = v.tokens.map((t) => t.surface).join("");
    if (seen.has(sig)) continue;
    seen.add(sig);
    kept.push(v);
  }
  const removed = verses.length - kept.length;
  if (removed > 0) {
    kept.forEach((v, i) => (v.verse_number = i + 1));
    lesson.verses = kept;
    writeFileSync(path, JSON.stringify(lesson, null, 2), "utf-8");
    console.log(`[dedupe] ${file.replace(".json", "")}: ${verses.length} → ${kept.length} (-${removed})`);
    totalRemoved += removed;
    affectedFiles++;
  }
}

console.log(`\n${affectedFiles} file(s) changed, ${totalRemoved} duplicate verse(s) removed`);
