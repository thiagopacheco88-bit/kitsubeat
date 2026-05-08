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

// Mock posthog-node — PostHog must be mockable as a constructor (use vi.fn as class)
vi.mock("posthog-node", () => {
  const PostHog = vi.fn(function (this: Record<string, unknown>) {
    this.capture = vi.fn();
  });
  return { PostHog };
});

describe("getPostHogServer", () => {
  const ORIGINAL_TOKEN = process.env.NEXT_PUBLIC_POSTHOG_TOKEN;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules(); // reset module registry so singleton _client is reset per test
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
  });

  it("calling getPostHogServer() twice returns the same instance (singleton)", async () => {
    const { getPostHogServer } = await import("./posthog-server");
    const first = getPostHogServer();
    const second = getPostHogServer();
    expect(first).toBe(second);
  });

  it("PostHog constructor called with flushAt:1 and flushInterval:0", async () => {
    const { PostHog } = await import("posthog-node");
    const PostHogMock = vi.mocked(PostHog as unknown as ReturnType<typeof vi.fn>);
    const { getPostHogServer } = await import("./posthog-server");
    getPostHogServer();
    expect(PostHogMock).toHaveBeenCalledTimes(1);
    const [, options] = PostHogMock.mock.calls[0];
    expect(options).toMatchObject({ flushAt: 1, flushInterval: 0 });
  });

  it("throws if NEXT_PUBLIC_POSTHOG_TOKEN is not set", async () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_TOKEN;
    const { getPostHogServer } = await import("./posthog-server");
    expect(() => getPostHogServer()).toThrow("NEXT_PUBLIC_POSTHOG_TOKEN");
  });
});
