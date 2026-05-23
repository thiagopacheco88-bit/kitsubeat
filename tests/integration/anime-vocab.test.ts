/**
 * tests/integration/anime-vocab.test.ts
 *
 * Integration tests for getAnimeCatalog() and getAnimeVocabBySlug().
 * Phase 18.3 Plan 03: Anime Vocabulary Carousel query functions.
 *
 * Requires: DATABASE_URL set + anime_vocab_catalog seeded (Wave 2 — 760 words).
 * Skip guard: uses describe.skip when DATABASE_URL is absent.
 */
import { describe, it, expect } from "vitest";

const HAS_DB = !!process.env.DATABASE_URL;
const describeIfDb = HAS_DB ? describe : describe.skip;

describeIfDb("getAnimeCatalog() — live DB", () => {
  it("returns 6 anime entries with required fields", async () => {
    const { getAnimeCatalog } = await import("@/lib/db/queries");

    const catalog = await getAnimeCatalog();

    expect(catalog).toHaveLength(6);

    for (const entry of catalog) {
      expect(typeof entry.anime_slug).toBe("string");
      expect(entry.anime_slug.length).toBeGreaterThan(0);
      expect(typeof entry.word_count).toBe("number");
      expect(entry.word_count).toBeGreaterThan(0);
      // top_jlpt is string or null
      if (entry.top_jlpt !== null) {
        expect(["N5", "N4", "N3", "N2", "N1"]).toContain(entry.top_jlpt);
      }
      // metadata fields are nullable (LEFT JOIN may yield null)
      expect(entry.cover_image === null || typeof entry.cover_image === "string").toBe(true);
      expect(entry.title_english === null || typeof entry.title_english === "string").toBe(true);
      expect(entry.description === null || typeof entry.description === "string").toBe(true);
    }
  });

  it("includes known slugs in the catalog", async () => {
    const { getAnimeCatalog } = await import("@/lib/db/queries");
    const catalog = await getAnimeCatalog();
    const slugs = catalog.map((e) => e.anime_slug);
    expect(slugs).toContain("naruto");
    expect(slugs).toContain("one-piece");
  });
});

describeIfDb("getAnimeVocabBySlug() — live DB", () => {
  it("returns words array and animeMeta for known slug (naruto)", async () => {
    const { getAnimeVocabBySlug } = await import("@/lib/db/queries");

    const result = await getAnimeVocabBySlug("naruto", null);

    expect(result).toHaveProperty("animeMeta");
    expect(result).toHaveProperty("words");
    expect(Array.isArray(result.words)).toBe(true);
    expect(result.words.length).toBeGreaterThan(0);

    const word = result.words[0];
    expect(typeof word.vocab_item_id).toBe("string");
    expect(typeof word.surface).toBe("string");
    expect(typeof word.reading).toBe("string");
    expect(typeof word.romaji).toBe("string");
    expect(typeof word.meaning).toBe("object");
    expect(typeof word.meaning.en).toBe("string");
    expect(typeof word.category).toBe("string");
    expect(typeof word.display_order).toBe("number");
    // unauthenticated: mastery_state is 0 (New)
    expect(word.mastery_state).toBe(0);
  });

  it("returns null animeMeta and empty words for unknown slug", async () => {
    const { getAnimeVocabBySlug } = await import("@/lib/db/queries");

    const result = await getAnimeVocabBySlug("nonexistent-slug", null);

    expect(result.animeMeta).toBeNull();
    expect(result.words).toHaveLength(0);
  });

  it("words are ordered by display_order", async () => {
    const { getAnimeVocabBySlug } = await import("@/lib/db/queries");

    const result = await getAnimeVocabBySlug("naruto", null);

    const orders = result.words.map((w) => w.display_order);
    for (let i = 1; i < orders.length; i++) {
      expect(orders[i]).toBeGreaterThanOrEqual(orders[i - 1]);
    }
  });
});
