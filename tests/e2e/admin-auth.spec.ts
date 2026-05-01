import { test, expect } from "@playwright/test";

/**
 * Phase 11.5 SPEC #1 — admin auth gate.
 *
 * Cannot fully e2e-test the "logged-in non-admin" path here without programmatic Clerk
 * sign-in helpers (Clerk's @clerk/testing package would be required; out of scope for this
 * plan — manual UAT covers it per VALIDATION.md). This spec covers the LOGGED-OUT path
 * which is the most-likely-broken case (D-04 redirect must work without leaking 401/403).
 */

test.describe("/admin/* gate (logged-out)", () => {
  test("logged-out user GET /admin/lyrics is redirected to /", async ({ page }) => {
    const response = await page.goto("/admin/lyrics", { waitUntil: "domcontentloaded" });
    // Final URL must be / (or /sign-in if Clerk default redirect is enabled — but D-04 forbids that;
    // we assert it's NOT 401/403 and is the redirect to /).
    expect(page.url()).toMatch(/\/(\?.*)?$/);
    if (response) {
      expect([200, 307, 302]).toContain(response.status());
      expect(response.status()).not.toBe(401);
      expect(response.status()).not.toBe(403);
    }
  });

  test("logged-out user GET /admin/timing is redirected to /", async ({ page }) => {
    const response = await page.goto("/admin/timing", { waitUntil: "domcontentloaded" });
    expect(page.url()).toMatch(/\/(\?.*)?$/);
    if (response) {
      expect(response.status()).not.toBe(401);
      expect(response.status()).not.toBe(403);
    }
  });

  test("public route / is unaffected (middleware did not activate)", async ({ page }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    expect(page.url()).toMatch(/\/(\?.*)?$/);
  });
});
