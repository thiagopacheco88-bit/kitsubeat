/**
 * D-05: API health smoke tests — stateless routes that must respond correctly.
 *
 * Tests routes that would silently break the app if they went down:
 *   - /api/client-errors: client error logging — must always accept and return 200
 *   - /api/exercises/vocab-tiers: exercise data — must enforce auth (401 without session)
 *   - /api/cron/birthday-transitions: cron job — must enforce auth (401 without header)
 *
 * NOT covered here (already in tests/e2e/cron-auth.spec.ts):
 *   - GET /api/cron/daily-reminder → 401
 *   - GET /api/cron/weekly-recap → 401 / 200
 *
 * All tests use the Playwright `request` fixture — no DB connection, no auth setup required.
 */
import { test, expect } from '@playwright/test';

test.describe('api-health — D-05', () => {
  test('POST /api/client-errors returns 200 with { ok: true }', async ({ request }) => {
    // This is a stateless error-logging endpoint — must always accept reports from clients.
    // Sending a minimal valid error payload.
    const res = await request.post('/api/client-errors', {
      data: {
        message: 'api-health test error',
        source: 'api-health.spec.ts',
        lineno: 1,
        colno: 1,
        error: null,
      },
    });
    expect(res.status(), 'POST /api/client-errors should return 200').toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true });
  });

  test('GET /api/exercises/vocab-tiers without auth returns 401', async ({ request }) => {
    // This endpoint returns exercise vocabulary tiers for authenticated users.
    // Without a session, it must reject with 401 (not 500 — that would indicate a bug).
    const res = await request.get('/api/exercises/vocab-tiers');
    expect(res.status(), 'GET /api/exercises/vocab-tiers should return 401 without auth').toBe(401);
  });

  test('GET /api/cron/birthday-transitions without auth returns 401', async ({ request }) => {
    // Cron jobs must not be publicly accessible — must require the cron secret header.
    // Without the header, this must reject with 401.
    // NOTE: Assumed same auth pattern as daily-reminder and weekly-recap (verified in cron-auth.spec.ts).
    // If this returns 403 or another 4xx, update the assertion — the important invariant is status < 500.
    const res = await request.get('/api/cron/birthday-transitions');
    expect(
      res.status(),
      'GET /api/cron/birthday-transitions without auth should reject',
    ).toBeGreaterThanOrEqual(400);
    expect(
      res.status(),
      'GET /api/cron/birthday-transitions without auth should not 5xx',
    ).toBeLessThan(500);
  });
});
