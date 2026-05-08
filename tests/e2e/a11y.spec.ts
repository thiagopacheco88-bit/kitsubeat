/**
 * Phase 14 / SPEC AC #13 — axe-core accessibility, both themes.
 *
 * NIGHTLY-ONLY (per planner correction 6 + RESEARCH Open Question #3):
 * 22 routes x 2 themes ~= 60-110 seconds. Self-gated via RUN_A11Y env var.
 * - PR-checks: `playwright test` runs WITHOUT RUN_A11Y → entire describe self-skips.
 * - Nightly: `RUN_A11Y=1 playwright test a11y.spec.ts` (set in qa-suite.yml schedule job).
 * - Local: `npm run test:e2e:a11y` (script sets RUN_A11Y=1 and targets a11y.spec.ts).
 *
 * Plan 14-09 Task 2 — filled in the 22-case matrix (11 routes x 2 themes)
 * per RESEARCH §5 lines 808-862. The seeded slug for /songs/[slug] is
 * `again-yui` (Phase 08.1 corpus, used by iframe-defer + mobile-parity
 * specs). Each test sets the kb_theme cookie BEFORE navigating, waits for
 * networkidle (Pitfall 8 — hydration must complete before axe scans), then
 * filters to serious | critical impact and asserts toHaveLength(0).
 *
 * Per SPEC req 8 acceptance: BOTH `serious` AND `critical` are blocking
 * (no defer-to-Phase-18 escape clause per planner correction WARNING 2).
 */
import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "../support/fixtures";

const ROUTES = [
  "/",
  "/songs",
  "/anime-list",
  "/songs/again-yui",
  "/kana",
  "/kana/session",
  "/kana/session/summary",
  "/path",
  "/vocabulary",
  "/review",
  "/profile",
  // Phase 18: Legal & Compliance routes (audited from Wave 5 onward)
  "/legal/terms",
  "/legal/privacy",
  "/legal/cookie-policy",
  "/legal/ai-transparency",
  "/legal/refund",
  "/onboarding/age-gate",
];
const THEMES = ["dark", "light"] as const;

test.describe("Phase 14 / a11y (axe-core, both themes)", () => {
  // PRESERVE this self-skip from Plan 14-00 — gates the entire suite to
  // nightly only (per Plan 14-04 RUN_A11Y env-var pattern).
  test.skip(!process.env.RUN_A11Y, "a11y suite gated to nightly only — set RUN_A11Y=1 to enable");

  for (const theme of THEMES) {
    for (const route of ROUTES) {
      test(`${route} (${theme}) — zero serious/critical axe violations`, async ({ page, context }) => {
        // Seed the kb_theme cookie BEFORE navigating so the SSR layout reads
        // it and sets data-theme on <html> server-side (zero-flash per
        // CONTEXT D-09). Cookie is SameSite=Lax, NOT HttpOnly, so client can
        // read it for instant toggle (matches the production cookie shape
        // from src/components/ui/ThemeToggle.tsx + src/app/layout.tsx).
        await context.addCookies([
          {
            name: "kb_theme",
            value: theme,
            url: "http://localhost:7000",
            sameSite: "Lax",
          },
        ]);

        await page.goto(route);

        // Pitfall 8 (RESEARCH §5) — wait for hydration before axe scans.
        // networkidle gives React a chance to mount client components that
        // own focus management + ARIA attributes. Caught by .catch() so the
        // test doesn't fail on routes with persistent connections (e.g. the
        // YouTube iframe on /songs/[slug]).
        await page.waitForLoadState("networkidle").catch(() => {});

        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();

        const blocking = results.violations.filter(
          (v) => v.impact === "serious" || v.impact === "critical",
        );

        if (blocking.length > 0) {
          // Log violations with id/impact/help/node-count for triage.
          // Per WARNING 2: BOTH serious AND critical block — no defer.
          // Failures must be either fixed or escalated to user with explicit
          // approval recorded in 14-A11Y-VIOLATIONS.md.
          console.error(
            `Axe violations on ${route} (${theme}):`,
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
        expect(blocking).toHaveLength(0);
      });
    }
  }
});
