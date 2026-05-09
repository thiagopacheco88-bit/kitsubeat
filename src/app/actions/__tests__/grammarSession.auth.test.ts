import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/db/index", () => ({ db: {} }));
vi.mock("@/lib/exercises/grammar-ai", () => ({
  generateOneGrammarExercise: vi.fn(),
}));

describe("grammarSession - auth boundary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws Unauthorized before LLM call when auth() returns null userId", async () => {
    const { auth } = await import("@clerk/nextjs/server");
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);
    // startGrammarSession is the exported function that calls generateOneGrammarExercise
    const { startGrammarSession } = await import("../grammarSession");
    // After Wave 2 fix: startGrammarSession derives userId from auth() and throws Unauthorized if null.
    // Currently FAILS because function uses caller-supplied userId param.
    await expect(
      startGrammarSession("test-song-version-id")
    ).rejects.toThrow("Unauthorized");
  });
});
