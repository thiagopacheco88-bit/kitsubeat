import { describe, it, expect, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: null }),
}));

describe("vocab-mastery route — auth guards (Phase 16 SC-2)", () => {
  it("GET returns 401 when not authenticated", async () => {
    const { GET } = await import("@/app/api/exercises/vocab-mastery/[vocabItemId]/route");
    const request = new Request("http://localhost/api/exercises/vocab-mastery/test-id");
    // @ts-ignore — params shape
    const response = await GET(request, { params: { vocabItemId: "test-id" } });
    // After Plan 03 fix: route derives userId from auth() and returns 401 if null.
    // Currently FAILS because route reads userId from ?userId= query param.
    expect(response.status).toBe(401);
  });
});
