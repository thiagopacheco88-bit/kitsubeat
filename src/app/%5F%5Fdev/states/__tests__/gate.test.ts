/**
 * Phase 14 Plan 14-04 — __dev/states production gate test.
 *
 * Asserts the route component:
 *  1. Throws notFound() when NEXT_PUBLIC_APP_ENV === 'production'
 *  2. Renders catalog when NEXT_PUBLIC_APP_ENV is undefined (dev)
 *  3. Renders catalog when NEXT_PUBLIC_APP_ENV === 'test' (matches playwright.config.ts:64)
 *
 * Mock notFound() because real next/navigation throws an internal NEXT_NOT_FOUND
 * digest that vitest cannot observe; mock EmptyState/Skeleton so this remains
 * a unit test of the gate logic, not a render-tree integration.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const notFoundMock = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next/navigation", () => ({ notFound: notFoundMock }));
vi.mock("@/components/ui/EmptyState", () => ({ EmptyState: () => null }));
vi.mock("@/components/ui/Skeleton", () => ({ Skeleton: () => null }));

describe("__dev/states gate (Phase 14 Plan 14-04)", () => {
  const original = process.env.NEXT_PUBLIC_APP_ENV;

  beforeEach(() => {
    notFoundMock.mockClear();
    vi.resetModules();
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_APP_ENV;
    } else {
      process.env.NEXT_PUBLIC_APP_ENV = original;
    }
  });

  it("throws notFound() when NEXT_PUBLIC_APP_ENV === 'production'", async () => {
    process.env.NEXT_PUBLIC_APP_ENV = "production";
    const { default: Page } = await import("../page");
    expect(() => Page()).toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledOnce();
  });

  it("renders catalog when NEXT_PUBLIC_APP_ENV is undefined (dev)", async () => {
    delete process.env.NEXT_PUBLIC_APP_ENV;
    const { default: Page } = await import("../page");
    const result = Page();
    expect(result).toBeTruthy();
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("renders catalog when NEXT_PUBLIC_APP_ENV === 'test'", async () => {
    process.env.NEXT_PUBLIC_APP_ENV = "test";
    const { default: Page } = await import("../page");
    const result = Page();
    expect(result).toBeTruthy();
    expect(notFoundMock).not.toHaveBeenCalled();
  });
});
