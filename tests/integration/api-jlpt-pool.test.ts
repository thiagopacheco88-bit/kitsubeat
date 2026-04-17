/**
 * tests/integration/api-jlpt-pool.test.ts
 *
 * Integration test for `GET /api/exercises/jlpt-pool` — calls the route handler
 * directly with a synthetic NextRequest. Verifies happy path, error path, and
 * the no-rows-on-bogus-level path against the live test DB.
 *
 * Env requirement:
 *   - TEST_DATABASE_URL must be set (DB redirect happens in tests/integration/setup.ts)
 *   - The vocab_global materialized view must contain at least one N5 row.
 *     Seeded via `npm run seed:dev` against TEST_DATABASE_URL.
 *
 * Skip behaviour:
 *   - If TEST_DATABASE_URL is unset, the entire suite is skipped via describe.skip.
 *     This keeps `npm run test:integration` from failing in environments where
 *     the operator has not yet provisioned the test DB (see plan 08.1-01 followup).
 */

import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/exercises/jlpt-pool/route";

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;

describeIfTestDb("GET /api/exercises/jlpt-pool", () => {
  it("returns 200 + an array of vocab rows for ?jlpt_level=N5", async () => {
    const req = new NextRequest(
      new URL("http://localhost/api/exercises/jlpt-pool?jlpt_level=N5")
    );
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    // The DB must have at least one N5 vocab row (seeded catalog). If the array
    // is empty, the test DB was not seeded — fail loudly here rather than mask it.
    expect(body.length).toBeGreaterThan(0);

    // Every row must carry the fields the exercise generator consumes.
    for (const row of body) {
      expect(row).toHaveProperty("dictionary_form");
      expect(row).toHaveProperty("reading");
      expect(row).toHaveProperty("romaji");
      expect(row).toHaveProperty("meaning");
      expect(row).toHaveProperty("part_of_speech");
    }
  });

  it("returns 400 + error when jlpt_level query param is missing", async () => {
    const req = new NextRequest(
      new URL("http://localhost/api/exercises/jlpt-pool")
    );
    const res = await GET(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
    expect(body.error).toMatch(/jlpt_level/i);
  });

  it("returns 200 + empty array for a nonsense level (?jlpt_level=N9)", async () => {
    // The route does not validate the enum — it just filters; an unknown level
    // produces zero rows but no crash. This locks the no-throw contract.
    const req = new NextRequest(
      new URL("http://localhost/api/exercises/jlpt-pool?jlpt_level=N9")
    );
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(0);
  });
});
