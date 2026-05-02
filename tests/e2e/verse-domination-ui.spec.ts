// Phase 11.6 Wave 0 RED stub — implementation in Task 2/3.
//
// SPEC-REQ-14 — verse-domination UI surfaces:
//   (a) song page header shows "X/Y verses" counter with leading star icon
//   (b) lyrics view renders a star next to each verse with a row in
//       user_verse_domination
//   (c) song catalog cards render "NN% dominated" line below the stars row
//   (d) verses without a row in user_verse_domination do NOT render the star
//
// Fixtures: relies on tests/support/fixtures.ts seededSong + testUser pattern
// (Phase 08.1-03). DB writes go through TEST_DATABASE_URL — tests skip cleanly
// when that env var is not provisioned (the assertion does not produce
// false-fails on a workstation without the test DB).
//
// Data-testids consumed:
//   - verse-dominated-star  (on VerseStarIcon span wrapper)
//   - verses-counter        (on the song header counter span)
//   - verses-dominated-pct  (on the SongCard percentage line)

import { test, expect } from "../support/fixtures";
import { sql } from "drizzle-orm";
import { getTestDb, TEST_USER_ID } from "../support/test-db";

const SLUG = "again-yui";
const HAS_TEST_DB = Boolean(process.env.TEST_DATABASE_URL);

/**
 * Insert N user_verse_domination rows for a (user, song_version) pair.
 * Idempotent via ON CONFLICT DO NOTHING — matches Plan 11.6-05's INSERT shape.
 */
async function seedDominatedVerses(
  songVersionId: string,
  verseNumbers: number[]
): Promise<void> {
  const db = getTestDb();
  for (const vno of verseNumbers) {
    await db.execute(sql`
      INSERT INTO user_verse_domination (user_id, song_version_id, verse_number, dominated_at)
      VALUES (${TEST_USER_ID}, ${songVersionId}, ${vno}, NOW())
      ON CONFLICT DO NOTHING
    `);
  }
}

async function clearDominatedVerses(songVersionId: string): Promise<void> {
  const db = getTestDb();
  await db.execute(sql`
    DELETE FROM user_verse_domination
    WHERE user_id = ${TEST_USER_ID} AND song_version_id = ${songVersionId}
  `);
}

test.describe("Phase 11.6 SPEC-REQ-14 — verse-domination UI surfaces", () => {
  test.skip(
    !HAS_TEST_DB,
    "TEST_DATABASE_URL not provisioned — verse-domination UI tests need DB seeding."
  );

  test("song page header shows X/Y verses counter with star icon", async ({
    page,
    testUser,
    seededSong,
  }) => {
    void testUser;
    const song = await seededSong(SLUG);

    // Reset, then seed 7 dominated verses (numbers 1..7).
    await clearDominatedVerses(song.songVersionId);
    await seedDominatedVerses(song.songVersionId, [1, 2, 3, 4, 5, 6, 7]);

    await page.goto(`/songs/${song.slug}`);

    // Counter: "7/N verses" where N is the total verse count for the song.
    const counter = page.locator('[data-testid="verses-counter"]');
    await expect(counter).toBeVisible({ timeout: 10_000 });
    await expect(counter).toContainText(/^\s*7\/\d+\s+verses\s*$/);

    // Star icon adjacent to the counter (rendered inside the same span wrapper).
    await expect(counter.locator('[data-testid="verse-dominated-star"]')).toBeVisible();
  });

  test("lyrics view shows star next to each dominated verse", async ({
    page,
    testUser,
    seededSong,
  }) => {
    void testUser;
    const song = await seededSong(SLUG);

    await clearDominatedVerses(song.songVersionId);
    await seedDominatedVerses(song.songVersionId, [1, 2, 3, 4, 5, 6, 7]);

    await page.goto(`/songs/${song.slug}`);

    // Wait for the lyrics panel to render at least one verse.
    await expect(page.locator("[data-verse-number]").first()).toBeVisible({
      timeout: 10_000,
    });

    // Stars in the lyrics view: count must equal the number of dominated rows.
    // The header counter also renders one star icon — restrict the locator to
    // verse-block descendants by walking through [data-verse-number] elements.
    const starsInLyrics = page.locator(
      '[data-verse-number] [data-testid="verse-dominated-star"]'
    );
    await expect(starsInLyrics).toHaveCount(7);
  });

  test("non-dominated verses do not render the star icon", async ({
    page,
    testUser,
    seededSong,
  }) => {
    void testUser;
    const song = await seededSong(SLUG);

    // Seed only verse 1 — every other verse must NOT have a star.
    await clearDominatedVerses(song.songVersionId);
    await seedDominatedVerses(song.songVersionId, [1]);

    await page.goto(`/songs/${song.slug}`);

    // Wait for at least 2 verses to render.
    await expect(page.locator("[data-verse-number]")).not.toHaveCount(0, {
      timeout: 10_000,
    });

    const starsInLyrics = page.locator(
      '[data-verse-number] [data-testid="verse-dominated-star"]'
    );
    await expect(starsInLyrics).toHaveCount(1);

    // The verse-2 block must NOT carry a star icon.
    const verseTwo = page.locator('[data-verse-number="2"]');
    await expect(
      verseTwo.locator('[data-testid="verse-dominated-star"]')
    ).toHaveCount(0);
  });

  test("song catalog card shows '% dominated' line", async ({
    page,
    testUser,
    seededSong,
  }) => {
    void testUser;
    const song = await seededSong(SLUG);

    await clearDominatedVerses(song.songVersionId);
    await seedDominatedVerses(song.songVersionId, [1, 2, 3, 4, 5, 6, 7]);

    await page.goto("/songs");

    // Locate the catalog card for the seeded slug.
    const card = page.locator(`a[href="/songs/${song.slug}"]`).first();
    await expect(card).toBeVisible({ timeout: 10_000 });

    const pct = card.locator('[data-testid="verses-dominated-pct"]');
    await expect(pct).toBeVisible();
    await expect(pct).toContainText(/\d+%\s+dominated/);
  });
});
