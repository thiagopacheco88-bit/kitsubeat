/**
 * scripts/qa/measure-suite-runtime.ts
 *
 * Plan 08.1-08 Task 1.
 *
 * Runs every layer of the QA suite sequentially, times each one, prints a summary
 * table, and exits non-zero if (a) any layer fails OR (b) the total wall-clock time
 * exceeds the 15-minute budget locked in CONTEXT.md.
 *
 * Order is fastest-first so a regression in unit/integration short-circuits the
 * whole run before E2E starts (E2E is the slowest layer and the most expensive
 * to run end-to-end):
 *
 *   1. test:qa            — content QA (Node, no DB writes from app)
 *   2. test:unit          — vitest unit (pure TS, no DB)
 *   3. test:integration   — vitest integration (DB + API handlers)
 *   4. test:e2e           — playwright (browser, real YouTube iframe)
 *
 * Usage:
 *   tsx scripts/qa/measure-suite-runtime.ts                    # full run, asserts <15min
 *   tsx scripts/qa/measure-suite-runtime.ts --skip-e2e         # PR-speed run (no E2E)
 *   tsx scripts/qa/measure-suite-runtime.ts --budget 900000    # override budget (ms)
 *
 * Budget assertion: total elapsed must be <= BUDGET_MS (default 15 * 60 * 1000).
 * Even when --skip-e2e is passed, the budget assertion is still active — a PR-speed
 * run that takes >15min is itself a regression worth surfacing.
 *
 * Exit codes:
 *   0   all layers PASSed AND total <= budget
 *   1   any layer FAILed OR total exceeded budget
 */

import { spawnSync } from "node:child_process";

interface Layer {
  name: string;          // npm script name, e.g. "test:qa"
  label: string;         // human-readable label, e.g. "test:qa"
  skipUnder: "skip-e2e" | null; // CLI flag that skips this layer
}

interface LayerResult {
  layer: Layer;
  durationMs: number;
  status: "PASS" | "FAIL" | "SKIP";
  exitCode: number;
}

const LAYERS: readonly Layer[] = [
  { name: "test:qa",          label: "test:qa",          skipUnder: null },
  { name: "test:unit",        label: "test:unit",        skipUnder: null },
  { name: "test:integration", label: "test:integration", skipUnder: null },
  { name: "test:e2e",         label: "test:e2e",         skipUnder: "skip-e2e" },
];

function parseBudgetMs(argv: readonly string[]): number {
  const i = argv.indexOf("--budget");
  if (i === -1) return 15 * 60 * 1000; // 15 minutes default
  const raw = argv[i + 1];
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    process.stderr.write(`[measure-suite-runtime] invalid --budget value: ${raw}\n`);
    process.exit(2);
  }
  return n;
}

function fmtDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function pad(s: string, width: number): string {
  if (s.length >= width) return s;
  return s + " ".repeat(width - s.length);
}

function runLayer(layer: Layer): LayerResult {
  process.stdout.write(`\n[measure-suite-runtime] -> npm run ${layer.name}\n`);
  const t0 = Date.now();
  // npm.cmd is required on Windows (spawn does not auto-resolve PATHEXT).
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(npmCmd, ["run", layer.name], {
    stdio: "inherit",
    env: process.env,
  });
  const durationMs = Date.now() - t0;
  const exitCode = result.status ?? (result.signal ? 137 : 1);
  return {
    layer,
    durationMs,
    status: exitCode === 0 ? "PASS" : "FAIL",
    exitCode,
  };
}

function printTable(results: readonly LayerResult[], totalMs: number, budgetMs: number, totalStatus: "PASS" | "FAIL"): void {
  const NAME_W = 18;
  const DUR_W = 10;
  const STATUS_W = 6;
  const sep = "-".repeat(NAME_W) + "  " + "-".repeat(DUR_W) + "  " + "-".repeat(STATUS_W);

  process.stdout.write("\n");
  process.stdout.write(`${pad("Layer", NAME_W)}  ${pad("Duration", DUR_W)}  ${pad("Status", STATUS_W)}\n`);
  process.stdout.write(`${sep}\n`);
  for (const r of results) {
    process.stdout.write(`${pad(r.layer.label, NAME_W)}  ${pad(fmtDuration(r.durationMs), DUR_W)}  ${pad(r.status, STATUS_W)}\n`);
  }
  process.stdout.write(`${sep}\n`);
  const budgetLabel = `(budget ${fmtDuration(budgetMs)})`;
  process.stdout.write(`${pad("Total", NAME_W)}  ${pad(fmtDuration(totalMs), DUR_W)}  ${pad(totalStatus, STATUS_W)}  ${budgetLabel}\n`);
  process.stdout.write("\n");
}

function main(): number {
  const argv = process.argv.slice(2);
  const skipE2E = argv.includes("--skip-e2e");
  const budgetMs = parseBudgetMs(argv);

  process.stdout.write(
    `[measure-suite-runtime] starting${skipE2E ? " (--skip-e2e)" : ""} | budget ${fmtDuration(budgetMs)}\n`
  );

  const t0 = Date.now();
  const results: LayerResult[] = [];

  for (const layer of LAYERS) {
    if (skipE2E && layer.skipUnder === "skip-e2e") {
      results.push({ layer, durationMs: 0, status: "SKIP", exitCode: 0 });
      continue;
    }
    const r = runLayer(layer);
    results.push(r);
    if (r.status === "FAIL") {
      // Fail-fast: do not run remaining layers — but still print the table so
      // the operator can see how far we got + which layer broke.
      process.stdout.write(
        `\n[measure-suite-runtime] layer "${layer.label}" FAILED (exit ${r.exitCode}); skipping remaining layers.\n`
      );
      // Mark remaining layers as SKIP so the table is complete.
      const remaining = LAYERS.slice(LAYERS.indexOf(layer) + 1);
      for (const next of remaining) {
        results.push({ layer: next, durationMs: 0, status: "SKIP", exitCode: 0 });
      }
      break;
    }
  }

  const totalMs = Date.now() - t0;
  const anyFailed = results.some((r) => r.status === "FAIL");
  const overBudget = totalMs > budgetMs;
  const totalStatus: "PASS" | "FAIL" = anyFailed || overBudget ? "FAIL" : "PASS";

  printTable(results, totalMs, budgetMs, totalStatus);

  if (anyFailed) {
    process.stderr.write(
      `[measure-suite-runtime] FAIL — at least one layer did not pass.\n`
    );
  }
  if (overBudget) {
    process.stderr.write(
      `[measure-suite-runtime] FAIL — total ${fmtDuration(totalMs)} exceeded budget ${fmtDuration(budgetMs)}.\n`
    );
  }

  return totalStatus === "PASS" ? 0 : 1;
}

process.exit(main());
