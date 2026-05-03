/**
 * Phase 14.1 AC #5 + AC #6 — axe-core accessibility, both themes.
 *
 * Dedicated /path axe-core spec (supplement to the existing a11y.spec.ts which
 * already covers /path in its 11-route x 2-theme matrix). This spec provides
 * a targeted, named test file for Plan 12 AC #5 (dark) + AC #6 (light) with
 * the Phase 14.1 minor-violation threshold (<=5).
 *
 * The existing a11y.spec.ts (Plan 14-09) only asserts zero serious/critical.
 * This spec also enforces: total minor + moderate violations <= 5, providing
 * a stricter gate for the /path surface specifically.
 *
 * NIGHTLY-ONLY gate: self-skips unless RUN_A11Y=1 (same as a11y.spec.ts).
 *   - Default run: skips entirely
 *   - Nightly / local a11y: RUN_A11Y=1 npx playwright test path-a11y.spec.ts
 *
 * Theme seeding: via kb_theme cookie (SSR round-trip, same as theme-toggle.spec.ts).
 *
 * Per SPEC Constraints: axe-core score >= 95 with zero serious/critical.
 * W-7 fix: page.tsx includes `<h1 className="sr-only">Your Learning Path</h1>`,
 * so the page-has-heading-one rule should pass.
 */
import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "../support/fixtures";

const THEMES = ["dark", "light"] as const;

test.describe("Phase 14.1 / /path axe-core a11y — both themes (AC #5 + AC #6)", () => {
  // Gate to nightly / explicit a11y runs — same pattern as a11y.spec.ts
  test.skip(
    !process.env.RUN_A11Y,
    "a11y suite gated to nightly only — set RUN_A11Y=1 to enable",
  );

  for (const theme of THEMES) {
    test(`/path (${theme}) — zero serious/critical violations + minor<=5 (AC #${theme === "dark" ? "5" : "6"})`, async ({
      page,
      context,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });

      // Seed kb_theme cookie before navigation for SSR theme application
      await context.addCookies([
        {
          name: "kb_theme",
          value: theme,
          url: "http://localhost:7000",
          sameSite: "Lax",
        },
      ]);

      await page.goto("/path");

      // Wait for hydration before axe scans (Pitfall 8 — same as a11y.spec.ts)
      await page.waitForLoadState("networkidle").catch(() => {});

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      // Serious and critical violations are blocking (no defer)
      const blocking = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );

      if (blocking.length > 0) {
        console.error(
          `Axe serious/critical violations on /path (${theme}):`,
          JSON.stringify(
            blocking.map((v) => ({
              id: v.id,
              impact: v.impact,
              help: v.help,
              nodes: v.nodes.length,
            })),
            null,
            2,
          ),
        );
      }
      expect(blocking, "Zero serious/critical violations required").toHaveLength(0);

      // Minor + moderate violations soft threshold (Phase 14.1 AC #5/#6)
      const minor = results.violations.filter(
        (v) => v.impact === "moderate" || v.impact === "minor",
      );

      if (minor.length > 0) {
        console.warn(
          `Axe moderate/minor violations on /path (${theme}):`,
          JSON.stringify(
            minor.map((v) => ({
              id: v.id,
              impact: v.impact,
              help: v.help,
              nodes: v.nodes.length,
            })),
            null,
            2,
          ),
        );
      }

      expect(
        minor.length,
        `Minor + moderate violations should be <= 5 on /path (${theme})`,
      ).toBeLessThanOrEqual(5);
    });
  }
});
