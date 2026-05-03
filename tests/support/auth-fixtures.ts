/**
 * tests/support/auth-fixtures.ts — Authenticated Playwright fixture for Phase 14.2.
 *
 * Plans 14.2-13/14/15 import `authenticatedTest` from this file for any spec that
 * requires an authenticated user context (above-fold-auth, continue-learning-data,
 * cross-surface-header, hero-fallback, axe auth runs).
 *
 * Mechanism: relies on Plan 14.2-01b's double-gated bypass in
 * src/lib/user-prefs.ts::getCurrentUserId. The bypass is activated by the
 * playwright.config.ts webServer.env block when process.env.PLAYWRIGHT_AUTH=true.
 *
 * Run authenticated specs via:
 *   PLAYWRIGHT_AUTH=true KB_E2E_AUTH_BYPASS=test-user-1 \
 *     npx playwright test tests/e2e/home-above-fold-auth.spec.ts
 *
 * Per the threat-model: the bypass refuses to activate when NODE_ENV=production
 * AND emits console.warn on every call. See Plan 14.2-01b.
 *
 * IMPORTANT: KB_E2E_AUTH_BYPASS must NOT be set to "test-user-e2e" — that
 * value is PLACEHOLDER_USER_ID in user-prefs.ts and would produce ambiguous
 * results (auth and unauth would look the same to the app). Use "test-user-1"
 * or any other distinct id.
 */
import { test as base, expect } from "@playwright/test";
import { resetTestProgress } from "./test-db";

interface AuthFixtures {
  authedUserId: string;
}

export const authenticatedTest = base.extend<AuthFixtures>({
  authedUserId: async ({}, use) => {
    // Verify the bypass env is wired (otherwise the spec would silently run unauth).
    // This guard is a SECOND check beyond playwright.config.ts — defense in depth.
    //
    // NOTE: KB_E2E_AUTH_BYPASS_ENABLED is injected into the Next.js *server* process
    // by playwright.config.ts webServer.env (it does NOT exist in the Playwright runner
    // process). The Playwright-process check is therefore on PLAYWRIGHT_AUTH and
    // KB_E2E_AUTH_BYPASS only.
    if (
      process.env.PLAYWRIGHT_AUTH !== "true" ||
      !process.env.KB_E2E_AUTH_BYPASS
    ) {
      throw new Error(
        "[auth-fixtures] authenticatedTest requires PLAYWRIGHT_AUTH=true AND " +
          "KB_E2E_AUTH_BYPASS=<id> in the environment. " +
          "playwright.config.ts propagates KB_E2E_AUTH_BYPASS_ENABLED to the server. " +
          "See Plan 14.2-01b for setup.",
      );
    }
    const bypassId = process.env.KB_E2E_AUTH_BYPASS as string;
    await use(bypassId);
    // Cleanup: wipe any user_song_progress writes between tests.
    // Guard on TEST_DATABASE_URL — the cleanup is a no-op in environments without
    // a test DB (e.g., the smoke spec run on a fresh worktree without TEST_DATABASE_URL).
    // Tests that actually write progress data require TEST_DATABASE_URL to be set.
    if (process.env.TEST_DATABASE_URL) {
      await resetTestProgress(bypassId);
    }
  },
});

export { expect };
