import { describe, it, expect } from "vitest";
import { VocabEntrySchema } from "../../scripts/types/lesson";

const baseEntry = {
  surface: "水",
  reading: "みず",
  romaji: "mizu",
  part_of_speech: "noun",
  jlpt_level: "N5",
  meaning: { en: "water", "pt-BR": "água", es: "agua" },
  example_from_song: "水を飲む",
  additional_examples: [],
  vocab_item_id: "00000000-0000-0000-0000-000000000000",
};

describe("VocabEntrySchema — image_url field (Phase 11.4)", () => {
  it("accepts a valid Unsplash CDN URL", () => {
    const parsed = VocabEntrySchema.safeParse({
      ...baseEntry,
      image_url: "https://images.unsplash.com/photo-1234567890",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts undefined image_url (existing lessons pre-curation)", () => {
    const parsed = VocabEntrySchema.safeParse(baseEntry);
    expect(parsed.success).toBe(true);
  });

  it("rejects a non-URL string", () => {
    const parsed = VocabEntrySchema.safeParse({
      ...baseEntry,
      image_url: "not-a-url",
    });
    expect(parsed.success).toBe(false);
  });
});
