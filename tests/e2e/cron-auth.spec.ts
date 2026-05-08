// Phase 14.4 — cron route auth E2E tests (T-CRON-01)
import { test, expect } from "../support/fixtures";

test.describe("Phase 14.4 / cron route auth (T-CRON-01)", () => {
  test("GET /api/cron/daily-reminder returns 401 without Authorization header", async ({
    request,
  }) => {
    const res = await request.get("/api/cron/daily-reminder");
    expect(res.status()).toBe(401);
  });

  test("GET /api/cron/daily-reminder returns 200 + dry_run:true with valid secret and no RESEND key", async ({
    request,
  }) => {
    // In test env, CRON_SECRET is set but RESEND_API_KEY is not
    // This test requires CRON_SECRET to be set in test environment
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      test.skip();
      return;
    }
    const res = await request.get("/api/cron/daily-reminder", {
      headers: { Authorization: `Bearer ${secret}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.dry_run).toBe(true);
  });

  test("GET /api/cron/weekly-recap returns 401 without Authorization header", async ({
    request,
  }) => {
    const res = await request.get("/api/cron/weekly-recap");
    expect(res.status()).toBe(401);
  });

  test("GET /api/cron/weekly-recap returns 200 + dry_run:true with valid secret and no RESEND key", async ({
    request,
  }) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      test.skip();
      return;
    }
    const res = await request.get("/api/cron/weekly-recap", {
      headers: { Authorization: `Bearer ${secret}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.dry_run).toBe(true);
  });

  test("dry-run response body contains dry_run:true", async ({ request }) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      test.skip();
      return;
    }
    const res = await request.get("/api/cron/daily-reminder", {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const body = await res.json() as Record<string, unknown>;
    expect(body).toMatchObject({
      ok: true,
      kind: "daily_reminder",
      dry_run: true,
    });
  });
});
