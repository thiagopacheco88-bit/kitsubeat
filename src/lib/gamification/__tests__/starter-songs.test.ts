/**
 * Phase 12-03 — starter-songs unit coverage.
 *
 * Tests STARTER_SONG_SLUGS constant shape and getStarterSongs() behavior
 * with a mocked DB. The DB is never hit in unit tests.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock the DB module before importing the module under test ────────────────

// We mock at the module level so the `db` proxy used inside starter-songs.ts
// is replaced before any code executes.
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

import {
  STARTER_SONG_SLUGS,
  getStarterSongs,
  type StarterSongRow,
} from "@/lib/gamification/starter-songs";
import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a mock DB row matching the starter-songs SELECT projection. */
function makeDbRow(overrides: Partial<{
  slug: string;
  title: string;
  anime: string;
  jlpt_level: string | null;
  youtube_id: string | null;
  has_lesson: number | null;
}> = {}) {
  return {
    slug: "shinkokyuu-super-beaver",
    title: "Shinkokyuu (深呼吸)",
    anime: "Naruto Shippuden",
    jlpt_level: "N4",
    youtube_id: "abc123",
    has_lesson: 1,
    ...overrides,
  };
}

const THREE_ROWS = [
  makeDbRow({
    slug: "shinkokyuu-super-beaver",
    title: "Shinkokyuu (深呼吸)",
    anime: "Naruto Shippuden",
    jlpt_level: "N4",
    youtube_id: "yt_shin",
    has_lesson: 1,
  }),
  makeDbRow({
    slug: "distance-long-shot-party",
    title: "distance",
    anime: "Naruto",
    jlpt_level: "N4",
    youtube_id: "yt_dist",
    has_lesson: 1,
  }),
  makeDbRow({
    slug: "misa-no-uta-aya-hirano",
    title: "Misa no Uta",
    anime: "Death Note",
    jlpt_level: "N4",
    youtube_id: "yt_dn",
    has_lesson: 1,
  }),
];

/** Wire up the db.select() chain to resolve with the given rows. */
function mockDbSelect(rows: ReturnType<typeof makeDbRow>[]) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(rows),
  };
  vi.mocked(db.select).mockReturnValue(chain as never);
}

// ---------------------------------------------------------------------------
// STARTER_SONG_SLUGS
// ---------------------------------------------------------------------------

describe("STARTER_SONG_SLUGS", () => {
  it("is a 3-element readonly tuple", () => {
    expect(STARTER_SONG_SLUGS).toHaveLength(3);
    // TypeScript readonly at runtime means the array is not frozen — but the
    // values are user-approved. We just verify count and content.
  });

  it("contains the 3 user-approved slugs in the correct order", () => {
    expect(STARTER_SONG_SLUGS[0]).toBe("shinkokyuu-super-beaver");
    expect(STARTER_SONG_SLUGS[1]).toBe("distance-long-shot-party");
    expect(STARTER_SONG_SLUGS[2]).toBe("misa-no-uta-aya-hirano");
  });

  it("covers 3 distinct franchises (Naruto Shippuden, Naruto, Death Note)", () => {
    // This is a documentation test — if slugs change the test name should change too.
    const slugs = [...STARTER_SONG_SLUGS];
    expect(slugs.some((s) => s.includes("shinkokyuu"))).toBe(true);  // Naruto Shippuden
    expect(slugs.some((s) => s.includes("distance"))).toBe(true);    // Naruto
    expect(slugs.some((s) => s.includes("misa"))).toBe(true);        // Death Note
  });
});

// ---------------------------------------------------------------------------
// getStarterSongs()
// ---------------------------------------------------------------------------

describe("getStarterSongs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 3 StarterSongRow objects", async () => {
    mockDbSelect(THREE_ROWS);
    const result = await getStarterSongs();
    expect(result).toHaveLength(3);
  });

  it("returns rows in STARTER_SONG_SLUGS declaration order", async () => {
    // DB returns rows in reverse order — result should still be canonical order
    mockDbSelect([...THREE_ROWS].reverse());
    const result = await getStarterSongs();
    expect(result[0].slug).toBe("shinkokyuu-super-beaver");
    expect(result[1].slug).toBe("distance-long-shot-party");
    expect(result[2].slug).toBe("misa-no-uta-aya-hirano");
  });

  it("returns rows matching StarterSongRow shape", async () => {
    mockDbSelect(THREE_ROWS);
    const result = await getStarterSongs();

    const expectedKeys: (keyof StarterSongRow)[] = [
      "slug", "title", "anime", "jlpt_level", "youtube_id", "thumbnail_url",
    ];
    for (const row of result) {
      for (const key of expectedKeys) {
        expect(row).toHaveProperty(key);
      }
    }
  });

  it("derives thumbnail_url from youtube_id", async () => {
    mockDbSelect(THREE_ROWS);
    const result = await getStarterSongs();
    expect(result[0].thumbnail_url).toBe(
      "https://img.youtube.com/vi/yt_shin/hqdefault.jpg"
    );
    expect(result[1].thumbnail_url).toBe(
      "https://img.youtube.com/vi/yt_dist/hqdefault.jpg"
    );
    expect(result[2].thumbnail_url).toBe(
      "https://img.youtube.com/vi/yt_dn/hqdefault.jpg"
    );
  });

  it("sets thumbnail_url to null when youtube_id is null", async () => {
    mockDbSelect([
      ...THREE_ROWS.slice(0, 2),
      makeDbRow({
        slug: "misa-no-uta-aya-hirano",
        title: "Misa no Uta",
        anime: "Death Note",
        jlpt_level: "N4",
        youtube_id: null,
        has_lesson: 1,
      }),
    ]);
    const result = await getStarterSongs();
    expect(result[2].thumbnail_url).toBeNull();
    expect(result[2].youtube_id).toBeNull();
  });

  // Filter+warn behavior (replaces old throw-on-missing contract per Phase 14.1
  // SPEC-REQ-1) is covered in src/lib/gamification/starter-songs.test.ts.

  it("jlpt_level can be null (nullable field)", async () => {
    mockDbSelect(
      THREE_ROWS.map((r) => ({ ...r, jlpt_level: null }))
    );
    const result = await getStarterSongs();
    for (const row of result) {
      expect(row.jlpt_level).toBeNull();
    }
  });
});
