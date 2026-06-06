#!/usr/bin/env npx tsx --tsconfig tsconfig.scripts.json
/**
 * Validates all word-bank JSON files for quiz quality issues.
 *
 * ERROR (exits non-zero):
 *   SELF_REF      — question text contains the romaji answer
 *   WRONG_EQUALS_CORRECT — a distractor romaji matches the correct romaji
 *   DUPE_WRONG    — duplicate distractors within one word
 *
 * WARNING (logged but non-fatal):
 *   SAME_GLOSS    — a distractor English gloss matches the correct English gloss
 *   WRONG_IS_CORRECT — a distractor is the correct answer for another word in the same part
 *
 * Run: npx tsx --tsconfig tsconfig.scripts.json scripts/social/validate-quiz-banks.ts
 */

import { readFileSync, readdirSync } from "fs";
import { join, basename } from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORD_BANKS_DIR = join(__dirname, "../../videos/word-banks");

type Distractor = { r: string; e: string };
type Word = { id: string; q: string; romaji: string; en: string; wrong: Distractor[] };
type Part = { part: number; theme: string; words: Word[] };
type Bank = { series: string; label: string; parts: Part[] };

type Issue = {
  level: "ERROR" | "WARNING";
  code: string;
  file: string;
  part: number;
  word: string;
  message: string;
};

function validate(bank: Bank, file: string): Issue[] {
  const issues: Issue[] = [];

  for (const part of bank.parts) {
    // Build romaji→word map for WRONG_IS_CORRECT check
    const romajiMap = new Map<string, string>();
    for (const w of part.words) {
      romajiMap.set(w.romaji.toLowerCase(), w.id);
    }

    for (const w of part.words) {
      const q = w.q.toLowerCase();
      const ans = w.romaji.toLowerCase();

      // SELF_REF: question contains the answer romaji as a whole word
      const selfRefPattern = new RegExp(`\\b${ans.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
      if (selfRefPattern.test(q)) {
        issues.push({
          level: "ERROR",
          code: "SELF_REF",
          file,
          part: part.part,
          word: w.id,
          message: `Question "${w.q}" contains the answer romaji "${w.romaji}"`,
        });
      }

      const seenRomaji = new Set<string>();
      const seenGloss = new Set<string>();

      for (const d of w.wrong) {
        const dr = d.r.toLowerCase();
        const de = d.e.toLowerCase();

        // WRONG_EQUALS_CORRECT
        if (dr === ans) {
          issues.push({
            level: "ERROR",
            code: "WRONG_EQUALS_CORRECT",
            file,
            part: part.part,
            word: w.id,
            message: `Distractor romaji "${d.r}" equals correct answer "${w.romaji}"`,
          });
        }

        // DUPE_WRONG
        if (seenRomaji.has(dr)) {
          issues.push({
            level: "ERROR",
            code: "DUPE_WRONG",
            file,
            part: part.part,
            word: w.id,
            message: `Duplicate distractor romaji "${d.r}"`,
          });
        }
        seenRomaji.add(dr);

        // SAME_GLOSS
        if (de === w.en.toLowerCase()) {
          if (!seenGloss.has(de)) {
            issues.push({
              level: "WARNING",
              code: "SAME_GLOSS",
              file,
              part: part.part,
              word: w.id,
              message: `Distractor "${d.r}" has same English gloss "${d.e}" as correct answer "${w.en}"`,
            });
          }
          seenGloss.add(de);
        }

        // WRONG_IS_CORRECT
        const matchId = romajiMap.get(dr);
        if (matchId && matchId !== w.id) {
          issues.push({
            level: "WARNING",
            code: "WRONG_IS_CORRECT",
            file,
            part: part.part,
            word: w.id,
            message: `Distractor "${d.r}" is the correct answer for word "${matchId}" in same part`,
          });
        }
      }
    }
  }

  return issues;
}

function main(): void {
  const files = readdirSync(WORD_BANKS_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();

  const allIssues: Issue[] = [];

  for (const f of files) {
    const path = join(WORD_BANKS_DIR, f);
    let bank: Bank;
    try {
      bank = JSON.parse(readFileSync(path, "utf8")) as Bank;
    } catch (e) {
      console.error(`✗ Failed to parse ${f}: ${e}`);
      allIssues.push({ level: "ERROR", code: "PARSE_ERROR", file: f, part: 0, word: "", message: String(e) });
      continue;
    }
    allIssues.push(...validate(bank, f));
  }

  const errors = allIssues.filter((i) => i.level === "ERROR");
  const warnings = allIssues.filter((i) => i.level === "WARNING");

  if (allIssues.length === 0) {
    console.log("✅  All word-banks valid — 0 issues found.");
    process.exit(0);
  }

  if (errors.length > 0) {
    console.log(`\n❌  ERRORS (${errors.length}):`);
    for (const e of errors) {
      console.log(`  [${e.file} P${e.part} / ${e.word}] ${e.code}: ${e.message}`);
    }
  }

  if (warnings.length > 0) {
    console.log(`\n⚠   WARNINGS (${warnings.length}):`);
    for (const w of warnings) {
      console.log(`  [${w.file} P${w.part} / ${w.word}] ${w.code}: ${w.message}`);
    }
  }

  console.log(`\nSummary: ${errors.length} error(s), ${warnings.length} warning(s) across ${files.length} files.`);

  if (errors.length > 0) {
    process.exit(1);
  }
}

main();
