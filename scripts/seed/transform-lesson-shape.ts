/**
 * transform-lesson-shape.ts — One-off rewriter for legacy lesson JSON shapes.
 *
 * Two non-schema shapes accumulated in data/lessons-cache/ over multiple
 * generation sessions:
 *
 *   Legacy "header" shape (pre-spec, ~90 files):
 *     { song_slug, title, artist, difficulty_tier, summary, verses, vocabulary, grammar_points }
 *     - missing top-level jlpt_level
 *     - vocab uses meaning_en/meaning_pt/meaning_es and pos
 *     - grammar uses pattern/explanation_en/explanation_pt/explanation_es/examples
 *
 *   Recent "summary-header" shape (~17 files):
 *     { slug, title, artist, anime, summary, verses, vocabulary, grammar_points }
 *     - missing both jlpt_level and difficulty_tier
 *     - vocab uses word/meaning_pt-BR
 *     - grammar uses point/explanation_pt-BR/examples (as objects)
 *
 * Both shapes share inner-level mismatches:
 *   - verses use line_index (0-based) instead of verse_number (1-based)
 *   - verses lack start_time_ms / end_time_ms (filled with 0; timing pipeline backfills)
 *   - verses carry an extra `japanese` text field
 *   - tokens.meaning is a plain string (schema wants Localizable record)
 *   - vocab.meaning_xx → meaning: { en, pt-BR, es }
 *   - vocab missing example_from_song / additional_examples
 *   - grammar.explanation_xx → explanation: { en, pt-BR, es }
 *   - grammar.examples is dropped (no schema slot)
 *
 * The transformer normalizes both into LessonSchema shape and overwrites in place.
 * Files already in correct shape are left untouched.
 *
 * Usage:
 *   npx tsx scripts/seed/transform-lesson-shape.ts          # apply
 *   npx tsx scripts/seed/transform-lesson-shape.ts --dry    # report-only
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { LessonSchema } from "../types/lesson.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../../");
const LESSONS_DIR = join(PROJECT_ROOT, "data/lessons-cache");

const DRY = process.argv.includes("--dry");

type AnyRecord = Record<string, unknown>;

function isRecord(v: unknown): v is AnyRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asArray<T = unknown>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

const VALID_TOKEN_GRAMMAR = new Set([
  "noun",
  "verb",
  "adjective",
  "adverb",
  "particle",
  "expression",
  "other",
]);
const VALID_VOCAB_POS = new Set([
  "noun",
  "verb",
  "adjective",
  "adverb",
  "particle",
  "expression",
]);
const VALID_JLPT = new Set(["N5", "N4", "N3", "N2", "N1", "unknown"]);

/** Coerce token grammar values into the schema enum. Earlier generations used `demonstrative`. */
function coerceTokenGrammar(v: unknown): string {
  const s = asString(v);
  if (VALID_TOKEN_GRAMMAR.has(s)) return s;
  // demonstratives (この, その, あの, etc.) collapse to `other`
  return "other";
}

/** Coerce vocab part-of-speech. Vocab schema has no `other` slot — `demonstrative` falls back to `noun`. */
function coerceVocabPos(v: unknown): string {
  const s = asString(v);
  if (VALID_VOCAB_POS.has(s)) return s;
  return "noun";
}

/** Coerce jlpt_level. Earlier generations used `N/A`; map to schema's `unknown`. */
function coerceJlpt(v: unknown): string {
  const s = asString(v);
  if (VALID_JLPT.has(s)) return s;
  return "unknown";
}

/** Wrap a plain string into a single-locale Localizable, or pass through if already a record. */
function toLocalizable(v: unknown): Record<string, string> {
  if (typeof v === "string") return { en: v };
  if (isRecord(v)) {
    // Coerce to string-only values; drop non-string entries
    const out: Record<string, string> = {};
    for (const [k, val] of Object.entries(v)) {
      if (typeof val === "string") out[k] = val;
    }
    return out;
  }
  return { en: "" };
}

/** Build a Localizable from explicit per-language fields, supporting both `pt` and `pt-BR`. */
function localizableFromSplit(
  obj: AnyRecord,
  enKey: string,
  ptKey: string,
  esKey: string,
  altPtKey?: string
): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof obj[enKey] === "string") out["en"] = obj[enKey] as string;
  const pt = obj[ptKey] ?? (altPtKey ? obj[altPtKey] : undefined);
  if (typeof pt === "string") out["pt-BR"] = pt;
  if (typeof obj[esKey] === "string") out["es"] = obj[esKey] as string;
  return out;
}

/**
 * Heuristic: pick a top-level jlpt_level when missing.
 * 1) If grammar_points carry per-rule jlpt_level (legacy shape #2), take the toughest seen.
 * 2) Else fall back to "N3" as a safe mid-default.
 */
function inferJlptLevel(lesson: AnyRecord): "N5" | "N4" | "N3" | "N2" | "N1" {
  const ranks: Record<string, number> = { N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 };
  let best = 0;
  let bestKey: "N5" | "N4" | "N3" | "N2" | "N1" = "N3";
  const gp = asArray<AnyRecord>(lesson.grammar_points);
  for (const g of gp) {
    const lvl = asString(g.jlpt_level);
    if (lvl in ranks && ranks[lvl] > best) {
      best = ranks[lvl];
      bestKey = lvl as typeof bestKey;
    }
  }
  return best > 0 ? bestKey : "N3";
}

function inferDifficultyTier(lesson: AnyRecord): "basic" | "intermediate" | "advanced" {
  const t = asString(lesson.difficulty_tier);
  if (t === "basic" || t === "intermediate" || t === "advanced") return t;
  return "intermediate";
}

interface TransformResult {
  changed: boolean;
  output: AnyRecord;
}

function transformLesson(lesson: AnyRecord, originalRaw: string): TransformResult {
  // Top-level normalization. Always run the full pipeline so enum coercions
  // (e.g. token jlpt_level "N/A" → "unknown", grammar "demonstrative" → "other")
  // apply uniformly. We detect "no actual change" later by comparing JSON output.
  const jlpt = inferJlptLevel(lesson);
  const tier = inferDifficultyTier(lesson);
  void originalRaw; // (string-equality detection happens at the call site)

  // Verses
  const verses = asArray<AnyRecord>(lesson.verses).map((v, idx) => {
    const verseNumber =
      typeof v.verse_number === "number"
        ? v.verse_number
        : typeof v.line_index === "number"
        ? (v.line_index as number) + 1
        : idx + 1;

    const tokens = asArray<AnyRecord>(v.tokens).map((t) => ({
      surface: asString(t.surface),
      reading: asString(t.reading),
      romaji: asString(t.romaji),
      grammar: coerceTokenGrammar(t.grammar),
      grammar_color: asString(t.grammar_color, "none"),
      meaning: toLocalizable(t.meaning),
      jlpt_level: coerceJlpt(t.jlpt_level),
    }));

    const out: AnyRecord = {
      verse_number: verseNumber,
      start_time_ms: typeof v.start_time_ms === "number" ? v.start_time_ms : 0,
      end_time_ms: typeof v.end_time_ms === "number" ? v.end_time_ms : 0,
      tokens,
      translations: isRecord(v.translations) ? v.translations : {},
      literal_meaning: toLocalizable(v.literal_meaning),
    };
    if (v.cultural_context !== undefined) {
      out.cultural_context = toLocalizable(v.cultural_context);
    }
    return out;
  });

  // Vocabulary
  const vocabulary = asArray<AnyRecord>(lesson.vocabulary).map((vc) => {
    // Surface: unify `surface` (correct) and `word` (legacy shape #4) field names
    const surface = asString(vc.surface) || asString(vc.word);
    // Part of speech: unify `part_of_speech` and `pos` (legacy shape #2)
    const pos = asString(vc.part_of_speech) || asString(vc.pos) || "noun";

    // Meaning: prefer existing localizable record, else assemble from split fields
    let meaning: Record<string, string>;
    if (isRecord(vc.meaning)) {
      meaning = toLocalizable(vc.meaning);
    } else {
      meaning = localizableFromSplit(vc, "meaning_en", "meaning_pt-BR", "meaning_es", "meaning_pt");
    }

    return {
      surface,
      reading: asString(vc.reading),
      romaji: asString(vc.romaji),
      part_of_speech: coerceVocabPos(pos),
      jlpt_level: coerceJlpt(vc.jlpt_level),
      meaning,
      example_from_song: asString(vc.example_from_song),
      additional_examples: asArray<string>(vc.additional_examples).filter(
        (s) => typeof s === "string"
      ),
    };
  });

  // Grammar points
  const grammar_points = asArray<AnyRecord>(lesson.grammar_points).map((gp) => {
    // Name: unify `name` (correct), `point` (shape #4), `pattern` (shape #2)
    const name = asString(gp.name) || asString(gp.point) || asString(gp.pattern);

    // Reference: unify `jlpt_reference`, fall back to per-rule jlpt_level (shape #2)
    let jlptRef = asString(gp.jlpt_reference);
    if (!jlptRef) {
      const lvl = asString(gp.jlpt_level);
      jlptRef = lvl ? `JLPT ${lvl}` : "";
    }

    // Explanation: prefer record, else assemble
    let explanation: Record<string, string>;
    if (isRecord(gp.explanation)) {
      explanation = toLocalizable(gp.explanation);
    } else {
      explanation = localizableFromSplit(
        gp,
        "explanation_en",
        "explanation_pt-BR",
        "explanation_es",
        "explanation_pt"
      );
    }

    const out: AnyRecord = { name, jlpt_reference: jlptRef, explanation };
    if (typeof gp.conjugation_path === "string") out.conjugation_path = gp.conjugation_path;
    return out;
  });

  return {
    changed: true,
    output: {
      jlpt_level: jlpt,
      difficulty_tier: tier,
      verses,
      vocabulary,
      grammar_points,
    },
  };
}

function serialize(obj: unknown): string {
  // Match the existing on-disk format used by prior generation pipelines:
  // 2-space indent, no trailing newline. Keeps the git diff focused on
  // semantic changes only (not whitespace).
  return JSON.stringify(obj, null, 2);
}

async function main() {
  const files = readdirSync(LESSONS_DIR).filter((f) => f.endsWith(".json"));
  console.log(`Found ${files.length} lesson files in ${LESSONS_DIR}`);
  if (DRY) console.log("DRY RUN: no files will be written.\n");

  let transformed = 0;
  let skipped = 0;
  let validated = 0;
  let validationErrors = 0;
  const errorSamples: Array<{ file: string; error: string }> = [];

  for (const file of files) {
    const path = join(LESSONS_DIR, file);
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw) as AnyRecord;

    const { output } = transformLesson(parsed, raw);
    const newSerialized = serialize(output);
    const isUnchanged = newSerialized === raw;

    if (!isUnchanged && !DRY) {
      writeFileSync(path, newSerialized, "utf-8");
    }
    if (!isUnchanged) transformed++;
    else skipped++;

    // Validate the (possibly transformed) output against the strict schema.
    const validation = LessonSchema.safeParse(output);
    if (validation.success) {
      validated++;
    } else {
      validationErrors++;
      if (errorSamples.length < 5) {
        errorSamples.push({
          file,
          error: validation.error.errors
            .slice(0, 3)
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join(" | "),
        });
      }
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Transformed: ${transformed}`);
  console.log(`Already correct (skipped): ${skipped}`);
  console.log(`Validation pass: ${validated}/${files.length}`);
  console.log(`Validation fail: ${validationErrors}`);
  if (errorSamples.length > 0) {
    console.log(`\nFirst validation errors:`);
    for (const { file, error } of errorSamples) {
      console.log(`  ${file}: ${error}`);
    }
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
