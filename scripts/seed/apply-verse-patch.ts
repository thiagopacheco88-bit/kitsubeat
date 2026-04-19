/**
 * apply-verse-patch.ts — Merge a JSON patch of new verses into an existing lesson.
 *
 * Input: data/verse-patches/<slug>.json — {
 *   patches: [{ after_original: number, verse: Verse }]
 * }
 *
 * Output: updates data/lessons-cache/<slug>.json in place, renumbering
 * verse_number sequentially and preserving all other lesson fields.
 *
 * Usage:
 *   npx tsx scripts/seed/apply-verse-patch.ts <slug>
 *   npx tsx scripts/seed/apply-verse-patch.ts --all   # apply every patch file
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const LESSONS_DIR = join(ROOT, "data/lessons-cache");
const PATCHES_DIR = join(ROOT, ".planning/verse-patches");

type VerseToken = { surface: string };
type Verse = {
  verse_number: number;
  start_time_ms: number;
  end_time_ms: number;
  tokens: VerseToken[];
  translations: { en: string; "pt-BR": string; es: string };
  literal_meaning: { en: string };
};

type Patch = {
  patches: { after_original: number; verse: Omit<Verse, "verse_number"> }[];
};

const patchSig = (v: { tokens: VerseToken[] }): string =>
  v.tokens.map((t) => t.surface).join("");

function applyPatch(slug: string): { before: number; after: number; skipped: number } {
  const lessonPath = join(LESSONS_DIR, `${slug}.json`);
  const patchPath = join(PATCHES_DIR, `${slug}.json`);
  if (!existsSync(lessonPath)) throw new Error(`lesson missing: ${lessonPath}`);
  if (!existsSync(patchPath)) throw new Error(`patch missing: ${patchPath}`);

  const lesson = JSON.parse(readFileSync(lessonPath, "utf-8"));
  const patch: Patch = JSON.parse(readFileSync(patchPath, "utf-8"));
  const original: Verse[] = lesson.verses;
  const merged: Verse[] = [];
  let skipped = 0;
  for (let i = 0; i < original.length; i++) {
    const v = original[i];
    merged.push(v);
    for (const p of patch.patches) {
      if (p.after_original !== v.verse_number) continue;
      // Idempotency guard: if the very next verse in the current lesson already
      // matches this patch's verse (by surface signature), the patch was applied
      // in a prior run — skip it. Prevents the chorus-duplication regression
      // from 2026-04-19 (commit 43c0dac) that forced the neutralization of
      // dedupe-lesson-verses.ts.
      const patchSurface = patchSig(p.verse);
      const nextInOriginal = original[i + 1];
      if (nextInOriginal && patchSig(nextInOriginal) === patchSurface) {
        skipped++;
        continue;
      }
      merged.push({ verse_number: 0, ...p.verse });
    }
  }
  merged.forEach((v, i) => (v.verse_number = i + 1));
  lesson.verses = merged;
  writeFileSync(lessonPath, JSON.stringify(lesson, null, 2), "utf-8");
  return { before: original.length, after: merged.length, skipped };
}

const args = process.argv.slice(2);
if (args[0] === "--all") {
  const patches = readdirSync(PATCHES_DIR).filter((f) => f.endsWith(".json"));
  for (const f of patches) {
    const slug = f.replace(/\.json$/, "");
    const { before, after, skipped } = applyPatch(slug);
    console.log(
      `[ok] ${slug}: ${before} → ${after} verses${skipped ? ` (${skipped} patch(es) already applied — skipped)` : ""}`
    );
  }
} else if (args[0]) {
  const { before, after, skipped } = applyPatch(args[0]);
  console.log(
    `[ok] ${args[0]}: ${before} → ${after} verses${skipped ? ` (${skipped} patch(es) already applied — skipped)` : ""}`
  );
} else {
  console.error("usage: apply-verse-patch.ts <slug> | --all");
  process.exit(1);
}
