/**
 * Motion-catalog-completeness audit (Phase 14, plan 14-00 task 3).
 *
 * Asserts docs/motion-catalog.md exists and contains exactly 12 entries,
 * each with the 5 required fields per SPEC AC #11:
 *   - Trigger
 *   - Duration
 *   - Easing
 *   - Target
 *   - Reduced-motion fallback
 *
 * Wave 0 expectation: docs/motion-catalog.md does NOT exist yet — this
 * audit fails with exit 1. The catalog is created in Plan 14-04 and at
 * that point this audit flips to exit 0. CI is wired against this script
 * now so the gate exists from day one.
 *
 * Usage:
 *   npx tsx scripts/audit/motion-catalog-completeness.ts
 *
 * Exit codes:
 *   0 — catalog exists, has 12 entries, all 5 fields present in each
 *   1 — file missing OR entry count != 12 OR any required field missing
 */

import { fileURLToPath } from "url";
import { resolve, join } from "path";
import { existsSync, readFileSync } from "fs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const CATALOG_PATH = join(ROOT, "docs", "motion-catalog.md");

const REQUIRED_FIELDS = [
  "Trigger",
  "Duration",
  "Easing",
  "Target",
  "Reduced-motion fallback",
];

const EXPECTED_ENTRIES = 12;

function main(): number {
  if (!existsSync(CATALOG_PATH)) {
    console.error(
      "FAIL — docs/motion-catalog.md does not exist.",
    );
    console.error(
      "EXPECTED — Wave 0 placeholder; docs/motion-catalog.md is created in Plan 14-04.",
    );
    return 1;
  }

  const md = readFileSync(CATALOG_PATH, "utf8");

  // Each entry is a "## name" heading section. The first split element is
  // anything before the first "## " (file header / intro), so drop it.
  const entries = md.split(/^## /m).slice(1);

  if (entries.length !== EXPECTED_ENTRIES) {
    console.error(
      `FAIL — expected ${EXPECTED_ENTRIES} entries in docs/motion-catalog.md, found ${entries.length}.`,
    );
    return 1;
  }

  const failures: string[] = [];
  for (const entry of entries) {
    const heading = entry.split("\n", 1)[0].trim();
    for (const field of REQUIRED_FIELDS) {
      if (!entry.includes(field)) {
        failures.push(`Missing field "${field}" in entry: ${heading}`);
      }
    }
  }

  if (failures.length > 0) {
    for (const f of failures) console.error(`FAIL — ${f}`);
    return 1;
  }

  console.log(
    `OK — ${EXPECTED_ENTRIES} entries in docs/motion-catalog.md, all ${REQUIRED_FIELDS.length} fields present.`,
  );
  return 0;
}

process.exit(main());
