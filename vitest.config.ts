import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
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
  // React plugin handles the JSX transform for .tsx test files. tsconfig has
  // `jsx: "preserve"` (Next.js owns the transform in prod) so Vite must supply
  // its own JSX loader for the test-time compile.
  plugins: [react()],
  test: {
    globals: true,
    environment: "node",
    // Per-file environment override is done via a `// @vitest-environment jsdom`
    // directive on the first line of a component test. Phase 10-02 introduced
    // the first .tsx test in the repo (src/app/songs/[slug]/components/
    // __tests__/PlayerContext.test.tsx). `node` stays the default because it
    // is ~2-3x faster and every pre-10-02 test is pure TS. Legacy
    // `environmentMatchGlobs` was removed in vitest v4 — use the directive.
    include: [
      "src/**/*.{test,spec}.ts",
      "src/**/*.{test,spec}.tsx",
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
