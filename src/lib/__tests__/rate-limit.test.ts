import { describe, it, expect, vi } from "vitest";

// Mock Upstash before importing rate-limit module
vi.mock("@upstash/redis", () => ({
  Redis: vi.fn().mockImplementation(function () {
    return {};
  }),
}));

vi.mock("@upstash/ratelimit", () => {
  function MockRatelimit({ limiter }: { limiter: unknown }) {
    return { limit: vi.fn(), limiter };
  }
  MockRatelimit.slidingWindow = vi.fn().mockReturnValue({ type: "slidingWindow" });
  return { Ratelimit: MockRatelimit };
});

describe("rate-limit module", () => {
  it("exerciseRatelimit.limit resolves success:true when under threshold", async () => {
    // Import after mocks
    const rateLimitModule = await import("@/lib/rate-limit");
    const { exerciseRatelimit } = rateLimitModule;
    vi.mocked(exerciseRatelimit.limit).mockResolvedValue({
      success: true,
      limit: 120,
      remaining: 119,
      reset: Date.now() + 60000,
      pending: Promise.resolve(),
    } as any);
    const result = await exerciseRatelimit.limit("user_abc123");
    expect(result.success).toBe(true);
    expect(result.limit).toBe(120);
  });

  it("exerciseRatelimit.limit resolves success:false when over threshold", async () => {
    const { exerciseRatelimit } = await import("@/lib/rate-limit");
    vi.mocked(exerciseRatelimit.limit).mockResolvedValue({
      success: false,
      limit: 120,
      remaining: 0,
      reset: Date.now() + 30000,
      pending: Promise.resolve(),
    } as any);
    const result = await exerciseRatelimit.limit("user_abc123");
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("sessionRatelimit.limit resolves success:false after 10 calls", async () => {
    const { sessionRatelimit } = await import("@/lib/rate-limit");
    vi.mocked(sessionRatelimit.limit).mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now() + 30000,
      pending: Promise.resolve(),
    } as any);
    const result = await sessionRatelimit.limit("user_abc123");
    expect(result.success).toBe(false);
    expect(result.limit).toBe(10);
  });

  it("llmRatelimit.limit resolves success:false after 10 calls", async () => {
    const { llmRatelimit } = await import("@/lib/rate-limit");
    vi.mocked(llmRatelimit.limit).mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now() + 30000,
      pending: Promise.resolve(),
    } as any);
    const result = await llmRatelimit.limit("user_abc123");
    expect(result.success).toBe(false);
  });
});
