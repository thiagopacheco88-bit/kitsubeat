/**
 * Phase 14 — __dev/states production gate test.
 *
 * Asserts: when NEXT_PUBLIC_APP_ENV === 'production', the route component throws notFound().
 * Real assertions land in Plan 14-04.
 */
import { describe, it, expect } from "vitest";

describe("__dev/states gate (Phase 14 wave 0 shell)", () => {
  it("shell — verify file is discoverable", () => {
    expect(true).toBe(true);
  });

  it.todo("throws notFound() when NEXT_PUBLIC_APP_ENV === 'production'");
  it.todo("renders catalog when NEXT_PUBLIC_APP_ENV is undefined (dev)");
  it.todo("renders catalog when NEXT_PUBLIC_APP_ENV === 'test'");
});
