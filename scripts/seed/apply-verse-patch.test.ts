/**
 * apply-verse-patch.test.ts — Vitest fixture for the patch applier.
 *
 * Covers Phase 11.3 Plan 03 contract:
 *   - Test 0: Module is import-safe (entry-point guard prevents process.exit
 *     during import — without it, the CLI block would call process.exit(1)
 *     when Vitest imports the module with no slug arg in process.argv).
 *   - Test 1: Mixed patch (1 append + 1 replace) merges correctly with
 *     post-renumber positions intact.
 *   - Test 2: Idempotency — re-running on the patched lesson produces
 *     byte-identical output (replace's surface-sig guard + append's
 *     next-verse-sig guard both fire).
 *   - Test 3: Replace-only patch works (no append loop iterations).
 *   - Test 4: Append-only patch (legacy shape) preserves prior behavior.
 *   - Test 5: D-11 ordering — replace fires BEFORE append for the same
 *     original verse_number, leaving [replaced, appended] in that order.
 *
 * Fixture strategy: write a synthetic slug `__test_apply_patch_fixture__`
 * into the REAL `data/lessons-cache/` and `.planning/verse-patches/` dirs,
 * apply, assert against output, then unlink in afterEach. The synthetic slug
 * is unmistakable in any post-test ls so leakage is easy to spot.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, readFileSync, existsSync, unlinkSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { applyPatch } from "./apply-verse-patch.js";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const LESSONS_DIR = join(ROOT, "data/lessons-cache");
const PATCHES_DIR = join(ROOT, ".planning/verse-patches");
const SLUG = "__test_apply_patch_fixture__";
const lessonPath = join(LESSONS_DIR, `${SLUG}.json`);
const patchPath = join(PATCHES_DIR, `${SLUG}.json`);

type TokenLike = {
  surface: string;
  reading: string;
  romaji: string;
  grammar: string;
  grammar_color: string;
  meaning: { en: string; "pt-BR": string; es: string };
  jlpt_level: string;
};
type VerseLike = {
  verse_number: number;
  start_time_ms: number;
  end_time_ms: number;
  tokens: TokenLike[];
  translations: { en: string; "pt-BR": string; es: string };
  literal_meaning: { en: string };
};

/**
 * Build a minimal-but-schema-valid verse for fixtures.
 *
 * Note: token shape matches PATTERNS.md's live verse token shape (no
 * `kanji_breakdown` at token level). PATTERNS.md beats CONTEXT.md D-05.
 */
function makeVerse(n: number, surface: string): VerseLike {
  return {
    verse_number: n,
    start_time_ms: n * 1000,
    end_time_ms: n * 1000 + 500,
    tokens: [
      {
        surface,
        reading: surface,
        romaji: "x",
        grammar: "noun",
        grammar_color: "blue",
        meaning: { en: "x", "pt-BR": "x", es: "x" },
        jlpt_level: "N5",
      },
    ],
    translations: { en: surface, "pt-BR": surface, es: surface },
    literal_meaning: { en: surface },
  };
}

function writeLesson(verses: VerseLike[]): void {
  const lesson = {
    jlpt_level: "N5",
    difficulty_tier: "basic",
    verses,
    vocabulary: [],
    grammar_points: [],
  };
  writeFileSync(lessonPath, JSON.stringify(lesson, null, 2), "utf-8");
}

function writePatch(patches: unknown[]): void {
  writeFileSync(patchPath, JSON.stringify({ patches }, null, 2), "utf-8");
}

function readLessonVerses(): VerseLike[] {
  const lesson = JSON.parse(readFileSync(lessonPath, "utf-8"));
  return lesson.verses as VerseLike[];
}

beforeEach(() => {
  mkdirSync(LESSONS_DIR, { recursive: true });
  mkdirSync(PATCHES_DIR, { recursive: true });
  writeLesson([
    makeVerse(1, "A"),
    makeVerse(2, "B"),
    makeVerse(3, "C"),
    makeVerse(4, "D"),
  ]);
});

afterEach(() => {
  if (existsSync(lessonPath)) unlinkSync(lessonPath);
  if (existsSync(patchPath)) unlinkSync(patchPath);
});

describe("apply-verse-patch", () => {
  // Test 0: import-safety smoke — explicit defensive check.
  // Implicit: if Task 1's entry-point guard had been missing, the
  // `import { applyPatch }` at the top of this file would have triggered
  // `process.exit(1)` during module load and Vitest would have died before
  // any `it()` could register. Reaching this assertion proves import-safety.
  it("module is import-safe (entry-point guard prevents process.exit during import)", async () => {
    const mod = await import("./apply-verse-patch.js");
    expect(typeof mod.applyPatch).toBe("function");
  });

  // Test 1: mixed patch (1 append after_original=2 + 1 replace verse_number=3).
  // Per applyPatch's per-verse loop, for each original i the loop pushes the
  // (possibly replaced) verse, then runs the append loop for matches. Walk:
  //   i=0: push A;            append matches for after_original=0? none.
  //   i=1: push B;            append matches for after_original=2? yes → push INSERTED.
  //   i=2: replace fires      → push REPLACED (original verse 3's slot).
  //                            append matches for after_original=3? none.
  //   i=3: push D;            append matches for after_original=4? none.
  // Final renumber: [A=1, B=2, INSERTED=3, REPLACED=4, D=5].
  it("merges mixed append + replace entries with correct post-renumber order", () => {
    writePatch([
      { after_original: 2, verse: makeVerse(0, "INSERTED") },
      { replace_verse_number: 3, verse: makeVerse(0, "REPLACED") },
    ]);

    const result = applyPatch(SLUG);

    expect(result.before).toBe(4);
    expect(result.after).toBe(5);

    const verses = readLessonVerses();
    expect(verses).toHaveLength(5);
    expect(verses.map((v) => v.tokens[0].surface)).toEqual([
      "A",
      "B",
      "INSERTED",
      "REPLACED",
      "D",
    ]);
    expect(verses.map((v) => v.verse_number)).toEqual([1, 2, 3, 4, 5]);
  });

  // Test 2: idempotency — running applyPatch a second time on the now-patched
  // lesson produces byte-identical output. Both modes' guards must fire:
  //   - replace's patchSig guard: current verse 4 (REPLACED) signature == patch
  //     replacement signature → skip.
  //   - append's next-verse-sig guard: after original verse 2 (B), the next
  //     verse in the lesson is INSERTED, whose surface matches the patch's
  //     append signature → skip.
  it("re-applying the same patch produces byte-identical output (idempotency)", () => {
    writePatch([
      { after_original: 2, verse: makeVerse(0, "INSERTED") },
      { replace_verse_number: 3, verse: makeVerse(0, "REPLACED") },
    ]);

    applyPatch(SLUG);
    const firstBytes = readFileSync(lessonPath);
    applyPatch(SLUG);
    const secondBytes = readFileSync(lessonPath);

    expect(secondBytes.equals(firstBytes)).toBe(true);
  });

  // Test 3: replace-only patch — no append loop iterations.
  it("applies a replace-only patch (no append entries)", () => {
    writePatch([
      { replace_verse_number: 2, verse: makeVerse(0, "REPLACED_B") },
    ]);

    const result = applyPatch(SLUG);

    expect(result.before).toBe(4);
    expect(result.after).toBe(4); // No appends → length unchanged.

    const verses = readLessonVerses();
    expect(verses.map((v) => v.tokens[0].surface)).toEqual([
      "A",
      "REPLACED_B",
      "C",
      "D",
    ]);
    expect(verses.map((v) => v.verse_number)).toEqual([1, 2, 3, 4]);
  });

  // Test 4: append-only patch (legacy shape) — backward compat.
  it("applies an append-only patch (legacy after_original shape)", () => {
    writePatch([
      { after_original: 4, verse: makeVerse(0, "APPENDED_AT_END") },
    ]);

    const result = applyPatch(SLUG);

    expect(result.before).toBe(4);
    expect(result.after).toBe(5);

    const verses = readLessonVerses();
    expect(verses.map((v) => v.tokens[0].surface)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "APPENDED_AT_END",
    ]);
    expect(verses.map((v) => v.verse_number)).toEqual([1, 2, 3, 4, 5]);
  });

  // Test 5: D-11 ordering visible — for the SAME original verse 3, the patch
  // contains both an append (after_original=3) and a replace
  // (replace_verse_number=3). Per D-11 + the per-verse loop, the order of
  // operations for original i=2 is: replace fires first (slot becomes REPL3),
  // THEN the append loop fires for after_original=3 (push AFTER3). Final
  // renumber yields [A=1, B=2, REPL3=3, AFTER3=4, D=5].
  it("processes replace before append for the same original verse_number (D-11)", () => {
    writePatch([
      { after_original: 3, verse: makeVerse(0, "AFTER3") },
      { replace_verse_number: 3, verse: makeVerse(0, "REPL3") },
    ]);

    const result = applyPatch(SLUG);

    expect(result.before).toBe(4);
    expect(result.after).toBe(5);

    const verses = readLessonVerses();
    expect(verses.map((v) => v.tokens[0].surface)).toEqual([
      "A",
      "B",
      "REPL3",
      "AFTER3",
      "D",
    ]);
    expect(verses.map((v) => v.verse_number)).toEqual([1, 2, 3, 4, 5]);
  });
});
