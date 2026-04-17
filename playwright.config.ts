import { defineConfig } from "@playwright/test";

/**
 * Playwright configuration for the Kitsubeat E2E suite.
 *
 * Hard rules (do NOT change without RFC):
 * - Zero retries (zero-flake policy). Any intermittent failure quarantines the test
 *   until root-caused. Auto-retry hides real bugs.
 * - One project (chromium) keeps the suite under the 15-minute speed budget.
 * - Reporter is terminal-first; HTML report is generated but never auto-opened
 *   (`npm run test:report` to view).
 */
export default defineConfig({
  testDir: "./tests",
  // Skip support helpers (fixtures, reporter, db helpers) — they're not test files.
  testIgnore: ["**/support/**"],
  timeout: 30_000,
  // Zero-flake policy: never auto-retry. See CONTEXT.md > "Zero-tolerance flaky-test policy".
  retries: 0,
  fullyParallel: true,
  reporter: [
    ["./tests/support/reporter-terminal.ts"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  expect: {
    // Slow assertions fail fast — keeps the 15-minute suite budget realistic.
    timeout: 5_000,
  },
  use: {
    baseURL: "http://localhost:7000",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    port: 7000,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
