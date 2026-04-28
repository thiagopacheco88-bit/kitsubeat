// @vitest-environment jsdom
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Phase 11.4 Plan 02 — LearnCard image rendering tests.
 *
 * Covers:
 *   - AC-3 (renders image when image_url present, omits when absent)
 *   - AC-5 (CLS-safe numeric width=224 / height=224 attributes)
 *   - AC-6 (loading="lazy" + alt = English meaning)
 *   - Pitfall 4 (image has no own onClick — clicks bubble to outer onDismiss)
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import LearnCard from "../LearnCard";
import type { Question } from "@/lib/exercises/generator";

function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: "q-test-1",
    type: "vocab_meaning" as Question["type"],
    vocabItemId: "00000000-0000-0000-0000-000000000000",
    prompt: "What does this mean?",
    correctAnswer: "water",
    distractors: ["fire", "earth", "wind"],
    explanation: "水 means water",
    vocabInfo: {
      surface: "水",
      reading: "みず",
      romaji: "mizu",
      vocab_item_id: "00000000-0000-0000-0000-000000000000",
    } as Question["vocabInfo"],
    ...overrides,
  } as Question;
}

describe("LearnCard image rendering (Phase 11.4)", () => {
  afterEach(() => cleanup());

  it("renders <img> with width=224, height=224, loading=lazy, alt=meaning_en when image_url present (AC-3, AC-5, AC-6)", () => {
    const q = makeQuestion({
      image_url: "https://images.unsplash.com/photo-1",
      meaning_en: "water",
    });
    render(
      <LearnCard
        question={q}
        partOfSpeech="noun"
        jlptLevel="N5"
        meaningText="water"
        lang="en"
        onDismiss={vi.fn()}
      />
    );
    const img = screen.getByTestId("learn-card-image") as HTMLImageElement;
    expect(img.getAttribute("width")).toBe("224");
    expect(img.getAttribute("height")).toBe("224");
    expect(img.getAttribute("loading")).toBe("lazy");
    expect(img.getAttribute("alt")).toBe("water");
    expect(img.getAttribute("src")).toBe("https://images.unsplash.com/photo-1");
  });

  it("omits <img> when image_url is undefined (AC-3 inverse)", () => {
    const q = makeQuestion({ image_url: undefined });
    render(
      <LearnCard
        question={q}
        partOfSpeech="noun"
        jlptLevel="N5"
        meaningText="water"
        lang="en"
        onDismiss={vi.fn()}
      />
    );
    expect(screen.queryByTestId("learn-card-image")).toBeNull();
  });

  it("the <img> has no onclick handler — clicks bubble to outer onDismiss (Pitfall 4)", () => {
    const q = makeQuestion({
      image_url: "https://images.unsplash.com/photo-1",
      meaning_en: "water",
    });
    render(
      <LearnCard
        question={q}
        partOfSpeech="noun"
        jlptLevel="N5"
        meaningText="water"
        lang="en"
        onDismiss={vi.fn()}
      />
    );
    const img = screen.getByTestId("learn-card-image") as HTMLImageElement;
    expect(img.onclick).toBeNull();
  });
});
