/**
 * tests/integration/admin-songs-api.test.ts
 *
 * Smoke integration test for `GET /api/admin/songs` — confirms the route returns
 * a populated array shaped {id, slug, title, ...} that matches the row count of
 * the song_versions table in the test DB.
 *
 * The route TODO comment notes "Gate behind admin role in Phase 3" — at the time
 * of writing there is no auth gate, so the route is callable without headers.
 * If/when Clerk admin gating lands, this test will need to inject a session token
 * (or this entire describe should be `.skip`'d with a TODO documenting the work
 * needed to mock auth — do NOT mock auth ad-hoc here).
 *
 * Env requirement:
 *   - TEST_DATABASE_URL must be set (DB redirect happens in tests/integration/setup.ts)
 *   - The catalog must be seeded (`npm run seed:dev` against TEST_DATABASE_URL).
 */

import { describe, it, expect } from "vitest";
import { sql } from "drizzle-orm";
import { GET } from "@/app/api/admin/songs/route";
import { getTestDb } from "../support/test-db";

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;

describeIfTestDb("GET /api/admin/songs", () => {
  it("returns 200 + an array of song versions with id/slug/title fields", async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);

    for (const row of body) {
      expect(row).toHaveProperty("id");
      expect(row).toHaveProperty("slug");
      expect(row).toHaveProperty("title");
      // Common admin-list fields the timing editor consumes.
      expect(row).toHaveProperty("artist");
      expect(row).toHaveProperty("anime");
      expect(row).toHaveProperty("version_type");
      expect(row).toHaveProperty("timing_verified");
    }
  });

  it("array length matches SELECT count(*) FROM song_versions (parity check)", async () => {
    const res = await GET();
    const body = (await res.json()) as unknown[];

    const db = getTestDb();
    const countRows = (await db.execute(
      sql`SELECT COUNT(*)::int AS count FROM song_versions`
    )) as unknown as Array<{ count: number }>;

    // Drizzle/Neon may return the rows wrapped or unwrapped depending on driver
    // shape — handle both.
    const rows = Array.isArray(countRows)
      ? countRows
      : ((countRows as unknown as { rows: Array<{ count: number }> }).rows ?? []);
    const expectedCount = Number(rows[0]?.count ?? 0);

    expect(body.length).toBe(expectedCount);
  });
});
