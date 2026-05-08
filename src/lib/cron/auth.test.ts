import { describe, it, expect, afterEach } from "vitest";
import { assertCronSecret } from "./auth";
import type { NextRequest } from "next/server";

function makeRequest(authHeader: string | null): NextRequest {
  const headers = new Headers();
  if (authHeader !== null) headers.set("authorization", authHeader);
  return { headers } as unknown as NextRequest;
}

describe("assertCronSecret", () => {
  const originalSecret = process.env.CRON_SECRET;

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalSecret;
    }
  });

  it("returns 401 Response when Authorization header missing", () => {
    process.env.CRON_SECRET = "test-secret-32chars";
    const result = assertCronSecret(makeRequest(null));
    expect(result?.status).toBe(401);
  });

  it("returns 401 Response when secret does not match", () => {
    process.env.CRON_SECRET = "test-secret-32chars";
    const result = assertCronSecret(makeRequest("Bearer wrong-secret"));
    expect(result?.status).toBe(401);
  });

  it("returns null when Authorization: Bearer {CRON_SECRET} matches", () => {
    process.env.CRON_SECRET = "test-secret-32chars";
    const result = assertCronSecret(makeRequest("Bearer test-secret-32chars"));
    expect(result).toBeNull();
  });

  it("returns 401 when CRON_SECRET env var is unset", () => {
    delete process.env.CRON_SECRET;
    const result = assertCronSecret(makeRequest("Bearer anything"));
    expect(result?.status).toBe(401);
  });
});
