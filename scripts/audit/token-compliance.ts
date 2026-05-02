/**
 * Token-compliance audit (Phase 14, plan 14-00 task 3).
 *
 * Belt-and-suspenders grep audit that complements the kitsubeat-tokens
 * ESLint rule. Catches edge cases the rule misses (hex inside template
 * literals not on className, palette utilities in tailwind.config extensions,
 * etc.).
 *
 * Walks src/ recursively, skips test files (*.test.tsx, *.test.ts) and
 * D-18 allowlisted paths, regexes each line against 4 patterns, accumulates
 * violations, exits 0/1.
 *
 * Path-traversal protection: walk() only traverses under SRC = join(ROOT, "src").
 * No user input flows into the path. Reported violations are capped at 100 to
 * bound output.
 *
 * ReDoS protection: all 4 regexes use bounded character classes and fixed
 * quantifiers — no .* or nested quantifiers that could trigger catastrophic
 * backtracking. Lines are split before matching so input is bounded by line length.
 *
 * Usage:
 *   npx tsx scripts/audit/token-compliance.ts        — pretty-print
 *   npx tsx scripts/audit/token-compliance.ts --json — machine-readable
 *
 * Exit codes:
 *   0 — zero violations (Phase 14 merge gate)
 *   1 — violations found OR script error
 */

import { fileURLToPath } from "url";
import { resolve, join, relative } from "path";
import { readdirSync, readFileSync, statSync } from "fs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const SRC = join(ROOT, "src");

const PATTERNS = {
  rawHex: /\b(bg|text|border|fill|stroke|ring|shadow|outline|decoration|caret|accent|divide|placeholder)-\[#[0-9a-fA-F]{3,8}\]/g,
  arbitraryPx: /\b(text|p[xytrbl]?|m[xytrbl]?|gap|w|h|min-w|min-h|max-w|max-h|top|right|bottom|left|inset|space-[xy]|leading|tracking|rounded[a-z-]*|border|shadow|translate-[xy]|grid-cols|grid-rows|basis|size)-\[\d+(\.\d+)?px\]/g,
  paletteUtility: /\b(bg|text|border|fill|stroke|ring|outline|decoration|divide|placeholder|caret|accent|shadow|from|via|to)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)\b/g,
  bareWhiteBlack: /\b(bg|text|border|fill|stroke|ring|outline|decoration|divide|placeholder|caret|accent)-(white|black)\b(?!\/)/g,
};

const ALLOWLIST = [
  "src/components/ui/",
  "src/app/admin/",
  "src/app/__dev/",
  // Phase 14 Plan 14-04: Next.js excludes underscore-prefixed folders from
  // routing. To make /__dev/states reachable, the on-disk folder is
  // %5F%5Fdev (URL-encoded underscores). Allowlist both forms so future
  // contributors do not have to re-discover the workaround.
  "src/app/%5F%5Fdev/",
  "src/app/error.tsx",
  "src/app/global-error.tsx",
  "src/app/globals.css",
];

const VIOLATION_CAP = 100;

interface Violation {
  file: string;
  line: number;
  col: number;
  rule: keyof typeof PATTERNS;
  match: string;
}

function isAllowlisted(rel: string): boolean {
  const norm = rel.replace(/\\/g, "/");
  return ALLOWLIST.some((p) => norm.startsWith(p));
}

function isTestFile(rel: string): boolean {
  return /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(rel) || rel.includes("__tests__");
}

function walk(dir: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const abs = join(dir, entry);
    let stat;
    try {
      stat = statSync(abs);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      walk(abs, out);
    } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry)) {
      out.push(abs);
    }
  }
}

function checkFile(absPath: string, violations: Violation[]): void {
  const rel = relative(ROOT, absPath).replace(/\\/g, "/");
  if (isAllowlisted(rel) || isTestFile(rel)) return;
  let content: string;
  try {
    content = readFileSync(absPath, "utf8");
  } catch {
    return;
  }
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (violations.length >= VIOLATION_CAP) return;
    const line = lines[i];
    for (const [rule, pattern] of Object.entries(PATTERNS) as [keyof typeof PATTERNS, RegExp][]) {
      pattern.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(line)) !== null) {
        violations.push({
          file: rel,
          line: i + 1,
          col: m.index + 1,
          rule,
          match: m[0],
        });
        if (violations.length >= VIOLATION_CAP) return;
      }
    }
  }
}

async function main() {
  const json = process.argv.includes("--json");
  const files: string[] = [];
  walk(SRC, files);
  const violations: Violation[] = [];
  for (const f of files) {
    if (violations.length >= VIOLATION_CAP) break;
    checkFile(f, violations);
  }
  if (json) {
    console.log(JSON.stringify({ violations, count: violations.length, capped: violations.length >= VIOLATION_CAP }, null, 2));
  } else {
    if (violations.length === 0) {
      console.log("OK — token-compliance audit found 0 violations.");
    } else {
      const counts: Record<string, number> = {};
      for (const v of violations) {
        counts[v.rule] = (counts[v.rule] ?? 0) + 1;
        console.log(`${v.file}:${v.line}:${v.col}  ${v.rule}  ${v.match}`);
      }
      console.log("");
      console.log(`FAIL — ${violations.length} violations${violations.length >= VIOLATION_CAP ? " (capped)" : ""}.`);
      for (const [rule, c] of Object.entries(counts)) {
        console.log(`  ${rule}: ${c}`);
      }
      console.log("");
      console.log(`Each violation must be replaced with a token reference from src/app/globals.css @theme block.`);
      console.log(`Allowlist (CONTEXT D-18): ${ALLOWLIST.join(", ")}`);
    }
  }
  process.exit(violations.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
