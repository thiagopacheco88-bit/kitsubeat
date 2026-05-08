// Phase 14.4 Wave 0 stub — filled in by plan 03
import { test, expect } from "../support/fixtures";

test.describe("Phase 14.4 / cron route auth", () => {
  test.fixme("GET /api/cron/daily-reminder returns 401 without Authorization header", async ({ page }) => {
    // TODO: implement in plan 03
  });
  test.fixme("GET /api/cron/daily-reminder returns 200 with valid CRON_SECRET + no RESEND_API_KEY (dry-run)", async ({ page }) => {
    // TODO: implement in plan 03
  });
  test.fixme("GET /api/cron/weekly-recap returns 401 without Authorization header", async ({ page }) => {
    // TODO: implement in plan 03
  });
  test.fixme("GET /api/cron/weekly-recap returns 200 with valid CRON_SECRET + no RESEND_API_KEY (dry-run)", async ({ page }) => {
    // TODO: implement in plan 03
  });
  test.fixme("dry-run response body contains dry_run:true", async ({ page }) => {
    // TODO: implement in plan 03
  });
});
