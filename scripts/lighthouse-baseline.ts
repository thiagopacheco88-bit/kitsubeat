/**
 * Phase 13 D-14/D-15/D-16: capture local Lighthouse baseline.
 *
 * Pre-condition: `npm run start` (production build) MUST be running in a separate
 * shell on http://localhost:7000. Lighthouse is run against the production build,
 * NOT the dev server, per D-15 (matches what Phase 19 entry gate will run).
 *
 * Routes (D-14 LOCKED):
 *   /         — home
 *   /songs    — catalog
 *   /songs/{slug from target-song.txt} — song page (median slug from D-17)
 *
 * Presets (D-15 LOCKED):
 *   mobile  — Phase 19 gate target (Moto G4 4G profile, Lighthouse default)
 *   desktop — relative ceiling
 *
 * Runs are sequential (NOT parallel) — Lighthouse is sensitive to CPU contention;
 * sequential gives reproducible results. Total wall time ~3-5 minutes for 6 runs.
 *
 * Usage:
 *   # In shell A:
 *   npm run build && npm run start    # production build on :7000
 *
 *   # In shell B:
 *   npm run lighthouse:pick-target    # populate target-song.txt (D-17)
 *   npm run lighthouse:baseline       # ~3-5 min for 6 runs
 *
 * Output (D-16 LOCKED):
 *   .planning/phases/13-performance-infrastructure/lighthouse-baseline/
 *     home-mobile.json      home-desktop.json
 *     catalog-mobile.json   catalog-desktop.json
 *     song-mobile.json      song-desktop.json
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const OUT_DIR = resolve(
  __dirname,
  "..",
  ".planning",
  "phases",
  "13-performance-infrastructure",
  "lighthouse-baseline"
);

// D-15 LOCKED: production build target — localhost only, never a remote host.
const BASE = "http://localhost:7000";

mkdirSync(OUT_DIR, { recursive: true });

// Read the median target slug written by lighthouse:pick-target (D-17).
const targetFile = resolve(OUT_DIR, "target-song.txt");
if (!existsSync(targetFile)) {
  console.error(
    "[baseline] target-song.txt not found. Run `npm run lighthouse:pick-target` first."
  );
  process.exit(1);
}
const targetSlug = readFileSync(targetFile, "utf-8").trim();
if (!targetSlug) {
  console.error("[baseline] target-song.txt is empty. Re-run `npm run lighthouse:pick-target`.");
  process.exit(1);
}

console.log(`[baseline] Target slug (D-17): ${targetSlug}`);
console.log(`[baseline] Starting 6 sequential Lighthouse runs against ${BASE} ...`);

interface Run {
  label: string;
  route: string;
  preset: "mobile" | "desktop";
  outFile: string;
}

// D-14 LOCKED: 3 routes × 2 presets = 6 invocations per execution.
const RUNS: Run[] = [
  { label: "home",    route: "/",                        preset: "mobile",  outFile: "home-mobile.json" },
  { label: "home",    route: "/",                        preset: "desktop", outFile: "home-desktop.json" },
  { label: "catalog", route: "/songs",                   preset: "mobile",  outFile: "catalog-mobile.json" },
  { label: "catalog", route: "/songs",                   preset: "desktop", outFile: "catalog-desktop.json" },
  { label: "song",    route: `/songs/${targetSlug}`,     preset: "mobile",  outFile: "song-mobile.json" },
  { label: "song",    route: `/songs/${targetSlug}`,     preset: "desktop", outFile: "song-desktop.json" },
];

let failed = 0;

for (const r of RUNS) {
  const url = `${BASE}${r.route}`;
  const out = resolve(OUT_DIR, r.outFile);
  console.log(`\n[baseline] ${r.label}-${r.preset}: ${url} → ${r.outFile}`);

  // D-15: --preset=mobile (Moto G4 4G) | --preset=desktop
  // --chrome-flags: --headless for non-interactive; --no-sandbox for CI/restricted envs.
  const args = [
    "lighthouse",
    url,
    `--preset=${r.preset}`,
    "--output=json",
    `--output-path=${out}`,
    "--chrome-flags=--headless --no-sandbox",
    "--quiet",
  ];

  // shell: true is required on Windows (npx is a .cmd file, not a binary).
  const proc = spawnSync("npx", args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (proc.status !== 0) {
    console.error(`[baseline] FAILED: ${r.label}-${r.preset} (exit=${proc.status ?? "null"})`);
    failed++;
  } else {
    console.log(`[baseline] OK: ${r.outFile}`);
  }
}

console.log("\n");

if (failed > 0) {
  console.error(`[baseline] ${failed} of ${RUNS.length} runs failed. Check logs above.`);
  process.exit(1);
}

console.log(`[baseline] All ${RUNS.length} Lighthouse runs complete.`);
console.log(`[baseline] Output: ${OUT_DIR}`);
console.log(
  `[baseline] Next: extract scores into 13-SUMMARY.md "Performance baseline" table (Plan 13-04 Task 2).`
);
console.log(
  `[baseline] jq hint: jq -r '[(.categories.performance.score * 100), .audits["largest-contentful-paint"].numericValue, .audits["interactive"].numericValue] | @tsv' <file>.json`
);

process.exit(0);
