// @vitest-environment node
/**
 * Phase 15 Plan 01 — Unit tests for getPostHogServer()
 *
 * Covers:
 * - Returns a PostHog instance
 * - Calling twice returns the same instance (singleton)
 * - PostHog constructor called with flushAt:1 and flushInterval:0
 * - Throws if NEXT_PUBLIC_POSTHOG_TOKEN is not set
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock posthog-node — capture the constructor spy
const captureInstanceMock = { capture: vi.fn() };
const PostHogConstructorSpy = vi.fn(() => captureInstanceMock);

vi.mock("posthog-node", () => ({
  PostHog: PostHogConstructorSpy,
}));

describe("getPostHogServer", () => {
  const ORIGINAL_TOKEN = process.env.NEXT_PUBLIC_POSTHOG_TOKEN;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules(); // reset module registry so singleton is reset per test
    process.env.NEXT_PUBLIC_POSTHOG_TOKEN = "test-ph-token";
  });

  afterEach(() => {
    if (ORIGINAL_TOKEN === undefined) {
      delete process.env.NEXT_PUBLIC_POSTHOG_TOKEN;
    } else {
      process.env.NEXT_PUBLIC_POSTHOG_TOKEN = ORIGINAL_TOKEN;
    }
  });

  it("returns a PostHog instance", async () => {
    const { getPostHogServer } = await import("./posthog-server");
    const client = getPostHogServer();
    expect(client).toBeDefined();
    expect(PostHogConstructorSpy).toHaveBeenCalledTimes(1);
  });

  it("calling getPostHogServer() twice returns the same instance (singleton)", async () => {
    const { getPostHogServer } = await import("./posthog-server");
    const first = getPostHogServer();
    const second = getPostHogServer();
    expect(first).toBe(second);
    expect(PostHogConstructorSpy).toHaveBeenCalledTimes(1);
  });

  it("PostHog constructor called with flushAt:1 and flushInterval:0", async () => {
    const { getPostHogServer } = await import("./posthog-server");
    getPostHogServer();
    expect(PostHogConstructorSpy).toHaveBeenCalledTimes(1);
    const [, options] = PostHogConstructorSpy.mock.calls[0];
    expect(options).toMatchObject({ flushAt: 1, flushInterval: 0 });
  });

  it("throws if NEXT_PUBLIC_POSTHOG_TOKEN is not set", async () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_TOKEN;
    const { getPostHogServer } = await import("./posthog-server");
    expect(() => getPostHogServer()).toThrow("NEXT_PUBLIC_POSTHOG_TOKEN");
  });
});
