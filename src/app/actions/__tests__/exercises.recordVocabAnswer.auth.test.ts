import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/db/index", () => ({ db: {} }));

describe("recordVocabAnswer — auth boundary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws Unauthorized when auth() returns null userId", async () => {
    const { auth } = await import("@clerk/nextjs/server");
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);
    const { recordVocabAnswer } = await import("../exercises");
    await expect(
      recordVocabAnswer({
        vocabItemId: "550e8400-e29b-41d4-a716-446655440000",
        songVersionId: null,
        exerciseType: "vocab_meaning",
        correct: true,
        responseTimeMs: 500,
      } as any)
    ).rejects.toThrow("Unauthorized");
  });
});
