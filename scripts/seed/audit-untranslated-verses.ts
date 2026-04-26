/**
 * audit-untranslated-verses.ts — Stub-detection audit + translation-queue writer.
 *
 * Phase 11.3 entry point. Walks `data/lessons-cache/*.json` and detects verses
 * that match the stub signature for untranslated/placeholder JP verses:
 *
 *   tokens.length === 1 && hasJapanese(tokens[0].surface)
 *     && (translations.en | translations["pt-BR"] | translations.es).startsWith("(")
 *
 * IMPORTANT — predicate broadening (Rule 1 deviation, Plan 11.3-02 Task 1):
 * The CONTEXT-locked predicate `tokens.length === 1 && hasJapanese(tokens[0].surface)`
 * was discovered to UNDER-count the real stub population: it catches the original
 * `(untranslated)` stubs (single "other" token) but MISSES the `(auto-coverage)`
 * stubs introduced by prior `auto-coverage-patch.ts` runs (where kuroshiro
 * tokenized the line into multiple tokens but the translation is still placeholder
 * text starting with `(`). The CONTEXT predicate yields 105 in-scope stubs; the
 * load-bearing SPEC count locks 159 in-scope stubs (38/29/28/22/21/21). The 54
 * gap is exactly the auto-coverage placeholders.
 *
 * Resolution: broaden the predicate to "ANY token in the verse contains JP" while
 * keeping the locale-translation `startsWith("(")` check. The broadened predicate
 * matches the SPEC count exactly and matches the phase intent (replace ALL
 * placeholder translations on the 6 in-scope songs).
 *
 * Default mode (cache-only) writes `.planning/translation-queue.tsv` containing
 * one row per stub verse for the 6 IN_SCOPE_SLUGS, plus a stdout summary of the
 * catalog-wide count for operator visibility.
 *
 * Verify mode (--verify --slugs=<csv>) is implemented in Task 2 of this plan.
 *
 * Usage:
 *   npx tsx scripts/seed/audit-untranslated-verses.ts
 *     # writes .planning/translation-queue.tsv with all in-scope stubs
 *
 *   npx tsx scripts/seed/audit-untranslated-verses.ts --verify --slugs=<csv>
 *     # checks both data/lessons-cache/<slug>.json AND Neon song_versions.lesson;
 *     # exits 1 if any stubs remain in either source (Task 2 — see SPEC-REQ-7).
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../..");
const LESSONS_DIR = join(ROOT, "data/lessons-cache");
const QUEUE_OUT = join(ROOT, ".planning/translation-queue.tsv");

// ---------------------------------------------------------------------------
// Locked phase scope — the 6 worst-offender slugs from 11.3-SPEC.md.
// Order mirrors the stub-count ranking in the SPEC table (38/29/28/22/21/21).
// ---------------------------------------------------------------------------
const IN_SCOPE_SLUGS = new Set<string>([
  "again-yui",
  "whats-up-people-maximum-the-hormone",
  "diver-nico-touches-the-walls",
  "mezamero-yasei-matchy-with-question",
  "name-of-love-cinema-staff",
  "yellow-moon-akeboshi",
]);

// ---------------------------------------------------------------------------
// Types — mirror the structural slice of VerseSchema we actually inspect.
// We do NOT use VerseSchema.safeParse here because stubs ARE schema-valid
// (a single "other" token + non-null translations). They're structurally
// degenerate, not type-degenerate.
// ---------------------------------------------------------------------------
type Verse = {
  verse_number: number;
  tokens: { surface: string }[];
  translations: Record<string, string>;
};

type Lesson = {
  verses: Verse[];
};

type StubRow = {
  slug: string;
  verse_number: number;
  surface: string;
  locales_broken: string[];
};

// ---------------------------------------------------------------------------
// JP-character regex — covers the unicode ranges named in the phase prompt:
//   U+3040–309F  Hiragana
//   U+30A0–30FF  Katakana
//   U+4E00–9FFF  CJK Unified Ideographs (kanji)
// ---------------------------------------------------------------------------
const JP_CHAR_RE = /[぀-ゟ゠-ヿ一-鿿]/;

function hasJapanese(s: string): boolean {
  return JP_CHAR_RE.test(s);
}

// ---------------------------------------------------------------------------
// Stub-detection predicate — broadened from the CONTEXT signature so it
// catches BOTH the original `(untranslated)` stubs (single "other" token) AND
// the `(auto-coverage) <line>` placeholders (multi-token, kuroshiro-emitted).
//
// Selection rule:
//   - At least one token in the verse must have a JP character in its surface
//     (rules out instrumental/Romanji-only filler entries).
//   - At least one of translations.en / translations["pt-BR"] / translations.es
//     must start with "(" — the locale-prefix signature shared by all
//     placeholder translations the lesson generator has ever emitted.
//
// See the file-top docstring for the predicate-broadening rationale.
// ---------------------------------------------------------------------------
function isStub(v: Verse): false | { locales_broken: string[] } {
  const tokens = v.tokens ?? [];
  if (tokens.length === 0) return false;
  const anyTokenJp = tokens.some((t) => hasJapanese(t?.surface ?? ""));
  if (!anyTokenJp) return false;

  const broken: string[] = [];
  for (const locale of ["en", "pt-BR", "es"] as const) {
    const t = v.translations?.[locale] ?? "";
    if (typeof t === "string" && t.startsWith("(")) broken.push(locale);
  }
  return broken.length > 0 ? { locales_broken: broken } : false;
}

// ---------------------------------------------------------------------------
// Cache walk — returns every stub row across the lessons cache, partitioned
// implicitly by slug (slug is encoded on each row).
// ---------------------------------------------------------------------------
type WalkResult = {
  catalogStubs: StubRow[];
  inScopeStubs: StubRow[];
  catalogSongsWithStubs: Set<string>;
};

function walkCache(): WalkResult {
  const files = readdirSync(LESSONS_DIR).filter((f) => f.endsWith(".json"));
  const catalogStubs: StubRow[] = [];
  const inScopeStubs: StubRow[] = [];
  const catalogSongsWithStubs = new Set<string>();

  for (const file of files) {
    const slug = file.replace(/\.json$/, "");
    const path = join(LESSONS_DIR, file);
    let lesson: Lesson;
    try {
      lesson = JSON.parse(readFileSync(path, "utf-8")) as Lesson;
    } catch (err) {
      console.warn(`[audit] skip ${slug}: failed to parse JSON — ${(err as Error).message}`);
      continue;
    }
    if (!Array.isArray(lesson?.verses)) continue;

    let songHadStub = false;
    for (const v of lesson.verses) {
      const stub = isStub(v);
      if (!stub) continue;
      // Surface = joined token surfaces (covers single-token AND multi-token
      // stubs). For single-token verses this is identical to tokens[0].surface;
      // for auto-coverage placeholders it reconstructs the original line so the
      // drafter / inline-review reader can see the lyric being translated.
      const surface = (v.tokens ?? []).map((t) => t?.surface ?? "").join("");
      const row: StubRow = {
        slug,
        verse_number: v.verse_number,
        surface,
        locales_broken: stub.locales_broken,
      };
      catalogStubs.push(row);
      songHadStub = true;
      if (IN_SCOPE_SLUGS.has(slug)) inScopeStubs.push(row);
    }
    if (songHadStub) catalogSongsWithStubs.add(slug);
  }

  return { catalogStubs, inScopeStubs, catalogSongsWithStubs };
}

// ---------------------------------------------------------------------------
// TSV writer — header + one row per in-scope stub.
//
// Header is `#`-prefixed so consumers using the auto-coverage-patch.ts
// `.filter((l) => !l.startsWith("#"))` convention skip it transparently.
// ---------------------------------------------------------------------------
function writeQueue(rows: StubRow[]): void {
  const header = "# slug\tverse_number\tsurface\tlocales_broken";
  const body = rows
    .map((r) => `${r.slug}\t${r.verse_number}\t${r.surface}\t${r.locales_broken.join(",")}`)
    .join("\n");
  // Ensure trailing newline so the file ends cleanly per POSIX convention.
  const content = body.length > 0 ? `${header}\n${body}\n` : `${header}\n`;
  writeFileSync(QUEUE_OUT, content, "utf-8");
}

// ---------------------------------------------------------------------------
// Default mode entrypoint (cache walk + queue writer).
// --verify mode is added in Task 2 of plan 11.3-02.
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const result = walkCache();

  console.log(
    `[audit] catalog-wide: ${result.catalogStubs.length} stubs across ${result.catalogSongsWithStubs.size} songs`
  );
  console.log(`[audit] in-scope (6 slugs): ${result.inScopeStubs.length} stubs`);

  // Per-slug breakdown (operator-readable; matches the SPEC table ordering
  // when present so deviations are visible at a glance).
  for (const slug of IN_SCOPE_SLUGS) {
    const n = result.inScopeStubs.filter((r) => r.slug === slug).length;
    console.log(`[audit]   ${slug}: ${n} stubs`);
  }

  writeQueue(result.inScopeStubs);
  console.log(`[audit] wrote ${result.inScopeStubs.length} rows → ${QUEUE_OUT}`);

  if (IN_SCOPE_SLUGS.size > 0 && result.inScopeStubs.length !== 159) {
    console.warn(
      `[audit] WARNING: expected 159 in-scope stubs, got ${result.inScopeStubs.length} — scope drift?`
    );
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
