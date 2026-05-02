/**
 * Phase 14 / SPEC AC #11 — mobile parity at 390x844 viewport.
 *
 * Asserts: no horizontal scroll on every in-scope route; tap targets >=44x44px.
 * Real assertions land in Plan 14-04+ (per-surface migrations) — this shell makes
 * the spec discoverable so executors can fill it in.
 */
import { test, expect } from "../support/fixtures";

test.use({ viewport: { width: 390, height: 844 } });

test.describe("Phase 14 / mobile parity (390x844)", () => {
  test("shell — verify spec is discoverable", async () => {
    expect(true).toBe(true);
  });

  // Wave 2+ fills these with the real per-route assertions (per RESEARCH §4 spec body):
  test.fixme("/ — no horizontal scroll", async () => {});
  test.fixme("/songs — no horizontal scroll", async () => {});
  test.fixme("/songs/again-yui — no horizontal scroll", async () => {});
  test.fixme("/anime-list — no horizontal scroll", async () => {});
  test.fixme("/kana — no horizontal scroll", async () => {});
  test.fixme("/kana/session — no horizontal scroll", async () => {});
  test.fixme("/kana/session/summary — no horizontal scroll", async () => {});
  test.fixme("/path — no horizontal scroll", async () => {});
  test.fixme("/vocabulary — no horizontal scroll", async () => {});
  test.fixme("/review — no horizontal scroll", async () => {});
  test.fixme("/profile — no horizontal scroll", async () => {});
  test.fixme("tap targets >=44x44 across all routes", async () => {});
});
