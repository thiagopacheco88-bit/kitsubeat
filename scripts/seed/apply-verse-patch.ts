/**
 * apply-verse-patch.ts — Merge a JSON patch of verse edits into an existing lesson.
 *
 * Input: .planning/verse-patches/<slug>.json — {
 *   patches: Array<
 *     | { after_original: number, verse: Verse }      // append mode (legacy)
 *     | { replace_verse_number: number, verse: Verse } // replace mode (Phase 11.3)
 *   >
 * }
 *
 * Execution order (D-11): all replace entries process first (in-place edit
 * — slot index preserved by the final renumber pass), then all append
 * entries process against the post-replace state.
 *
 * Output: updates data/lessons-cache/<slug>.json in place, renumbering
 * verse_number sequentially and preserving all other lesson fields.
 *
 * This module is BOTH a CLI entry point AND an importable library. The CLI
 * dispatch at the bottom is gated by an import.meta.url entry-point guard
 * so the Vitest fixture in apply-verse-patch.test.ts can `import { applyPatch }`
 * without triggering process.exit(1).
 *
 * Usage:
 *   npx tsx scripts/seed/apply-verse-patch.ts <slug>
 *   npx tsx scripts/seed/apply-verse-patch.ts --all   # apply every patch file
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath, pathToFileURL } from "url";

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

// Discriminated-union of the two patch entry shapes. `after_original` is the
// legacy append mode; `replace_verse_number` is the Phase 11.3 in-place edit
// mode. Both shapes coexist in a single .planning/verse-patches/<slug>.json.
type AppendPatch = { after_original: number; verse: Omit<Verse, "verse_number"> };
type ReplacePatch = { replace_verse_number: number; verse: Omit<Verse, "verse_number"> };
type PatchEntry = AppendPatch | ReplacePatch;
type Patch = { patches: PatchEntry[] };

const patchSig = (v: { tokens: VerseToken[] }): string =>
  v.tokens.map((t) => t.surface).join("");

// Extended signature for replace-mode idempotency: surface concat AND verse-level
// English translation. Phase 11.3 fixes verses where tokens are already correct
// but translations are stub `(untranslated)` / `(auto-coverage) ...` placeholders;
// surface-only patchSig would treat those as "already applied" and skip the fix.
// Append-mode keeps surface-only patchSig — its concern is duplicate appends, not
// translation upgrades.
const patchSigWithTr = (v: {
  tokens: VerseToken[];
  translations: { en: string };
}): string => `${patchSig(v)}␟${v.translations.en}`;

export function applyPatch(slug: string): { before: number; after: number; skipped: number } {
  const lessonPath = join(LESSONS_DIR, `${slug}.json`);
  const patchPath = join(PATCHES_DIR, `${slug}.json`);
  if (!existsSync(lessonPath)) throw new Error(`lesson missing: ${lessonPath}`);
  if (!existsSync(patchPath)) throw new Error(`patch missing: ${patchPath}`);

  const lesson = JSON.parse(readFileSync(lessonPath, "utf-8"));
  const patch: Patch = JSON.parse(readFileSync(patchPath, "utf-8"));
  const original: Verse[] = lesson.verses;
  const merged: Verse[] = [];
  let skipped = 0;

  // Pass 1 (D-11): build the replace map from any replace_verse_number entries.
  // Replaces happen in-place — the per-verse loop below applies them before
  // running the append loop, so the post-replace state is what appends operate on.
  //
  // Idempotency: a replace must skip on re-apply. We can't use the
  // "current-verse-at-verse_number-N has matching signature" check naïvely,
  // because the final renumber pass after an apply that mixes replace+append
  // shifts the verse_number of the replaced row (any append BEFORE it bumps
  // the slot index). Instead, before populating the map, scan the whole
  // original lesson — if the replacement's signature already exists ANYWHERE
  // in the lesson, the patch was applied in a prior run; do not enroll it
  // into the active replace map. Signature collisions on real lyrics are
  // vanishingly unlikely (multi-token surface concat) — same primitive the
  // append-mode idempotency check at lines below uses.
  const replaceMap = new Map<number, Omit<Verse, "verse_number">>();
  for (const p of patch.patches) {
    if (!("replace_verse_number" in p)) continue;
    const replSig = patchSigWithTr(p.verse);
    const alreadyApplied = original.some((v) => patchSigWithTr(v) === replSig);
    if (alreadyApplied) {
      skipped++;
    } else {
      replaceMap.set(p.replace_verse_number, p.verse);
    }
  }

  // Split out append entries so the per-verse loop iterates only those (not
  // the full mixed list, which would re-trigger replaces inside the append loop).
  const appendPatches: AppendPatch[] = patch.patches.filter(
    (p): p is AppendPatch => "after_original" in p,
  );

  // Walk every original verse. For each: apply replace (if any) → push the
  // resulting verse → run append loop for any after_original matches against
  // this original verse_number. The renumber pass at the bottom assigns the
  // final sequential verse_number, so replaced verses keep their slot.
  for (let i = 0; i < original.length; i++) {
    const v = original[i];
    const replacement = replaceMap.get(v.verse_number);
    if (replacement) {
      // In-place edit: keep the slot (renumber pass below sets verse_number),
      // replace the body. Idempotency was already enforced when replaceMap was
      // built — entries whose (surface, translations.en) signature already
      // exists in `original` were filtered out, so reaching here means the
      // swap is wanted.
      //
      // Cache-side timing preservation: when the patch's start_time_ms /
      // end_time_ms are 0 (e.g. translation-only fixes from Phase 11.3 where
      // the drafter has no audio), keep the existing verse's timing instead
      // of overwriting it with 0. A non-zero patch value still wins (covers
      // the rare case a future patch deliberately sets timing).
      const start_time_ms = replacement.start_time_ms || v.start_time_ms;
      const end_time_ms = replacement.end_time_ms || v.end_time_ms;
      merged.push({ verse_number: 0, ...replacement, start_time_ms, end_time_ms });
    } else {
      merged.push(v);
    }

    // Append loop — iterate appendPatches (NOT patch.patches) so replaces
    // don't re-fire inside this loop. Idempotency guard: if the very next
    // verse in the original lesson already matches this patch's verse (by
    // surface signature), the patch was applied in a prior run — skip it.
    // Prevents the chorus-duplication regression from 2026-04-19 (commit
    // 43c0dac) that forced the neutralization of dedupe-lesson-verses.ts.
    for (const p of appendPatches) {
      if (p.after_original !== v.verse_number) continue;
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

// Node ESM entry-point guard — equivalent to CommonJS `require.main === module`.
// When this module is invoked as a CLI (npx tsx scripts/seed/apply-verse-patch.ts
// <slug>), process.argv[1] points at this file, isMain is true, and the CLI
// dispatch runs. When the module is imported (e.g. from Vitest), process.argv[1]
// points at the importer's entry, isMain is false, and the CLI block is a no-op
// — preventing the `process.exit(1)` in the else branch from killing the test
// runner.
const isMain =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv[1] != null &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const args = process.argv.slice(2);
  if (args[0] === "--all") {
    const patches = readdirSync(PATCHES_DIR).filter((f) => f.endsWith(".json"));
    for (const f of patches) {
      const slug = f.replace(/\.json$/, "");
      const { before, after, skipped } = applyPatch(slug);
      console.log(
        `[ok] ${slug}: ${before} → ${after} verses${skipped ? ` (${skipped} patch(es) already applied — skipped)` : ""}`,
      );
    }
  } else if (args[0]) {
    const slug = args[0];
    const { before, after, skipped } = applyPatch(slug);
    console.log(
      `[ok] ${slug}: ${before} → ${after} verses${skipped ? ` (${skipped} patch(es) already applied — skipped)` : ""}`,
    );
    try {
      const { revalidateSongCache } = await import("../../src/app/actions/cache.js");
      await revalidateSongCache(slug);
    } catch {
      // Expected to fail outside Next.js server context — not fatal.
    }
  } else {
    console.error("usage: apply-verse-patch.ts <slug> | --all");
    process.exit(1);
  }
}
