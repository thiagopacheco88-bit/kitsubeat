// @vitest-environment node
/**
 * Phase 15 Plan 01 — Unit tests for trackGamification()
 *
 * Covers:
 * - Event shape passed to posthog.capture
 * - No-PII assertion (no email, name, username, password, stack in payload)
 * - userId threading to distinctId
 * - Anonymous fallback when no userId
 * - Non-fatal: analytics must never throw into caller
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock posthog-node (used internally by posthog-server.ts)
vi.mock("posthog-node", () => {
  const captureMock = vi.fn();
  const PostHog = vi.fn(() => ({ capture: captureMock }));
  return { PostHog };
});

// Mock posthog-server.ts to return a controlled mock
const mockCapture = vi.fn();
const mockGetPostHogServer = vi.fn(() => ({ capture: mockCapture }));

vi.mock("./posthog-server", () => ({
  getPostHogServer: mockGetPostHogServer,
}));

import { trackGamification } from "./analytics";

describe("trackGamification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-wire capture mock after clearAllMocks
    mockGetPostHogServer.mockReturnValue({ capture: mockCapture });
  });

  it("calls posthog.capture with event name and correct properties for xp_gained", () => {
    trackGamification({ event: "xp_gained", xp: 10, source: "session" });

    expect(mockCapture).toHaveBeenCalledTimes(1);
    const callArgs = mockCapture.mock.calls[0][0];
    expect(callArgs.event).toBe("xp_gained");
    expect(callArgs.properties).toMatchObject({ xp: 10, source: "session" });
  });

  it("does NOT include PII keys in event properties for level_up", () => {
    trackGamification({ event: "level_up", new_level: 5 });

    expect(mockCapture).toHaveBeenCalledTimes(1);
    const callArgs = mockCapture.mock.calls[0][0];
    const propKeys = Object.keys(callArgs.properties ?? {});
    const piiKeys = ["email", "name", "username", "password", "stack"];
    for (const key of piiKeys) {
      expect(propKeys).not.toContain(key);
    }
  });

  it("passes userId as distinctId when provided", () => {
    trackGamification(
      { event: "xp_gained", xp: 5, source: "answer" },
      "user_abc"
    );

    expect(mockCapture).toHaveBeenCalledTimes(1);
    const callArgs = mockCapture.mock.calls[0][0];
    expect(callArgs.distinctId).toBe("user_abc");
  });

  it("uses distinctId 'anonymous' when no userId provided", () => {
    trackGamification({ event: "xp_gained", xp: 5, source: "answer" });

    expect(mockCapture).toHaveBeenCalledTimes(1);
    const callArgs = mockCapture.mock.calls[0][0];
    expect(callArgs.distinctId).toBe("anonymous");
  });

  it("does not throw if getPostHogServer throws (non-fatal analytics)", () => {
    mockGetPostHogServer.mockImplementationOnce(() => {
      throw new Error("PostHog unavailable");
    });

    expect(() =>
      trackGamification({ event: "xp_gained", xp: 5, source: "answer" })
    ).not.toThrow();
  });
});
