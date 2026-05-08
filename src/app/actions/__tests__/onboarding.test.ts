/**
 * src/app/actions/__tests__/onboarding.test.ts
 *
 * Phase 18: Unit test stubs for completeOnboarding() DOB validation.
 *
 * All tests are .todo — Wave 1 (18-02) fills in the implementation and
 * wires these stubs to the real completeOnboarding() server action.
 *
 * Mocks:
 *   - @clerk/nextjs/server — auth returns a stable test user ID
 *   - @/lib/db — db.insert mocked to avoid real DB writes
 *   - @/lib/legal/versions — CURRENT_TERMS_VERSION locked to test value
 */
import { describe, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: "test-user-123" }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      onConflictDoUpdate: vi.fn().mockResolvedValue({}),
    }),
  },
}));

vi.mock("@/lib/legal/versions", () => ({
  CURRENT_TERMS_VERSION: "1.0.0",
}));

describe("completeOnboarding() — DOB validation", () => {
  it.todo("returns error 'under_13' for DOB yielding age < 13");

  it.todo("returns {} and sets is_minor=true for age 15");

  it.todo("returns {} and sets is_minor=false for age 25");

  it.todo("applies social_activity_enabled=false atomically when is_minor=true");
});
