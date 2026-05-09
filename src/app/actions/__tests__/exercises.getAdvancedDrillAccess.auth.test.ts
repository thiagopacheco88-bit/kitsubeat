import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/db/index", () => ({ db: {} }));

describe("getAdvancedDrillAccess - auth boundary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns degraded access when auth() returns null userId", async () => {
    const { auth } = await import("@clerk/nextjs/server");
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);
    const { getAdvancedDrillAccess } = await import("../exercises");
    // After Wave 2 fix: single-arg signature (songVersionId only — userId from auth())
    // Currently FAILS because function still requires userId as first positional arg.
    const result = await (getAdvancedDrillAccess as (songVersionId: string) => Promise<{
      listeningAllowed: boolean;
      advancedAllowed: boolean;
      isPremium: boolean;
    }>)("song-version-id");
    // Graceful degradation - unauthenticated callers get locked-down access, NOT a throw.
    expect(result.listeningAllowed).toBe(false);
    expect(result.advancedAllowed).toBe(false);
    expect(result.isPremium).toBe(false);
  });
});
