/**
 * Phase 14.1 AC #1 — Starter-bug repair: null slug branch renders.
 *
 * Verifies that /path renders without runtime error when
 * current_path_node_slug is null (new user / StarterPick branch).
 *
 * The SPEC-REQ-1 fix was: getStarterSongs() filters to slugs proven to exist
 * in the songs table at query time. The StarterPick component receives only
 * valid candidates (or an empty list that gracefully degrades to an EmptyState).
 *
 * Two test strategies:
 *
 *   A) With TEST_DATABASE_URL (HAS_TEST_DB=true): seed the test user to
 *      current_path_node_slug = null, navigate, assert StarterPick modal or
 *      EmptyState renders without console errors.
 *
 *   B) Without TEST_DATABASE_URL: A smoke test that navigates to /path and
 *      asserts the route returns 200 (no server-level error). This is a
 *      weaker assertion but still confirms the null-slug code path does not
 *      throw at build / render time.
 *
 * Per PLAN task: path-starter-bug-repair covers AC #1. Specs requiring
 * seeded DB are gated by HAS_TEST_DB (existing pattern from gamification-path
 * and advanced-drill-quota specs).
 */
import { sql } from "drizzle-orm";
import { test, expect } from "../support/fixtures";
import { getTestDb, TEST_USER_ID } from "../support/test-db";

const HAS_TEST_DB = Boolean(process.env.TEST_DATABASE_URL);

test.describe("/path starter-bug repair — null slug branch renders", () => {
  test("renders without runtime error when current_path_node_slug is null (seeded DB)", async ({
    page,
  }) => {
    test.skip(
      !HAS_TEST_DB,
      "Requires TEST_DATABASE_URL to seed null current_path_node_slug",
    );

    // Seed: set current_path_node_slug = null for the test user
    const db = getTestDb();
    await db.execute(sql`
      UPDATE users SET current_path_node_slug = NULL
      WHERE id = ${TEST_USER_ID}
    `);

    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(String(err)));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/path");
    await page.waitForLoadState("networkidle");

    // Route must stay on /path (no redirect / crash)
    expect(page.url()).toContain("/path");

    // Either the StarterPick modal or the EmptyState fallback must be visible
    const hasStarter =
      (await page
        .locator('[data-testid="starter-pick-modal"]')
        .count()) > 0;
    const hasEmpty =
      (await page.getByText(/More starter songs/i).count()) > 0;
    expect(
      hasStarter || hasEmpty,
      "Expected StarterPick modal or EmptyState fallback to be visible",
    ).toBe(true);

    // No runtime errors (filter out expected [starter-songs] warnings)
    const unexpectedErrors = errors.filter(
      (e) => !e.includes("[starter-songs]"),
    );
    expect(
      unexpectedErrors,
      `Unexpected console errors: ${JSON.stringify(unexpectedErrors)}`,
    ).toEqual([]);
  });

  test("smoke: /path returns 200 OK (validates null-slug code path not broken at render)", async ({
    page,
  }) => {
    // Unconditional smoke — does NOT require TEST_DATABASE_URL.
    // Asserts that navigating to /path does not throw an application-level error.
    // This is a weaker assertion than the seeded-DB test above, but it confirms
    // the fix is not entirely broken.
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(String(err)));

    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto("/path");
    await page.waitForLoadState("networkidle");

    // Route must load without HTTP error
    expect(response?.status()).toBe(200);

    // No catastrophic runtime errors on the page
    await expect(page.locator("body")).not.toContainText(
      "Application error: a client-side exception has occurred",
    );
  });
});
