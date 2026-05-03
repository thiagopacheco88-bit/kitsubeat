/**
 * Smoke test: simulate ExerciseTab "Grammar" track for several real lessons
 * and report how many questions buildQuestions returns + per-grammar-point
 * skip reasons (parsed/unstructured, not-V1, no-timed-verse, no-options).
 *
 * Usage:
 *   PATH=".venv/Scripts:$PATH" npx tsx scripts/debug/smoke-grammar-track.ts
 *   npx tsx scripts/debug/smoke-grammar-track.ts <slug> [<slug> ...]
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Lesson } from "../../src/lib/types/lesson";
import { buildQuestions } from "../../src/lib/exercises/generator";
import {
  V1_CONJUGATION_FORMS,
  classifyConjugationForm,
  stripGloss,
} from "../../src/lib/exercises/conjugation";
import { parseConjugationPath } from "../../scripts/lib/conjugation-audit";

const cacheDir = "data/lessons-cache";

const argv = process.argv.slice(2);
const slugs = argv.length > 0
  ? argv
  : readdirSync(cacheDir)
      .filter((f) => f.endsWith(".json") && !f.endsWith(".bak.json") && !f.includes(".bak"))
      .slice(0, 12)
      .map((f) => f.replace(/\.json$/, ""));

let totalSkippedUnstructured = 0;
let totalSkippedNotV1 = 0;
let totalSkippedNoVerse = 0;
let totalEmittedRaw = 0;
let totalGrammarPoints = 0;

for (const slug of slugs) {
  const path = join(cacheDir, `${slug}.json`);
  let lesson: Lesson;
  try {
    lesson = JSON.parse(readFileSync(path, "utf-8")) as Lesson;
  } catch {
    console.log(`[SKIP] ${slug} — could not read ${path}`);
    continue;
  }

  const gpCount = lesson.grammar_points?.length ?? 0;
  totalGrammarPoints += gpCount;

  let unstructured = 0;
  let notV1 = 0;
  let noVerse = 0;
  let viable = 0;
  const formCounts: Record<string, number> = {};

  for (const gp of lesson.grammar_points ?? []) {
    const parsed = parseConjugationPath(gp.conjugation_path);
    if (!parsed || !parsed.is_structured) {
      unstructured++;
      continue;
    }
    const form = classifyConjugationForm(parsed);
    formCounts[form] = (formCounts[form] ?? 0) + 1;
    if (!V1_CONJUGATION_FORMS.includes(form)) {
      notV1++;
      continue;
    }
    const conjugatedSurface = stripGloss(parsed.conjugated);
    const ref = lesson.verses.find(
      (v) => v.start_time_ms > 0 && v.tokens.some((t) => t.surface === conjugatedSurface),
    );
    if (!ref) {
      noVerse++;
      continue;
    }
    viable++;
  }

  totalSkippedUnstructured += unstructured;
  totalSkippedNotV1 += notV1;
  totalSkippedNoVerse += noVerse;

  // Build questions exactly like ExerciseTab does for the Grammar track.
  // filteredVocab in production excludes vocab without UUIDs and caps new cards.
  // For the smoke test we keep all vocab (best-case) to isolate generator behavior.
  const filteredVocab = lesson.vocabulary.filter((v) => v.vocab_item_id);

  // Realistic same-level JLPT pool — best-case approximation. Production fetches
  // up to 50 from /api/exercises/jlpt-pool. We synthesize 6 conjugatable verbs.
  const jlptPool = [
    { surface: "食べる", reading: "たべる", romaji: "taberu", part_of_speech: "verb", jlpt_level: lesson.jlpt_level, meaning: { en: "eat" }, example_from_song: "", additional_examples: [], vocab_item_id: "pool-1" },
    { surface: "飲む",   reading: "のむ",   romaji: "nomu",   part_of_speech: "verb", jlpt_level: lesson.jlpt_level, meaning: { en: "drink" }, example_from_song: "", additional_examples: [], vocab_item_id: "pool-2" },
    { surface: "見る",   reading: "みる",   romaji: "miru",   part_of_speech: "verb", jlpt_level: lesson.jlpt_level, meaning: { en: "see" }, example_from_song: "", additional_examples: [], vocab_item_id: "pool-3" },
    { surface: "行く",   reading: "いく",   romaji: "iku",    part_of_speech: "verb", jlpt_level: lesson.jlpt_level, meaning: { en: "go" }, example_from_song: "", additional_examples: [], vocab_item_id: "pool-4" },
    { surface: "話す",   reading: "はなす", romaji: "hanasu", part_of_speech: "verb", jlpt_level: lesson.jlpt_level, meaning: { en: "speak" }, example_from_song: "", additional_examples: [], vocab_item_id: "pool-5" },
    { surface: "書く",   reading: "かく",   romaji: "kaku",   part_of_speech: "verb", jlpt_level: lesson.jlpt_level, meaning: { en: "write" }, example_from_song: "", additional_examples: [], vocab_item_id: "pool-6" },
  ] as any;

  const result = buildQuestions({
    vocab: filteredVocab,
    verses: lesson.verses,
    grammarPoints: lesson.grammar_points ?? [],
    jlptPool,
    trackKind: "grammar",
    lengthMode: "short",
  });
  totalEmittedRaw += result.length;

  console.log(
    `${slug}: gp=${gpCount} unstructured=${unstructured} not-V1=${notV1} no-verse=${noVerse} viable=${viable} → grammar.length=${result.length}` +
      ` forms=${Object.entries(formCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k}:${v}`)
        .join(",")}`,
  );
}

console.log("");
console.log(`TOTAL: gp=${totalGrammarPoints} unstructured=${totalSkippedUnstructured} not-V1=${totalSkippedNotV1} no-verse=${totalSkippedNoVerse} questions-emitted=${totalEmittedRaw}`);
