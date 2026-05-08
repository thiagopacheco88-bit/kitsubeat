import { describe, it, expect } from "vitest";
import { render } from "./weeklyRecap";

const BASE_PROPS = {
  firstName: "Sato",
  vocabLearned: 42,
  songsTouched: 3,
  streakCurrent: 14,
  streakBest: 14,
  nextUp: { title: "Gurenge", slug: "gurenge" },
};

describe("weeklyRecap.render", () => {
  it("returns 4 sections in fixed order: vocab, songs, streak, next-up", () => {
    const { html } = render(BASE_PROPS);
    const vocabIdx = html.indexOf("Vocab Learned");
    const songsIdx = html.indexOf("Songs Touched");
    const streakIdx = html.indexOf("Streak");
    const nextUpIdx = html.indexOf("Up Next");
    expect(vocabIdx).toBeGreaterThan(-1);
    expect(songsIdx).toBeGreaterThan(vocabIdx);
    expect(streakIdx).toBeGreaterThan(songsIdx);
    expect(nextUpIdx).toBeGreaterThan(streakIdx);
  });

  it("subject contains vocab count and song count when > 0", () => {
    const { subject } = render(BASE_PROPS);
    expect(subject).toContain("42 vocab");
    expect(subject).toContain("3 songs");
  });

  it("subject falls back to 'Your week with KitsuBeat' when both counts are 0", () => {
    const { subject } = render({ ...BASE_PROPS, vocabLearned: 0, songsTouched: 0 });
    expect(subject).toBe("Your week with KitsuBeat");
  });

  it("sections with 0 values show '—' placeholder, not empty string", () => {
    const { html, text } = render({
      ...BASE_PROPS,
      vocabLearned: 0,
      songsTouched: 0,
      streakCurrent: 0,
      streakBest: 0,
      nextUp: null,
    });
    expect(html).toContain("—");
    expect(text).toContain("—");
  });

  it("text fallback is non-empty", () => {
    const { text } = render(BASE_PROPS);
    expect(text.length).toBeGreaterThan(100);
  });
});
