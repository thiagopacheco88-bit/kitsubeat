/**
 * Phase 14 / SPEC AC #18 — theme toggle SSR cookie round-trip.
 *
 * Verifies the four (cookie × prefers-color-scheme) corners + the optimistic
 * toggle behavior + cookie roundtrip after reload. Plan 14-03 fills this in.
 *
 * Requires the dev server on http://localhost:7000 (Playwright config baseURL).
 *
 * waitUntil: "commit" — fires as soon as navigation response headers arrive.
 * Next.js dev streaming SSR keeps the HTML stream open for 30s+ (Suspense), so
 * "domcontentloaded" reliably times out. The inline <script> that sets data-theme
 * from the cookie runs in the <head> — it fires well before DOMContentLoaded, so
 * we just need the initial HTML bytes to arrive (which "commit" guarantees).
 */
import { test, expect } from "../support/fixtures";

test.describe("Phase 14 / theme persistence (cookie round-trip)", () => {
  // /songs page cold Neon DB start + Next.js dev streaming + React hydration.
  // New-context tests need up to 60s for initial HTML; optimistic test needs
  // up to 90s for ThemeToggle useEffect hydration in dev mode after many prior tests.
  test.setTimeout(180_000);
  test("dark cookie -> html[data-theme=dark]", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "kb_theme",
        value: "dark",
        url: "http://localhost:7000",
        sameSite: "Lax",
      },
    ]);
    // Use /songs (simpler page) — ThemeToggle is in the shared layout; home page
    // has sequential DB ticker queries that push load time well past 30s.
    await page.goto("/songs", { waitUntil: "commit" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark", {
      timeout: 30_000,
    });
  });

  test("light cookie -> html[data-theme=light]", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "kb_theme",
        value: "light",
        url: "http://localhost:7000",
        sameSite: "Lax",
      },
    ]);
    // Use /songs (simpler page) — ThemeToggle is in the shared layout; home page
    // has sequential DB ticker queries that push load time well past 30s.
    await page.goto("/songs", { waitUntil: "commit" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light", {
      timeout: 30_000,
    });
  });

  test("system cookie + prefers-color-scheme: dark -> html[data-theme=dark]", async ({
    browser,
  }) => {
    const ctx = await browser.newContext({ colorScheme: "dark" });
    try {
      await ctx.addCookies([
        {
          name: "kb_theme",
          value: "system",
          url: "http://localhost:7000",
          sameSite: "Lax",
        },
      ]);
      const p = await ctx.newPage();
      // /songs is simpler (no home-page ticker DB queries); ThemeToggle is in the shared layout.
      await p.goto("/songs", { waitUntil: "commit" });
      // New context has no cached JS bundles; server may take 60s to stream initial HTML.
      await expect(p.locator("html")).toHaveAttribute("data-theme", "dark", {
        timeout: 60_000,
      });
    } finally {
      await ctx.close();
    }
  });

  test("no cookie + prefers-color-scheme: dark -> html[data-theme=dark]", async ({
    browser,
  }) => {
    const ctx = await browser.newContext({ colorScheme: "dark" });
    try {
      const p = await ctx.newPage();
      // /songs is simpler (no home-page ticker DB queries); ThemeToggle is in the shared layout.
      await p.goto("/songs", { waitUntil: "commit" });
      // New context has no cached JS bundles; server may take 60s to stream initial HTML.
      await expect(p.locator("html")).toHaveAttribute("data-theme", "dark", {
        timeout: 60_000,
      });
    } finally {
      await ctx.close();
    }
  });

  test("toggle button click changes data-theme within 500ms (optimistic)", async ({
    page,
    context,
  }) => {
    // Seed kb_theme=light so the cycle (system → light → dark) lands on dark
    // unambiguously regardless of OS prefers-color-scheme — pref starts at
    // 'light', next click goes to 'dark', resolved data-theme is 'dark'.
    await context.addCookies([
      {
        name: "kb_theme",
        value: "light",
        url: "http://localhost:7000",
        sameSite: "Lax",
      },
    ]);
    // Use /songs (simpler page) — ThemeToggle is in the shared layout; home page
    // has sequential DB ticker queries that push load time well past 30s.
    await page.goto("/songs", { waitUntil: "commit" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light", {
      timeout: 30_000,
    });

    // Wait for ThemeToggle's useEffect to read the cookie + sync pref state.
    // The aria-label encodes pref ("Theme: light. Click to change.") so this
    // also asserts the component finished hydrating before we click.
    // ThemeToggle is SSR-rendered with aria-label "Theme: dark" (initial state).
    // After React hydration + useEffect, the label changes to "Theme: light".
    // Step 1: wait for any ThemeToggle button to be visible (fast — SSR rendered).
    const themeBtn = page.locator('button[aria-label^="Theme:"]');
    await expect(themeBtn).toBeVisible({ timeout: 30_000 });
    // Step 2: wait for useEffect to read cookie and flip label to "light".
    // In dev mode after many prior tests, hydration can take 60–90s.
    await expect(themeBtn).toHaveAttribute("aria-label", /^Theme: light/, {
      timeout: 90_000,
    });

    // Click the ThemeToggle (aria-label starts with "Theme: light")
    await themeBtn.click();

    // Optimistic: data-theme should flip to 'dark' fast (without waiting for
    // the server action's network round-trip).
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark", {
      timeout: 500,
    });

    // Persistence: theme must NOT revert after the server action responds.
    // Previously, setThemePreference threw "Unauthorized" for unauthenticated
    // users, causing the catch block to call applyOptimistic(prev) and snap back.
    await page.waitForTimeout(3000);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});
