/**
 * D-04: Onboarding/terms gate smoke test — scoped to anonymous + loop-prevention cases.
 *
 * The middleware terms gate (src/middleware.ts step 2) redirects authenticated users
 * without an accepted terms_version to /onboarding/age-gate. This spec tests the two
 * cases that do NOT require auth and are safe to run without the auth bypass:
 *
 *   1. Anonymous user passes through (gate is auth-only — if (session.userId) {...})
 *   2. /onboarding/age-gate is excluded from the gate via isLegalOrOnboardingRoute,
 *      preventing redirect loops.
 *
 * OUT OF SCOPE (requires future runtime verification — see research Pitfall 4):
 *   - "authenticated user without terms_version gets redirected to /onboarding/age-gate"
 *
 * Why: The E2E auth bypass (KB_E2E_AUTH_BYPASS) populates getCurrentUserId() in
 * lib/user-prefs.ts, but the terms gate reads session.sessionClaims from Clerk's
 * clerkMiddleware auth() — a different code path. Until verified that the bypass
 * propagates session.userId to clerkMiddleware's auth() object, the auth-redirect case
 * cannot be tested without silently running as anonymous (vacuous pass).
 *
 * To add the auth-redirect test:
 *   1. Add `console.log('[gate-test]', session.userId)` to middleware temporarily
 *   2. Run: PLAYWRIGHT_AUTH=true KB_E2E_AUTH_BYPASS=test-user-1 npx playwright test onboarding-terms-gate.spec.ts
 *   3. If session.userId is truthy in logs: implement the test using authenticatedTest fixture
 *   4. If session.userId is null: use a real Clerk test account or wait for bypass rework
 */
import { test, expect } from '@playwright/test';

test.describe('onboarding-terms-gate — D-04', () => {
  test('anonymous user navigating to /songs is not redirected to /onboarding/age-gate', async ({ page }) => {
    // No auth cookie, no session — anonymous visitor
    const response = await page.goto('/songs', { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // Anonymous users must pass through the terms gate entirely (gate is auth-only)
    expect(response?.status() ?? 200, '/songs should not 5xx for anonymous').toBeLessThan(500);
    await expect(page).not.toHaveURL(/\/onboarding\/age-gate/, { timeout: 10_000 });
    await expect(page.locator('body')).not.toContainText('This page could not be found');
  });

  test('/onboarding/age-gate is not redirected further — loop prevention', async ({ page, context }) => {
    // The isLegalOrOnboardingRoute matcher in middleware excludes /onboarding/* from the gate.
    // If this protection breaks, navigating here would cause an infinite redirect loop.
    //
    // Clear Clerk dev-browser cookies before navigation — parallel tests can set __clerk_db_jwt
    // which triggers auth-related redirects that mask the actual loop-prevention behavior.
    await context.clearCookies();
    const response = await page.goto('/onboarding/age-gate', { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // Must stay on the age-gate route (not redirect to itself or any other route).
    // Note: the route may return a 404 in some environments if the page is under a locale
    // segment not included in the intl middleware rewrite — that is a separate concern.
    // Loop prevention is verified purely by the URL not changing to a different path.
    expect(response?.status() ?? 200, '/onboarding/age-gate should not 5xx').toBeLessThan(500);
    await expect(page).toHaveURL(/\/onboarding\/age-gate/, { timeout: 10_000 });
  });
});
