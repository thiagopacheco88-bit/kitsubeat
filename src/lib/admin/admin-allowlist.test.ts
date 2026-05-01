import { describe, it, expect } from "vitest";
import { parseAdminEmails, isAdminEmail } from "./admin-allowlist";

describe("parseAdminEmails", () => {
  it("returns empty Set on undefined", () => {
    expect(parseAdminEmails(undefined).size).toBe(0);
  });

  it("returns empty Set on empty string", () => {
    expect(parseAdminEmails("").size).toBe(0);
  });

  it("parses + lowercases two emails", () => {
    const s = parseAdminEmails("Alice@X.COM,bob@Y.com");
    expect(s.size).toBe(2);
    expect(s.has("alice@x.com")).toBe(true);
    expect(s.has("bob@y.com")).toBe(true);
  });

  it("trims whitespace and drops empty entries", () => {
    const s = parseAdminEmails(" a@x.com , b@y.com , ,  ");
    expect(s.size).toBe(2);
  });
});

describe("isAdminEmail", () => {
  const allow = parseAdminEmails("a@x.com,b@y.com");

  it("returns false for null", () => {
    expect(isAdminEmail(null, allow)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isAdminEmail(undefined, allow)).toBe(false);
  });

  it("matches case-insensitively", () => {
    expect(isAdminEmail("A@X.COM", allow)).toBe(true);
  });

  it("returns false for non-allowlisted email", () => {
    expect(isAdminEmail("c@z.com", allow)).toBe(false);
  });
});
