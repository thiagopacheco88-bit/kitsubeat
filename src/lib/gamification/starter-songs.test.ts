/**
 * src/lib/gamification/starter-songs.test.ts
 *
 * Unit tests for getStarterSongs() filter + warn behavior (Phase 14.1 D-01).
 *
 * All DB calls are mocked via vi.mock("../db") — no connection required.
 * The mock intercepts the exact import string used in starter-songs.ts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Stable mock shape for the Drizzle query chain ───────────────────────────
//
// starter-songs.ts calls:
//   db.select({...}).from(songs).where(inArray(songs.slug, slugList))
//
// The mock must return a thenable/Promise at the end of that chain.
// We store the resolved rows in _mockRows so each test can set them.
let _mockRows: Array<{
  slug: string;
  title: string;
  anime: string;
  jlpt_level: string | null;
  youtube_id: string | null;
  has_lesson: number | null;
}> = [];

vi.mock("../db", () => {
  const where = vi.fn(() => Promise.resolve(_mockRows));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  return { db: { select } };
});

// Import AFTER vi.mock so the mock is applied
import {
  getStarterSongs,
  STARTER_SONG_SLUGS,
} from "./starter-songs";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRow(
  slug: string,
  opts: {
    has_lesson?: number | null;
    youtube_id?: string | null;
  } = {}
) {
  return {
    slug,
    title: `Title for ${slug}`,
    anime: `Anime for ${slug}`,
    jlpt_level: "N4",
    youtube_id: opts.youtube_id ?? "dQw4w9WgXcQ",
    has_lesson: opts.has_lesson !== undefined ? opts.has_lesson : 1,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("getStarterSongs() — filter + warn behavior (Phase 14.1 D-01)", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  // Test 1 — All 3 slugs present + lessoned → returns 3 rows in declaration order,
  // no warn emitted.
  it("Test 1: returns 3 rows in STARTER_SONG_SLUGS order when all are present and lessoned", async () => {
    const [s0, s1, s2] = STARTER_SONG_SLUGS;
    // Deliberately insert DB rows in reverse order to verify re-ordering
    _mockRows = [makeRow(s2!), makeRow(s1!), makeRow(s0!)];

    const result = await getStarterSongs();

    expect(result).toHaveLength(3);
    expect(result[0]!.slug).toBe(s0);
    expect(result[1]!.slug).toBe(s1);
    expect(result[2]!.slug).toBe(s2);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  // Test 2 — 1 slug missing from DB rows → returns 2 rows; console.warn emitted
  // exactly once with text matching `misa-no-uta-aya-hirano missing or lessonless`
  it("Test 2: returns 2 rows and emits one per-slug warn when 1 slug is DB-missing", async () => {
    const [s0, s1, _s2] = STARTER_SONG_SLUGS;
    // s2 (Misa no Uta) is absent from DB rows
    _mockRows = [makeRow(s0!), makeRow(s1!)];

    const result = await getStarterSongs();

    expect(result).toHaveLength(2);
    expect(result[0]!.slug).toBe(s0);
    expect(result[1]!.slug).toBe(s1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("missing or lessonless — filtered from starter pool")
    );
  });

  // Test 3 — All 3 slugs filtered (missing OR lessonless) → returns []; console.warn
  // emitted with the ALL-missing message.
  it("Test 3: returns [] and emits all-drift warn when all 3 slugs are filtered out", async () => {
    // All rows returned but all have has_lesson = null
    const [s0, s1, s2] = STARTER_SONG_SLUGS;
    _mockRows = [
      makeRow(s0!, { has_lesson: null }),
      makeRow(s1!, { has_lesson: null }),
      makeRow(s2!, { has_lesson: null }),
    ];

    const result = await getStarterSongs();

    expect(result).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("ALL approved starter slugs missing — rendering EmptyState fallback")
    );
  });

  // Test 4 — 1 slug present-in-rows-but-has_lesson-null → returns 2 rows (the
  // lessonless one filtered), one warn line per filtered slug.
  it("Test 4: filters lessonless row and emits one warn per filtered slug", async () => {
    const [s0, s1, s2] = STARTER_SONG_SLUGS;
    // s0 (shinkokyuu-super-beaver) has no lesson
    _mockRows = [
      makeRow(s0!, { has_lesson: null }),
      makeRow(s1!),
      makeRow(s2!),
    ];

    const result = await getStarterSongs();

    expect(result).toHaveLength(2);
    expect(result[0]!.slug).toBe(s1);
    expect(result[1]!.slug).toBe(s2);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(`${s0} missing or lessonless — filtered from starter pool`)
    );
  });
});
