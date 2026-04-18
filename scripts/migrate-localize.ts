/**
 * migrate-localize.ts — Convert plain English string fields to multilingual objects.
 *
 * Reads each lesson JSON in data/lessons-cache/ and converts all Localizable fields
 * (token.meaning, verse.literal_meaning, verse.cultural_context, vocab.meaning,
 * grammar.explanation) from plain strings to {"en": "...", "pt-BR": "...", "es": "..."}.
 *
 * Uses a translation dictionary for known terms. Falls back to {"en": original} for
 * strings not in the dictionary (localize() in the app will show English as fallback).
 *
 * Usage:
 *   npx tsx scripts/migrate-localize.ts
 *   npx tsx scripts/migrate-localize.ts --dry-run
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");

const LESSONS_DIR = join(PROJECT_ROOT, "data/lessons-cache");
const DICT_PATH = join(PROJECT_ROOT, "scripts/data/translation-dict.json");

const dryRun = process.argv.includes("--dry-run");

// Load translation dictionary
const dict: Record<string, { "pt-BR": string; es: string }> = JSON.parse(
  readFileSync(DICT_PATH, "utf-8")
);

function localizePlain(value: unknown): unknown {
  if (typeof value !== "string") return value; // already an object, skip
  const translations = dict[value];
  if (translations) {
    return { en: value, "pt-BR": translations["pt-BR"], es: translations.es };
  }
  // No translation available — wrap as English-only (localize() falls back to "en")
  return { en: value };
}

interface Stats {
  filesProcessed: number;
  fieldsConverted: number;
  fieldsWithTranslation: number;
  fieldsAlreadyObject: number;
}

function migrateLesson(lesson: any, stats: Stats): any {
  // Migrate verses
  for (const verse of lesson.verses ?? []) {
    // Token meanings
    for (const token of verse.tokens ?? []) {
      if (typeof token.meaning === "string") {
        const result = localizePlain(token.meaning);
        const hasTranslation =
          typeof result === "object" && result !== null && "pt-BR" in result;
        token.meaning = result;
        stats.fieldsConverted++;
        if (hasTranslation) stats.fieldsWithTranslation++;
      } else {
        stats.fieldsAlreadyObject++;
      }
    }

    // Literal meaning
    if (typeof verse.literal_meaning === "string") {
      verse.literal_meaning = localizePlain(verse.literal_meaning);
      stats.fieldsConverted++;
    } else if (verse.literal_meaning) {
      stats.fieldsAlreadyObject++;
    }

    // Cultural context
    if (typeof verse.cultural_context === "string") {
      verse.cultural_context = localizePlain(verse.cultural_context);
      stats.fieldsConverted++;
    } else if (verse.cultural_context) {
      stats.fieldsAlreadyObject++;
    }
  }

  // Migrate vocabulary
  for (const entry of lesson.vocabulary ?? []) {
    if (typeof entry.meaning === "string") {
      entry.meaning = localizePlain(entry.meaning);
      stats.fieldsConverted++;
    } else {
      stats.fieldsAlreadyObject++;
    }
  }

  // Migrate grammar points
  for (const point of lesson.grammar_points ?? []) {
    if (typeof point.explanation === "string") {
      point.explanation = localizePlain(point.explanation);
      stats.fieldsConverted++;
    } else {
      stats.fieldsAlreadyObject++;
    }
  }

  return lesson;
}

function main() {
  console.log(
    `=== migrate-localize${dryRun ? " (DRY RUN)" : ""} ===\n`
  );
  console.log(`  Dictionary: ${Object.keys(dict).length} entries`);

  const files = readdirSync(LESSONS_DIR).filter((f) => f.endsWith(".json"));
  console.log(`  Lesson files: ${files.length}\n`);

  const stats: Stats = {
    filesProcessed: 0,
    fieldsConverted: 0,
    fieldsWithTranslation: 0,
    fieldsAlreadyObject: 0,
  };

  for (const file of files) {
    const filePath = join(LESSONS_DIR, file);
    const lesson = JSON.parse(readFileSync(filePath, "utf-8"));
    migrateLesson(lesson, stats);
    stats.filesProcessed++;

    if (!dryRun) {
      writeFileSync(filePath, JSON.stringify(lesson, null, 2), "utf-8");
    }
  }

  console.log("=== Results ===");
  console.log(`  Files processed:         ${stats.filesProcessed}`);
  console.log(`  Fields converted:        ${stats.fieldsConverted}`);
  console.log(`  — with pt-BR/es:         ${stats.fieldsWithTranslation}`);
  console.log(
    `  — English-only fallback: ${stats.fieldsConverted - stats.fieldsWithTranslation}`
  );
  console.log(`  Already multilingual:    ${stats.fieldsAlreadyObject}`);

  if (dryRun) {
    console.log("\n  (Dry run — no files were modified)");
  } else {
    console.log("\n  Done. All lesson files updated.");
  }
}

main();
