/**
 * src/app/actions/__tests__/consent.test.ts
 *
 * Phase 18 Wave 1 (18-02): Unit tests for recordConsent() server action.
 *
 * Mocks:
 *   - @clerk/nextjs/server — auth returns a stable test user ID
 *   - @/lib/db — db.insert mocked to avoid real DB writes
 *   - next/headers — headers() and cookies() mocked for SSR environment
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- mock setup ---

const mockSet = vi.fn().mockResolvedValue(undefined);
const mockCookies = vi.fn().mockResolvedValue({ set: mockSet });
const mockValues = vi.fn().mockResolvedValue({});
const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: "test-user-123" }),
}));

vi.mock("@/lib/db", () => ({
  db: { insert: mockInsert },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(
    new Map([
      ["x-forwarded-for", "203.0.113.45"],
      ["user-agent", "TestAgent/1.0"],
    ] as [string, string][])
  ),
  cookies: mockCookies,
}));

vi.mock("@/lib/db/schema", () => ({
  cookieConsentRecord: "cookieConsentRecord",
}));

vi.mock("@/lib/legal/versions", () => ({
  CURRENT_COOKIE_CONSENT_VERSION: "1.0",
}));

// --- tests ---

describe("recordConsent() — cookie consent server action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockResolvedValue({});
    mockCookies.mockResolvedValue({ set: mockSet });
  });

  it("inserts cookie_consent_record row with hashed IP on Accept", async () => {
    const { recordConsent } = await import("../consent");
    await recordConsent("granted");

    expect(mockInsert).toHaveBeenCalledOnce();
    expect(mockValues).toHaveBeenCalledOnce();

    const insertArg = mockValues.mock.calls[0][0] as Record<string, unknown>;

    // user_id from mock auth
    expect(insertArg.user_id).toBe("test-user-123");
    expect(insertArg.decision).toBe("granted");
    expect(insertArg.consent_version).toBe("1.0");

    // REQ-PRIV-COOKIE-05: ip_hash must be a 64-char hex string (SHA-256), NOT raw IP
    expect(typeof insertArg.ip_hash).toBe("string");
    expect(insertArg.ip_hash).toHaveLength(64);
    expect(insertArg.ip_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(insertArg.ip_hash).not.toBe("203.0.113.45");

    // categories: analytics=true for granted
    const categories = insertArg.categories as { essential: boolean; analytics: boolean };
    expect(categories.essential).toBe(true);
    expect(categories.analytics).toBe(true);
  });

  it("inserts cookie_consent_record row with decision=rejected on Reject", async () => {
    const { recordConsent } = await import("../consent");
    await recordConsent("rejected");

    const insertArg = mockValues.mock.calls[0][0] as Record<string, unknown>;
    expect(insertArg.decision).toBe("rejected");

    // categories: analytics=false for rejected
    const categories = insertArg.categories as { essential: boolean; analytics: boolean };
    expect(categories.essential).toBe(true);
    expect(categories.analytics).toBe(false);
  });

  it("sets kb_consent cookie with correct attributes", async () => {
    const { recordConsent } = await import("../consent");
    await recordConsent("granted");

    expect(mockSet).toHaveBeenCalledOnce();
    const [name, value, options] = mockSet.mock.calls[0] as [string, string, Record<string, unknown>];

    expect(name).toBe("kb_consent");
    expect(value).toBe("granted");
    expect(options.sameSite).toBe("lax");
    expect(options.httpOnly).toBe(false);
    expect(options.path).toBe("/");
    expect(options.maxAge).toBe(31536000); // 1 year in seconds
  });
});
