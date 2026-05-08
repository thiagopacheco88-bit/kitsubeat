// Phase 14.4 — email_sent_log idempotency tests
import { describe, it, expect, beforeEach } from "vitest";
import { sql } from "drizzle-orm";

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;

describeIfTestDb("email_sent_log idempotency", () => {
  const TEST_USER_ID = "test_idempotency_user";

  beforeEach(async () => {
    const { getTestDb } = await import("../support/test-db");
    const db = getTestDb();
    await db.execute(
      sql`DELETE FROM email_sent_log WHERE user_id = ${TEST_USER_ID}`
    );
    await db.execute(
      sql`INSERT INTO users (id) VALUES (${TEST_USER_ID}) ON CONFLICT (id) DO NOTHING`
    );
  });

  it("first daily_reminder insert succeeds", async () => {
    const { getTestDb } = await import("../support/test-db");
    const db = getTestDb();
    await db.execute(sql`
      INSERT INTO email_sent_log (user_id, kind, period_key)
      VALUES (${TEST_USER_ID}, 'daily_reminder', '2026-05-08')
    `);
    const rows = await db.execute(
      sql`SELECT * FROM email_sent_log WHERE user_id = ${TEST_USER_ID}`
    );
    const rawRows = Array.isArray(rows)
      ? rows
      : ((rows as { rows?: unknown[] }).rows ?? []);
    expect(rawRows.length).toBe(1);
  });

  it("daily_reminder: second run same day (same period_key) skips send (ON CONFLICT is no-op)", async () => {
    const { getTestDb } = await import("../support/test-db");
    const db = getTestDb();
    await db.execute(sql`
      INSERT INTO email_sent_log (user_id, kind, period_key)
      VALUES (${TEST_USER_ID}, 'daily_reminder', '2026-05-08')
      ON CONFLICT DO NOTHING
    `);
    await db.execute(sql`
      INSERT INTO email_sent_log (user_id, kind, period_key)
      VALUES (${TEST_USER_ID}, 'daily_reminder', '2026-05-08')
      ON CONFLICT DO NOTHING
    `);
    const rows = await db.execute(
      sql`SELECT * FROM email_sent_log WHERE user_id = ${TEST_USER_ID}`
    );
    const rawRows = Array.isArray(rows)
      ? rows
      : ((rows as { rows?: unknown[] }).rows ?? []);
    expect(rawRows.length).toBe(1);
  });

  it("daily_reminder: different day (different period_key) sends again", async () => {
    const { getTestDb } = await import("../support/test-db");
    const db = getTestDb();
    await db.execute(
      sql`INSERT INTO email_sent_log (user_id, kind, period_key) VALUES (${TEST_USER_ID}, 'daily_reminder', '2026-05-07') ON CONFLICT DO NOTHING`
    );
    await db.execute(
      sql`INSERT INTO email_sent_log (user_id, kind, period_key) VALUES (${TEST_USER_ID}, 'daily_reminder', '2026-05-08') ON CONFLICT DO NOTHING`
    );
    const rows = await db.execute(
      sql`SELECT * FROM email_sent_log WHERE user_id = ${TEST_USER_ID}`
    );
    const rawRows = Array.isArray(rows)
      ? rows
      : ((rows as { rows?: unknown[] }).rows ?? []);
    expect(rawRows.length).toBe(2);
  });

  it("weekly_recap: second run same ISO week skips send (ON CONFLICT is no-op)", async () => {
    const { getTestDb } = await import("../support/test-db");
    const db = getTestDb();
    await db.execute(sql`
      INSERT INTO email_sent_log (user_id, kind, period_key)
      VALUES (${TEST_USER_ID}, 'weekly_recap', '2026-W19')
      ON CONFLICT DO NOTHING
    `);
    await db.execute(sql`
      INSERT INTO email_sent_log (user_id, kind, period_key)
      VALUES (${TEST_USER_ID}, 'weekly_recap', '2026-W19')
      ON CONFLICT DO NOTHING
    `);
    const rows = await db.execute(
      sql`SELECT * FROM email_sent_log WHERE user_id = ${TEST_USER_ID} AND kind = 'weekly_recap'`
    );
    const rawRows = Array.isArray(rows)
      ? rows
      : ((rows as { rows?: unknown[] }).rows ?? []);
    expect(rawRows.length).toBe(1);
  });

  it("weekly_recap: different ISO week sends again", async () => {
    const { getTestDb } = await import("../support/test-db");
    const db = getTestDb();
    await db.execute(
      sql`INSERT INTO email_sent_log (user_id, kind, period_key) VALUES (${TEST_USER_ID}, 'weekly_recap', '2026-W18') ON CONFLICT DO NOTHING`
    );
    await db.execute(
      sql`INSERT INTO email_sent_log (user_id, kind, period_key) VALUES (${TEST_USER_ID}, 'weekly_recap', '2026-W19') ON CONFLICT DO NOTHING`
    );
    const rows = await db.execute(
      sql`SELECT * FROM email_sent_log WHERE user_id = ${TEST_USER_ID} AND kind = 'weekly_recap'`
    );
    const rawRows = Array.isArray(rows)
      ? rows
      : ((rows as { rows?: unknown[] }).rows ?? []);
    expect(rawRows.length).toBe(2);
  });
});
