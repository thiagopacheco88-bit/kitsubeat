/**
 * Phase 14 / SPEC AC #18 — theme toggle SSR cookie round-trip.
 *
 * Real assertions land in Plan 14-03 (theme persistence + zero-flash + toggle UX).
 */
import { test, expect } from "../support/fixtures";

test.describe("Phase 14 / theme persistence (cookie round-trip)", () => {
  test("shell — verify spec is discoverable", async () => {
    expect(true).toBe(true);
  });

  test.fixme("dark cookie -> html[data-theme=dark]", async () => {});
  test.fixme("light cookie -> html[data-theme=light]", async () => {});
  test.fixme("system cookie + prefers-color-scheme: dark -> html[data-theme=dark]", async () => {});
  test.fixme("system cookie + prefers-color-scheme: light -> html[data-theme=light]", async () => {});
  test.fixme("no cookie + prefers-color-scheme: dark -> html[data-theme=dark]", async () => {});
  test.fixme("toggle button click cycles system -> light -> dark -> system", async () => {});
});
