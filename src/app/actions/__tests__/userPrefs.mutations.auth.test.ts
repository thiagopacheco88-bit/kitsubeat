import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: null }),
}));

vi.mock("@/lib/db", () => ({ getDb: vi.fn() }));

describe("userPrefs mutations — auth guards (Phase 16 SC-2)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updateUserPrefs throws Unauthorized when not authenticated", async () => {
    const { updateUserPrefs } = await import("@/app/actions/userPrefs");
    await expect(updateUserPrefs({ theme: "dark" } as any)).rejects.toThrow("Unauthorized");
  });

  it("setThemePreference throws Unauthorized when not authenticated", async () => {
    const { setThemePreference } = await import("@/app/actions/userPrefs");
    await expect(setThemePreference("dark" as any)).rejects.toThrow("Unauthorized");
  });
});
