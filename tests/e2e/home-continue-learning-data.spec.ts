/**
 * SPEC AC #10 — Continue Learning data-correctness:
 *   Seeded user with 2 in-progress songs at known completion_pct percentages
 *   renders 2 ContinueCards in updated_at DESC order; each progress bar's
 *   computed width matches the seeded percent ±2%.
 *
 * Per revision: authenticated spec uses authenticatedTest (Plan 14.2-01b bypass).
 */
import { authenticatedTest as test, expect } from "../support/auth-fixtures";
import { getTestDb, resetTestProgress } from "../support/test-db";
import { sql } from "drizzle-orm";

test.describe("/ Continue Learning data-correctness (AC #10)", () => {
  test.beforeEach(async ({ authedUserId }) => {
    await resetTestProgress(authedUserId);

    const db = getTestDb();

    // Seed 2 in-progress rows for authedUserId at known completion_pct values.
    // Row 1: completion_pct=0.66 (newer — should appear first in updated_at DESC order)
    // Row 2: completion_pct=0.33 (older — should appear second)
    // We pick the two most popular active songs with youtube_ids to ensure they render.
    await db.execute(sql`
      WITH ranked_songs AS (
        SELECT
          sv.id AS song_version_id,
          ROW_NUMBER() OVER (ORDER BY s.popularity_rank ASC NULLS LAST) AS rn
        FROM song_versions sv
        JOIN songs s ON s.id = sv.song_id
        WHERE s.quality_status = 'active'
          AND s.language = 'ja'
          AND sv.youtube_id IS NOT NULL
        LIMIT 2
      )
      INSERT INTO user_song_progress (
        user_id,
        song_version_id,
        completion_pct,
        updated_at
      )
      SELECT
        ${authedUserId},
        r.song_version_id,
        CASE r.rn
          WHEN 1 THEN 0.66
          WHEN 2 THEN 0.33
        END,
        CASE r.rn
          WHEN 1 THEN NOW()
          WHEN 2 THEN NOW() - INTERVAL '1 hour'
        END
      FROM ranked_songs r
      ON CONFLICT (user_id, song_version_id) DO UPDATE SET
        completion_pct = EXCLUDED.completion_pct,
        updated_at = EXCLUDED.updated_at
    `);
  });

  test("2 in-progress songs -> 2 ContinueCards in updated_at DESC; progress widths match seed ±2%", async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await context.addCookies([
      { name: "kb_theme", value: "dark", url: "http://localhost:7000", sameSite: "Lax" },
    ]);

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Continue Learning section must be visible
    const continueSection = page.locator('[data-testid="continue-learning"]');
    await expect(continueSection).toBeVisible({ timeout: 10_000 });

    // Exactly 2 ContinueCards
    const cards = page.locator('[data-testid^="continue-card-"]');
    await expect(cards).toHaveCount(2);

    // First card has the higher completion_pct (newer = updated_at DESC = first card)
    const firstFill = cards.first().locator('[data-testid="continue-card-progress-fill"]');
    const firstWidth = await firstFill.evaluate((el) => (el as HTMLElement).style.width);
    const firstPct = parseFloat(firstWidth);
    expect(firstPct).toBeGreaterThanOrEqual(64); // 66 - 2
    expect(firstPct).toBeLessThanOrEqual(68); // 66 + 2

    const secondFill = cards.nth(1).locator('[data-testid="continue-card-progress-fill"]');
    const secondWidth = await secondFill.evaluate((el) => (el as HTMLElement).style.width);
    const secondPct = parseFloat(secondWidth);
    expect(secondPct).toBeGreaterThanOrEqual(31); // 33 - 2
    expect(secondPct).toBeLessThanOrEqual(35); // 33 + 2
  });
});
