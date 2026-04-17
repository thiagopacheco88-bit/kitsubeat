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
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
