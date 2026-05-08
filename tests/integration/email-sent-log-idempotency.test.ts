// Phase 14.4 Wave 0 stub — filled in by plan 03
import { describe, it, expect } from "vitest";

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;

describeIfTestDb("email_sent_log idempotency", () => {
  it.todo("daily_reminder: second run same day (same period_key) skips send");
  it.todo("daily_reminder: different day (different period_key) sends again");
  it.todo("weekly_recap: second run same ISO week skips send");
  it.todo("weekly_recap: different ISO week sends again");
  it.todo("dry-run path does NOT write email_sent_log rows");
});
