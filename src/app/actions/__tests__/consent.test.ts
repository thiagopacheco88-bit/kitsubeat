/**
 * src/app/actions/__tests__/consent.test.ts
 *
 * Phase 18: Unit test stubs for recordConsent() server action.
 *
 * All tests are .todo — Wave 1 (18-02) fills in the implementation and
 * wires these stubs to the real recordConsent() server action.
 *
 * Mocks:
 *   - @clerk/nextjs/server — auth returns a stable test user ID
 *   - @/lib/db — db.insert mocked to avoid real DB writes
 *   - next/headers — cookies() mocked for SSR environment
 */
import { describe, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: "test-user-123" }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue({}),
    }),
  },
}));

vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ set: vi.fn() }),
}));

describe("recordConsent() — cookie consent server action", () => {
  it.todo("inserts cookie_consent_record row with hashed IP on Accept");

  it.todo("inserts cookie_consent_record row with decision=rejected on Reject");

  it.todo("sets kb_consent cookie with correct attributes");
});
