/**
 * Phase 14.2 SPEC AC #5 - axe-core a11y scan of / in 4 configurations:
 *   (auth, dark) (auth, light) (anon, dark) (anon, light)
 *
 * Blocking threshold: zero serious|critical WCAG violations.
 */
import AxeBuilder from "@axe-core/playwright";
import { test as anonTest, type BrowserContext, type Page } from "@playwright/test";
import { authenticatedTest, expect } from "../support/auth-fixtures";

interface Config {
  name: string;
  theme: "dark" | "light";
  authenticated: boolean;
}

const CONFIGS: Config[] = [
  { name: "auth + dark", theme: "dark", authenticated: true },
  { name: "auth + light", theme: "light", authenticated: true },
  { name: "anon + dark", theme: "dark", authenticated: false },
  { name: "anon + light", theme: "light", authenticated: false },
];

async function runAxeScan(
  page: Page,
  context: BrowserContext,
  config: Config,
) {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.addCookies([
    {
      name: "kb_theme",
      value: config.theme,
      url: "http://localhost:7000",
      sameSite: "Lax",
    },
  ]);

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const blocking = result.violations.filter(
    (violation) =>
      violation.impact === "serious" || violation.impact === "critical",
  );

  if (blocking.length > 0) {
    console.log(
      `[axe ${config.name}] BLOCKING violations:`,
      JSON.stringify(
        blocking.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          description: violation.description,
          nodes: violation.nodes.length,
        })),
        null,
        2,
      ),
    );
  }

  expect(blocking).toHaveLength(0);
}

authenticatedTest.describe("/ axe-core a11y (auth contexts) (AC #5)", () => {
  for (const config of CONFIGS.filter((item) => item.authenticated)) {
    authenticatedTest(
      `${config.name} - zero serious|critical violations`,
      async ({ page, context }) => {
        await runAxeScan(page, context, config);
      },
    );
  }
});

anonTest.describe("/ axe-core a11y (anon contexts) (AC #5)", () => {
  for (const config of CONFIGS.filter((item) => !item.authenticated)) {
    anonTest(
      `${config.name} - zero serious|critical violations`,
      async ({ page, context }) => {
        await runAxeScan(page, context, config);
      },
    );
  }
});
