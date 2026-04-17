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
  // Only collect Playwright .spec.ts files. tests/integration/**/*.test.ts are
  // vitest tests (plan 08.1-03) and would error on @vitest/expect imports if
  // Playwright tried to load them. tests/support/** are helpers, not tests.
  testMatch: ["**/*.spec.ts"],
  testIgnore: ["**/support/**", "**/integration/**"],
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
    // NEXT_PUBLIC_APP_ENV=test is the SINGLE gate that exposes test-only hooks:
    //   - window.__kbExerciseStore (see src/stores/exerciseSession.ts) — exercise E2E
    //   - window.__kbPlayer (see src/app/songs/[slug]/components/YouTubeEmbed.tsx) —
    //     player sync E2E (plan 08.1-05)
    //   - data-start-ms attribute on VerseBlock (see VerseBlock.tsx) — verse timing lookup
    // Without this env var, those specs cannot read state across the cross-origin iframe
    // boundary or look up verse timing, and will skip / hang at waitForFunction.
    // This env var is benign in any other context — it only flips the test-only hooks.
    env: {
      NEXT_PUBLIC_APP_ENV: "test",
    },
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
