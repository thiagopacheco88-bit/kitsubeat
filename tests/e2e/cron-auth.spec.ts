// Phase 14.4 Wave 0 stub — filled in by plan 03
import { test, expect } from "../support/fixtures";

test.describe("Phase 14.4 / cron route auth", () => {
  test.todo("GET /api/cron/daily-reminder returns 401 without Authorization header");
  test.todo("GET /api/cron/daily-reminder returns 200 with valid CRON_SECRET + no RESEND_API_KEY (dry-run)");
  test.todo("GET /api/cron/weekly-recap returns 401 without Authorization header");
  test.todo("GET /api/cron/weekly-recap returns 200 with valid CRON_SECRET + no RESEND_API_KEY (dry-run)");
  test.todo("dry-run response body contains dry_run:true");
});
