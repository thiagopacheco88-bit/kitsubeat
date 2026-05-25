#!/usr/bin/env npx tsx
/**
 * Validates quiz distractor quality for a given word-bank part or HTML quiz file.
 *
 * Checks:
 * 1. AMBIGUOUS — distractor meaning overlaps with the correct word's meaning
 * 2. CROSS-QUIZ — distractor romaji appears as a correct answer elsewhere in same quiz
 * 3. DB-MISMATCH — HTML uses distractors that differ from the vetted DB set
 *
 * Usage:
 *   # Validate a word-bank part
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/audit/validate-quiz-alternatives.ts \
 *     --series one-piece --part 5
 *
 *   # Validate a rendered quiz HTML
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/audit/validate-quiz-alternatives.ts \
 *     --html videos/one-piece-quiz-2/index.html
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { getDb } from "../../src/lib/db/index.js";
import { vocabularyItems } from "../../src/lib/db/schema.js";
import { eq } from "drizzle-orm";

// ── Arg parsing ───────────────────────────────────────────────────────────────

function getArg(flag: string) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : null;
}

// ── Ambiguity check ───────────────────────────────────────────────────────────

// Words that are close enough in meaning to cause confusion.
// Extend this list as new issues are found.
const SYNONYM_PAIRS: [string, string][] = [
  ["friend", "comrade"],
  ["comrade", "friend"],
  ["warrior", "swordsman"],
  ["swordsman", "warrior"],
  ["samurai", "swordsman"],
  ["swordsman", "samurai"],
  ["soldier", "warrior"],
  ["warrior", "soldier"],
  ["gold", "treasure"],
  ["treasure", "gold"],
  ["hope", "dream"],
  ["dream", "wish"],
  ["wish", "hope"],
  ["journey", "voyage"],
  ["voyage", "journey"],
  ["resolve", "determination"],
  ["determination", "will"],
  ["will", "resolve"],
];

function isSemanticallyClose(a: string, b: string): boolean {
  const al = a.toLowerCase().trim();
  const bl = b.toLowerCase().trim();
  if (al === bl) return true;
  // Substring: "dream" inside "day-dream" etc
  if (al.includes(bl) || bl.includes(al)) return true;
  return SYNONYM_PAIRS.some(([x, y]) => al.includes(x) && bl.includes(y));
}

interface QuizWord {
  romaji: string;
  meaning: string;
  question: string;
  distractors: { r: string; e: string }[];
}

interface Issue {
  word: string;
  distractor: string;
  type: "AMBIGUOUS" | "CROSS-QUIZ" | "DB-MISMATCH";
  detail: string;
}

// ── Validate a set of quiz words ──────────────────────────────────────────────

async function validateWords(words: QuizWord[]): Promise<Issue[]> {
  const db = getDb();
  const issues: Issue[] = [];
  const correctRomajis = new Set(words.map(w => w.romaji));

  for (const word of words) {
    for (const d of word.distractors) {
      // 1. Ambiguous meaning
      if (isSemanticallyClose(d.e, word.meaning)) {
        issues.push({
          word: word.romaji,
          distractor: d.r,
          type: "AMBIGUOUS",
          detail: `"${d.r}" (${d.e}) is semantically close to correct answer "${word.romaji}" (${word.meaning})`,
        });
      }

      // 2. Cross-quiz: distractor romaji IS a correct answer elsewhere
      if (correctRomajis.has(d.r) && d.r !== word.romaji) {
        issues.push({
          word: word.romaji,
          distractor: d.r,
          type: "CROSS-QUIZ",
          detail: `"${d.r}" appears as a correct answer in the same quiz`,
        });
      }
    }

    // 3. DB mismatch: compare against stored distractors
    const rows = await db
      .select({ quiz_distractors: vocabularyItems.quiz_distractors })
      .from(vocabularyItems)
      .where(eq(vocabularyItems.romaji, word.romaji))
      .limit(1);

    if (rows.length > 0 && rows[0].quiz_distractors) {
      const dbDistractors = rows[0].quiz_distractors as { r: string; e: string }[];
      const dbSet = new Set(dbDistractors.map(d => d.r));
      const htmlSet = new Set(word.distractors.map(d => d.r));
      const diff = [...htmlSet].filter(r => !dbSet.has(r));
      if (diff.length > 0) {
        issues.push({
          word: word.romaji,
          distractor: diff.join(", "),
          type: "DB-MISMATCH",
          detail: `Quiz uses [${diff.join(", ")}] but DB has [${[...dbSet].join(", ")}]`,
        });
      }
    }
  }

  return issues;
}

// ── Parse word-bank ───────────────────────────────────────────────────────────

function loadFromWordBank(series: string, part: number): QuizWord[] {
  const path = join(process.cwd(), "videos", "word-banks", `${series}.json`);
  const bank = JSON.parse(readFileSync(path, "utf-8"));
  const p = bank.parts.find((p: any) => p.part === part);
  if (!p) throw new Error(`Part ${part} not found in ${series}`);
  return p.words.map((w: any) => ({
    romaji: w.romaji,
    meaning: w.en,
    question: w.q,
    distractors: w.wrong,
  }));
}

// ── Parse HTML quiz ───────────────────────────────────────────────────────────

function loadFromHtml(htmlPath: string): QuizWord[] {
  const html = readFileSync(htmlPath, "utf-8");

  // Split on scene boundaries — each scene starts with <div class="scene" id="sN">
  const sceneParts = html.split(/<div class="scene" id="s\d+">/);
  // First part is preamble (before first scene); skip it
  const sceneBlocks = sceneParts.slice(1);

  // Extract correct answer IDs from QUESTIONS JS array
  const correctRegex = /correct:\s*'#(q\d+[a-d])'/g;
  const corrects: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = correctRegex.exec(html)) !== null) corrects.push(m[1]);

  return sceneBlocks.map((block, i) => {
    // Question text
    const qm = block.match(/class="question-text">How do you say<br>"([^"]+)"/);
    const meaning = qm ? qm[1] : "?";

    // All options
    const optRegex = /id="(q\d+[a-d])"[^>]*>.*?opt-romaji">([^<]+)/g;
    const options: { id: string; romaji: string }[] = [];
    let om: RegExpExecArray | null;
    while ((om = optRegex.exec(block)) !== null) {
      options.push({ id: om[1], romaji: om[2].trim() });
    }

    const correctId = corrects[i] ?? "";
    const correct = options.find(o => o.id === correctId);
    const wrong = options.filter(o => o.id !== correctId);

    return {
      romaji: correct?.romaji ?? "?",
      meaning,
      question: `How do you say "${meaning}" in Japanese?`,
      distractors: wrong.map(o => ({ r: o.romaji, e: "?" })),
    };
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  let words: QuizWord[];

  const htmlPath = getArg("--html");
  const series   = getArg("--series");
  const partStr  = getArg("--part");

  if (htmlPath) {
    console.log(`\n🔍 Validating HTML: ${htmlPath}`);
    words = loadFromHtml(htmlPath);
  } else if (series && partStr) {
    console.log(`\n🔍 Validating word-bank: ${series} part ${partStr}`);
    words = loadFromWordBank(series, parseInt(partStr));
  } else {
    console.error("Usage: --html <path> OR --series <name> --part <n>");
    process.exit(1);
  }

  console.log(`   ${words.length} words loaded\n`);
  words.forEach(w => {
    console.log(`   ${w.romaji} (${w.meaning}) — distractors: ${w.distractors.map(d => d.r).join(", ")}`);
  });

  const issues = await validateWords(words);

  if (issues.length === 0) {
    console.log("\n✅ No issues found — all distractors look clean.");
    return;
  }

  console.log(`\n⚠️  ${issues.length} issue(s) found:\n`);
  for (const issue of issues) {
    const icon = issue.type === "AMBIGUOUS" ? "🔴" : issue.type === "CROSS-QUIZ" ? "🟠" : "🟡";
    console.log(`${icon} [${issue.type}] ${issue.word} ← "${issue.distractor}"`);
    console.log(`   ${issue.detail}\n`);
  }

  process.exit(issues.length > 0 ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
