import { describe, it, expect, beforeEach } from "vitest";
import { useAdminLyricsStore } from "./lyrics-store";
import type { Verse } from "@/lib/types/lesson";

const sampleVerses: Verse[] = [
  {
    verse_number: 1,
    start_time_ms: 0,
    end_time_ms: 1000,
    tokens: [],
    translations: { en: "one" },
    literal_meaning: "",
    cultural_context: "",
  },
  {
    verse_number: 2,
    start_time_ms: 1000,
    end_time_ms: 2000,
    tokens: [],
    translations: { en: "two" },
    literal_meaning: "",
    cultural_context: "",
  },
  {
    verse_number: 3,
    start_time_ms: 2000,
    end_time_ms: 3000,
    tokens: [],
    translations: { en: "three" },
    literal_meaning: "",
    cultural_context: "",
  },
];

describe("useAdminLyricsStore", () => {
  beforeEach(() => {
    useAdminLyricsStore.getState().reset();
  });

  it("init populates state and clears dirtyVerseNumbers", () => {
    useAdminLyricsStore.getState().init({
      songVersionId: "sv1",
      editorId: "user_x",
      baseVersionId: "lv1",
      baseVersionNumber: 1,
      verses: sampleVerses,
    });
    const s = useAdminLyricsStore.getState();
    expect(s.songVersionId).toBe("sv1");
    expect(s.editorId).toBe("user_x");
    expect(s.baseVersionId).toBe("lv1");
    expect(s.verses).toHaveLength(3);
    expect(s.dirtyVerseNumbers).toEqual([]);
  });

  it("updateVerse mutates only target verse and marks dirty", () => {
    useAdminLyricsStore.getState().init({
      songVersionId: "sv1",
      editorId: "u",
      baseVersionId: "lv1",
      baseVersionNumber: 1,
      verses: sampleVerses,
    });
    useAdminLyricsStore.getState().updateVerse(2, { translations: { en: "v2-edited" } });
    const s = useAdminLyricsStore.getState();
    expect(s.verses[1].translations.en).toBe("v2-edited");
    expect(s.verses[0].translations.en).toBe("one");
    expect(s.verses[2].translations.en).toBe("three");
    expect(s.dirtyVerseNumbers).toEqual([2]);
  });

  it("dedup: updating same verse twice keeps single dirty entry", () => {
    useAdminLyricsStore.getState().init({
      songVersionId: "sv1",
      editorId: "u",
      baseVersionId: "lv1",
      baseVersionNumber: 1,
      verses: sampleVerses,
    });
    useAdminLyricsStore.getState().updateVerse(2, { translations: { en: "x" } });
    useAdminLyricsStore.getState().updateVerse(2, { translations: { en: "y" } });
    expect(useAdminLyricsStore.getState().dirtyVerseNumbers).toEqual([2]);
  });

  it("insertVerse appends after the given verse and marks new number dirty", () => {
    useAdminLyricsStore.getState().init({
      songVersionId: "sv1",
      editorId: "u",
      baseVersionId: "lv1",
      baseVersionNumber: 1,
      verses: sampleVerses,
    });
    useAdminLyricsStore.getState().insertVerse(2);
    const s = useAdminLyricsStore.getState();
    expect(s.verses).toHaveLength(4);
    expect(s.verses[2].verse_number).toBe(4);
    expect(s.dirtyVerseNumbers).toContain(4);
  });

  it("insertVerse(null) inserts at the beginning", () => {
    useAdminLyricsStore.getState().init({
      songVersionId: "sv1",
      editorId: "u",
      baseVersionId: "lv1",
      baseVersionNumber: 1,
      verses: sampleVerses,
    });
    useAdminLyricsStore.getState().insertVerse(null);
    const s = useAdminLyricsStore.getState();
    expect(s.verses).toHaveLength(4);
    expect(s.verses[0].verse_number).toBe(4); // new verse at idx 0
  });

  it("deleteVerse removes target and marks number dirty", () => {
    useAdminLyricsStore.getState().init({
      songVersionId: "sv1",
      editorId: "u",
      baseVersionId: "lv1",
      baseVersionNumber: 1,
      verses: sampleVerses,
    });
    useAdminLyricsStore.getState().deleteVerse(2);
    const s = useAdminLyricsStore.getState();
    expect(s.verses).toHaveLength(2);
    expect(s.verses.map((v) => v.verse_number)).toEqual([1, 3]);
    expect(s.dirtyVerseNumbers).toContain(2);
  });

  it("save status transitions: markSaving -> markSaved", () => {
    useAdminLyricsStore.getState().markSaving();
    expect(useAdminLyricsStore.getState().saveStatus).toBe("saving");
    useAdminLyricsStore.getState().markSaved();
    expect(useAdminLyricsStore.getState().saveStatus).toBe("saved");
    expect(useAdminLyricsStore.getState().lastSavedAt).toBeGreaterThan(0);
  });

  it("markError sets status + message", () => {
    useAdminLyricsStore.getState().markError("network failure");
    const s = useAdminLyricsStore.getState();
    expect(s.saveStatus).toBe("error");
    expect(s.saveError).toBe("network failure");
  });

  it("markPublished advances base + clears dirty but keeps verses on screen", () => {
    useAdminLyricsStore.getState().init({
      songVersionId: "sv1",
      editorId: "u",
      baseVersionId: "lv1",
      baseVersionNumber: 1,
      verses: sampleVerses,
    });
    useAdminLyricsStore.getState().updateVerse(1, { translations: { en: "x" } });
    useAdminLyricsStore.getState().markPublished({
      newVersionId: "lv2",
      newVersionNumber: 2,
    });
    const s = useAdminLyricsStore.getState();
    // Verses stay — they ARE the just-published baseline now
    expect(s.verses.length).toBe(sampleVerses.length);
    expect(s.dirtyVerseNumbers).toEqual([]);
    expect(s.songVersionId).toBe("sv1"); // identity preserved
    expect(s.baseVersionId).toBe("lv2"); // advanced to new version
    expect(s.baseVersionNumber).toBe(2);
    expect(s.saveStatus).toBe("idle");
    expect(s.saveError).toBeNull();
  });
});
