/**
 * normalize-vocab-schema.ts — clean up subagent-introduced enum violations in
 * annotated vocabulary JSON so LessonSchema validates.
 *
 * Subagents sometimes emitted POS values outside the strict enum
 * ("na-adjective", "interjection", "adjectival-noun", "pronoun", "auxiliary")
 * and JLPT values outside the enum ("N/A", "none"). Normalize to the allowed set.
 * Also rescue entries whose meaning accidentally serialized as a string.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";

const ALLOWED_POS = new Set([
  "noun",
  "verb",
  "adjective",
  "adverb",
  "particle",
  "expression",
]);
const ALLOWED_JLPT = new Set(["N5", "N4", "N3", "N2", "N1", "unknown"]);

const POS_MAP: Record<string, string> = {
  "na-adjective": "adjective",
  "adjectival-noun": "adjective",
  "i-adjective": "adjective",
  interjection: "expression",
  pronoun: "noun",
  auxiliary: "verb",
  counter: "noun",
  conjunction: "expression",
  prefix: "expression",
  suffix: "expression",
  number: "noun",
};

const JLPT_MAP: Record<string, string> = {
  "N/A": "unknown",
  na: "unknown",
  none: "unknown",
  "": "unknown",
  N0: "N1",
  N6: "N5",
};

function normalizePos(raw: unknown): string {
  if (typeof raw !== "string") return "noun";
  if (ALLOWED_POS.has(raw)) return raw;
  const mapped = POS_MAP[raw.toLowerCase()];
  if (mapped) return mapped;
  // unknown — default to noun
  return "noun";
}

function normalizeJlpt(raw: unknown): string {
  if (typeof raw !== "string") return "unknown";
  if (ALLOWED_JLPT.has(raw)) return raw;
  return JLPT_MAP[raw] ?? "unknown";
}

function normalizeMeaning(m: unknown): Record<string, string> {
  if (typeof m === "string") return { en: m };
  if (m && typeof m === "object") return m as Record<string, string>;
  return { en: "" };
}

/**
 * Walk an arbitrary object tree; when we hit an object with any of these
 * fields, normalize them. Returns whether anything changed.
 */
function normalizeTree(obj: unknown): boolean {
  if (Array.isArray(obj)) {
    let dirty = false;
    for (const item of obj) {
      if (normalizeTree(item)) dirty = true;
    }
    return dirty;
  }
  if (!obj || typeof obj !== "object") return false;
  const rec = obj as Record<string, unknown>;
  let dirty = false;

  if ("part_of_speech" in rec) {
    const norm = normalizePos(rec.part_of_speech);
    if (norm !== rec.part_of_speech) {
      rec.part_of_speech = norm;
      dirty = true;
    }
  }
  // grammar-bucket uses different enum (includes 'particle' / 'other'); leave as-is
  if ("jlpt_level" in rec) {
    const norm = normalizeJlpt(rec.jlpt_level);
    if (norm !== rec.jlpt_level) {
      rec.jlpt_level = norm;
      dirty = true;
    }
  }
  if ("meaning" in rec && typeof rec.meaning === "string") {
    rec.meaning = { en: rec.meaning };
    dirty = true;
  }

  for (const v of Object.values(rec)) {
    if (normalizeTree(v)) dirty = true;
  }
  return dirty;
}

const TARGETS = [
  ["data/vocab-annotated", "data/lessons-cache"],
  ["data/vocab-annotated-tv", "data/lessons-cache-tv"],
];

let touchedAnnotated = 0;
let touchedLessons = 0;

for (const [annotDir, lessonDir] of TARGETS) {
  const absAnnot = resolve(annotDir);
  const absLesson = resolve(lessonDir);
  if (!existsSync(absAnnot)) continue;

  for (const file of readdirSync(absAnnot).filter((f) => f.endsWith(".json"))) {
    const annotPath = join(absAnnot, file);
    const annot = JSON.parse(readFileSync(annotPath, "utf8"));
    if (normalizeTree(annot)) {
      writeFileSync(annotPath, JSON.stringify(annot, null, 2) + "\n", "utf8");
      touchedAnnotated++;
    }

    const lessonPath = join(absLesson, file);
    if (!existsSync(lessonPath)) continue;
    const lesson = JSON.parse(readFileSync(lessonPath, "utf8"));
    if (normalizeTree(lesson)) {
      writeFileSync(lessonPath, JSON.stringify(lesson, null, 2) + "\n", "utf8");
      touchedLessons++;
    }
  }
}

console.log(`Normalized ${touchedAnnotated} annotated files, ${touchedLessons} lesson files.`);
