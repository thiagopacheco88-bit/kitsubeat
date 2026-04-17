import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Vitest configuration for unit + Node integration tests.
 *
 * Layering (see Phase 08.1 plans):
 * - Unit:        src/**\/*.{test,spec}.ts (pure TS — no DB/network)
 * - Integration: tests/integration/**\/*.{test,spec}.ts (DB + API, no browser)
 *
 * E2E (Playwright) lives in tests/e2e/** and is excluded here — see playwright.config.ts.
 * Test helpers live in tests/support/** and are NOT test files (excluded).
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: [
      "src/**/*.{test,spec}.ts",
      "tests/integration/**/*.{test,spec}.ts",
      "tests/unit/**/*.{test,spec}.ts",
    ],
    exclude: [
      "node_modules/**",
      "tests/e2e/**",
      "tests/support/**",
      // Exclude top-level Playwright spec(s) — they're not Vitest.
      "tests/*.spec.ts",
    ],
    reporters: ["default"],
    pool: "threads",
    // Setup file runs once per worker before any test module is imported. Loads
    // .env.test → .env.local (fallback) and redirects DATABASE_URL to
    // TEST_DATABASE_URL so the app's lazy `db` proxy resolves to the test DB.
    // See tests/integration/setup.ts for the full rationale. Safe for unit tests
    // in src/ — they don't touch process.env.DATABASE_URL.
    setupFiles: ["./tests/integration/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
