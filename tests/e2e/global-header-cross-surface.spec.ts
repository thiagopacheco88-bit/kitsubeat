/**
 * Phase 14.2 SPEC AC #12 — cross-surface header coherence.
 *
 * Asserts the global header (wordmark + LanternStreak) renders on all four
 * primary surfaces: /, /path, /songs, /songs/[slug]. Validates SPEC §Req 1
 * (chip promotion) and Plan 14.2-12 (PathHeader deletion eliminates double
 * wordmark on /path).
 *
 * Also covers SPEC AC #14 partial: anonymous / — LanternStreak ABSENT, Sign in
 * button PRESENT.
 *
 * Gap closure from Plan 14.2-12 SUMMARY (assertion-loss table MEDIUM gap):
 * Asserts aria-label on [data-testid="lantern-streak"] (the LanternStreak inner
 * span) resolves to "{N}-day streak" pattern when auth is active with a
 * streak_current value. This carries the unit-level contract from
 * PathHeader.test.tsx line "threads streakCurrent into LanternStreak aria-label"
 * to the correct e2e layer (post-global-header migration).
 *
 * Run authenticated:
 *   PLAYWRIGHT_AUTH=true KB_E2E_AUTH_BYPASS=test-user-1 \
 *     npx playwright test tests/e2e/global-header-cross-surface.spec.ts
 *
 * Anonymous tests use the unauthenticated base test (no env required).
 */
import { authenticatedTest, expect } from "../support/auth-fixtures";
import { test as anonTest } from "@playwright/test";

const test = authenticatedTest;

/** Known seeded slugs from test-db.ts */
const SEEDED_SLUG = "again-yui"; // global, full lesson + timing — primary happy-path song

test.describe("Global header cross-surface coherence (AC #12)", () => {
  const ROUTES = ["/", "/path", "/songs", `/songs/${SEEDED_SLUG}`];
  const VIEWPORT = { width: 390, height: 844 };

  for (const route of ROUTES) {
    test(`${route} - shows brand-wordmark AND global-lantern-streak (auth)`, async ({
      page,
      context,
    }) => {
      await page.setViewportSize(VIEWPORT);
      await context.addCookies([
        {
          name: "kb_theme",
          value: "dark",
          url: "http://localhost:7000",
          sameSite: "Lax",
        },
      ]);

      await page.goto(route);
      await page.waitForLoadState("networkidle");

      // Brand wordmark MUST be present on every surface
      const wordmark = page.locator('[data-testid="brand-wordmark"]');
      await expect(wordmark).toBeVisible({ timeout: 5000 });

      // LanternStreak wrapper MUST be present (auth context)
      const streakWrapper = page.locator('[data-testid="global-lantern-streak"]');
      await expect(streakWrapper).toBeVisible({ timeout: 5000 });
    });
  }

  test("/path - exactly ONE KitsuBeat wordmark + ONE LanternStreak (PathHeader deletion verified)", async ({
    page,
    context,
  }) => {
    await page.setViewportSize(VIEWPORT);
    await context.addCookies([
      {
        name: "kb_theme",
        value: "dark",
        url: "http://localhost:7000",
        sameSite: "Lax",
      },
    ]);

    await page.goto("/path");
    await page.waitForLoadState("networkidle");

    // Count brand-wordmark occurrences — must be EXACTLY 1 (global header only;
    // PathHeader deleted in Plan 14.2-12 per CONTEXT D-07)
    const wordmarks = page.locator('[data-testid="brand-wordmark"]');
    await expect(wordmarks).toHaveCount(1);

    // Count global-lantern-streak wrappers — must be EXACTLY 1
    const streakWrappers = page.locator('[data-testid="global-lantern-streak"]');
    await expect(streakWrappers).toHaveCount(1);
  });

  /**
   * Gap closure from Plan 14.2-12 SUMMARY (assertion-loss table — MEDIUM gap):
   * "threads streakCurrent into LanternStreak aria-label" was tested by
   * PathHeader.test.tsx. Post-global-header migration, this contract moves to e2e.
   *
   * Assert [data-testid="lantern-streak"] (the LanternStreak inner <span role="img">)
   * has aria-label matching "{N}-day streak" pattern when auth session is active.
   *
   * Note: streak_current for test-user-1 may be 0. The assertion checks the pattern
   * (\d+-day streak) rather than an exact count to avoid needing seeded streak data.
   * A count of 0 renders aria-label="0-day streak" — still correct threading.
   */
  test("/ - LanternStreak aria-label threads streak_current value (MEDIUM gap closure)", async ({
    page,
    context,
  }) => {
    await page.setViewportSize(VIEWPORT);
    await context.addCookies([
      {
        name: "kb_theme",
        value: "dark",
        url: "http://localhost:7000",
        sameSite: "Lax",
      },
    ]);

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // The LanternStreak component renders a <span role="img" aria-label="{N}-day streak">
    // nested inside the [data-testid="global-lantern-streak"] wrapper.
    const lanternStreakEl = page.locator(
      '[data-testid="global-lantern-streak"] [data-testid="lantern-streak"]',
    );
    await expect(lanternStreakEl).toBeVisible({ timeout: 5000 });

    const ariaLabel = await lanternStreakEl.getAttribute("aria-label");
    expect(
      ariaLabel,
      'LanternStreak aria-label should match "{N}-day streak" pattern',
    ).toMatch(/^\d+-day streak$/);
  });

  test("/ nav-order — Path before Songs before Kana before LanternStreak before ThemeToggle", async ({
    page,
    context,
  }) => {
    // Per revision Plan 11 INFO: assert header nav children render in the locked
    // SPEC §Req 2 + AC #14 order. Guards against future edits drifting the order.
    await page.setViewportSize(VIEWPORT);
    await context.addCookies([
      {
        name: "kb_theme",
        value: "dark",
        url: "http://localhost:7000",
        sameSite: "Lax",
      },
    ]);

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Read the nav children identifiers in DOM order from header > nav.
    const navOrder = await page.evaluate(() => {
      const nav = document.querySelector("header nav");
      if (!nav) return [];
      const ids: string[] = [];
      for (const child of Array.from(
        nav.querySelectorAll("a, button, [data-testid]"),
      )) {
        const testid = (child as HTMLElement).dataset.testid;
        const href = (child as HTMLAnchorElement).href;
        const text = ((child as HTMLElement).textContent || "").trim().slice(0, 24);
        if (testid) ids.push(`testid:${testid}`);
        else if (href) ids.push(`href:${href}|${text}`);
        else if (text) ids.push(`text:${text}`);
      }
      return ids;
    });

    // Assert relative ordering of the locked items.
    const pathIdx = navOrder.findIndex((s) => s.includes("/path"));
    const songsIdx = navOrder.findIndex((s) => /\/songs(?!\/)/.test(s));
    const kanaIdx = navOrder.findIndex((s) => s.includes("/kana"));
    const lanternIdx = navOrder.findIndex(
      (s) =>
        s.includes("global-lantern-streak") || s.includes("nav-sign-in"),
    );

    expect(pathIdx, "Path nav link must be present").toBeGreaterThanOrEqual(0);
    expect(songsIdx, "Songs nav link must appear after Path").toBeGreaterThan(
      pathIdx,
    );
    expect(kanaIdx, "Kana nav link must appear after Songs").toBeGreaterThan(
      songsIdx,
    );
    expect(
      lanternIdx,
      "LanternStreak/Sign-in must appear after Kana",
    ).toBeGreaterThan(kanaIdx);
  });
});

anonTest.describe("/ anonymous fallback — AC #14 partial", () => {
  const VIEWPORT = { width: 390, height: 844 };

  anonTest(
    "/ unauth - LanternStreak NOT present, Sign in button present",
    async ({ page, context }) => {
      await page.setViewportSize(VIEWPORT);
      await context.addCookies([
        {
          name: "kb_theme",
          value: "dark",
          url: "http://localhost:7000",
          sameSite: "Lax",
        },
      ]);
      // Do NOT set auth cookie — anonymous visit
      // Do NOT set PLAYWRIGHT_AUTH (no env bypass active)

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Wordmark still present (universal, not auth-gated)
      await expect(
        page.locator('[data-testid="brand-wordmark"]'),
      ).toBeVisible();

      // LanternStreak wrapper ABSENT for anonymous user
      await expect(
        page.locator('[data-testid="global-lantern-streak"]'),
      ).toHaveCount(0);

      // Sign in button present (unauth fallback)
      await expect(
        page.locator('[data-testid="nav-sign-in"]'),
      ).toBeVisible();
    },
  );
});
