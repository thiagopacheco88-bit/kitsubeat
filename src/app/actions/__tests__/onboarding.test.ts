/**
 * src/app/actions/__tests__/onboarding.test.ts
 *
 * Phase 18 Wave 1 (18-02): Unit tests for completeOnboarding() DOB validation.
 *
 * Mocks:
 *   - @clerk/nextjs/server — auth returns a stable test user ID; clerkClient mocked
 *   - @/lib/db — db.insert chain mocked to avoid real DB writes
 *   - @/lib/legal/versions — CURRENT_TERMS_VERSION locked to test value
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- mock setup ---

const mockOnConflictDoUpdate = vi.fn().mockResolvedValue({});
const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

const mockUpdateUserMetadata = vi.fn().mockResolvedValue({});
const mockClerkInstance = {
  users: { updateUserMetadata: mockUpdateUserMetadata },
};

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: "test-user-123" }),
  clerkClient: vi.fn().mockResolvedValue(mockClerkInstance),
}));

vi.mock("@/lib/db", () => ({
  db: { insert: mockInsert },
}));

vi.mock("@/lib/db/schema", () => ({
  users: "users",
}));

vi.mock("@/lib/legal/versions", () => ({
  CURRENT_TERMS_VERSION: "1.0.0",
}));

// --- helpers ---

/** Builds an ISO date string for a user born N years ago (approximation). */
function dobYearsAgo(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

// --- tests ---

describe("completeOnboarding() — DOB validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
    mockOnConflictDoUpdate.mockResolvedValue({});
    mockUpdateUserMetadata.mockResolvedValue({});
  });

  it("returns error 'under_13' for DOB yielding age < 13", async () => {
    const { completeOnboarding } = await import("../onboarding");
    const result = await completeOnboarding(dobYearsAgo(10));

    expect(result).toEqual({ error: "under_13" });
    // Under-13 MUST NOT write to DB
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns {} and sets is_minor=true for age 15", async () => {
    const { completeOnboarding } = await import("../onboarding");
    const result = await completeOnboarding(dobYearsAgo(15));

    expect(result).toEqual({});
    expect(mockInsert).toHaveBeenCalledOnce();

    const valuesArg = mockValues.mock.calls[0][0] as Record<string, unknown>;
    expect(valuesArg.is_minor).toBe(true);
    expect(valuesArg.minor_defaults_applied).toBe(true);
  });

  it("returns {} and sets is_minor=false for age 25", async () => {
    const { completeOnboarding } = await import("../onboarding");
    const result = await completeOnboarding(dobYearsAgo(25));

    expect(result).toEqual({});
    expect(mockInsert).toHaveBeenCalledOnce();

    const valuesArg = mockValues.mock.calls[0][0] as Record<string, unknown>;
    expect(valuesArg.is_minor).toBe(false);
    expect(valuesArg.minor_defaults_applied).toBe(false);
  });

  it("applies social_activity_enabled=false atomically when is_minor=true", async () => {
    const { completeOnboarding } = await import("../onboarding");
    await completeOnboarding(dobYearsAgo(15));

    // Verify minor defaults are in the same VALUES call (not a separate UPDATE)
    const valuesArg = mockValues.mock.calls[0][0] as Record<string, unknown>;
    expect(valuesArg.social_activity_enabled).toBe(false);
    expect(valuesArg.marketing_email_opt_in).toBe(false);

    // Verify the same defaults appear in the onConflictDoUpdate SET
    const conflictArg = mockOnConflictDoUpdate.mock.calls[0][0] as {
      set: Record<string, unknown>;
    };
    expect(conflictArg.set.social_activity_enabled).toBe(false);
    expect(conflictArg.set.marketing_email_opt_in).toBe(false);
  });
});
