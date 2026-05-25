/**
 * Phase 14 / SPEC AC #18 — theme toggle SSR cookie round-trip.
 *
 * Verifies the four (cookie × prefers-color-scheme) corners + the optimistic
 * toggle behavior + cookie roundtrip after reload. Plan 14-03 fills this in.
 *
 * Requires the dev server on http://localhost:7000 (Playwright config baseURL).
 */
import { test, expect } from "../support/fixtures";

test.describe("Phase 14 / theme persistence (cookie round-trip)", () => {
  test("dark cookie -> html[data-theme=dark]", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "kb_theme",
        value: "dark",
        url: "http://localhost:7000",
        sameSite: "Lax",
      },
    ]);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
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
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
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
      await p.goto("/");
      await expect(p.locator("html")).toHaveAttribute("data-theme", "dark");
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
      await p.goto("/");
      await expect(p.locator("html")).toHaveAttribute("data-theme", "dark");
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
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    // Wait for ThemeToggle's useEffect to read the cookie + sync pref state.
    // The aria-label encodes pref ("Theme: light. Click to change.") so this
    // also asserts the component finished hydrating before we click.
    await expect(
      page.getByRole("button", { name: /^Theme: light/ })
    ).toBeVisible();

    // Click the ThemeToggle (aria-label starts with "Theme: light")
    await page.getByRole("button", { name: /^Theme: light/ }).click();

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
