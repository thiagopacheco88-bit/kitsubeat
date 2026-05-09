import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: null }),
}));

vi.mock("@/lib/db", () => ({ getDb: vi.fn() }));

describe("userPrefs mutations — auth guards (Phase 16 SC-2)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updateUserPrefs throws Unauthorized when not authenticated", async () => {
    const { updateUserPrefs } = await import("@/app/actions/userPrefs");
    // After Plan 03 fix: updateUserPrefs derives userId from auth() and throws Unauthorized if null.
    // Currently FAILS because function uses caller-supplied userId param.
    await expect(updateUserPrefs({ theme: "dark" } as any)).rejects.toThrow("Unauthorized");
  });

  it("setThemePreference throws Unauthorized when not authenticated", async () => {
    const { setThemePreference } = await import("@/app/actions/userPrefs");
    // After Plan 03 fix: setThemePreference derives userId from auth() and throws Unauthorized if null.
    // Currently FAILS because function uses caller-supplied userId param.
    await expect(setThemePreference("dark" as any)).rejects.toThrow("Unauthorized");
  });
});
