import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/db/index", () => ({ db: {} }));
vi.mock("@/lib/posthog-server", () => ({ getPostHogServer: () => ({ capture: vi.fn() }) }));

describe("saveSessionResults — auth boundary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws Unauthorized when auth() returns null userId", async () => {
    const { auth } = await import("@clerk/nextjs/server");
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);
    const { saveSessionResults } = await import("../exercises");
    await expect(
      saveSessionResults({
        songVersionId: "test-song-version-id",
        answers: [],
        mode: "short",
        durationMs: 1000,
      } as any)
    ).rejects.toThrow("Unauthorized");
  });
});
