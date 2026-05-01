// @vitest-environment jsdom
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Phase 11.4 Plan 02 — FeedbackPanel image rendering tests.
 *
 * Covers:
 *   - AC-4 (image renders at top of FeedbackPanel — promoted out of the More
 *     accordion on UAT feedback so it is always visible without an extra tap)
 *   - AC-5 (CLS-safe numeric width=112 / height=112)
 *   - AC-6 (loading="lazy" + alt = English meaning)
 *   - DOM ordering: image precedes the More accordion / mnemonic block
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import FeedbackPanel from "../FeedbackPanel";
import { PlayerProvider } from "../PlayerContext";
import { useExerciseSession } from "@/stores/exerciseSession";
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

describe("FeedbackPanel image rendering (Phase 11.4)", () => {
  beforeEach(() => {
    act(() => {
      useExerciseSession.getState().clearSession?.();
      useExerciseSession.setState({ moreAccordionOpen: true });
    });
  });
  afterEach(() => cleanup());

  it("renders <img> at top of FeedbackPanel with width=112 height=112 alt=meaning_en (AC-4, AC-5, AC-6)", () => {
    const q = makeQuestion({
      image_url: "https://images.unsplash.com/photo-2",
      meaning_en: "water",
    });
    render(
      <PlayerProvider>
        <FeedbackPanel
          question={q}
          chosenAnswer="water"
          isCorrect={true}
          onContinue={vi.fn()}
          userId="u1"
        />
      </PlayerProvider>
    );
    const img = screen.getByTestId("feedback-image") as HTMLImageElement;
    expect(img.getAttribute("width")).toBe("112");
    expect(img.getAttribute("height")).toBe("112");
    expect(img.getAttribute("loading")).toBe("lazy");
    expect(img.getAttribute("alt")).toBe("water");

    // Image-only fixture: no mnemonic/explanation/kanji_breakdown ⇒ no More button
    // or accordion should render. Image lives at top-level of the FeedbackPanel.
    expect(screen.queryByTestId("feedback-more-accordion")).toBeNull();
    expect(screen.queryByText("More")).toBeNull();
  });

  it("omits <img> when image_url is undefined (AC-4 inverse)", () => {
    const q = makeQuestion({ image_url: undefined });
    render(
      <PlayerProvider>
        <FeedbackPanel
          question={q}
          chosenAnswer="water"
          isCorrect={true}
          onContinue={vi.fn()}
          userId="u1"
        />
      </PlayerProvider>
    );
    expect(screen.queryByTestId("feedback-image")).toBeNull();
  });

  it("image appears BEFORE mnemonic block in DOM order — image is now top-level, mnemonic remains in accordion (AC-4 ordering)", () => {
    const q = makeQuestion({
      image_url: "https://images.unsplash.com/photo-3",
      meaning_en: "water",
      mnemonic: { en: "memory tip", "pt-BR": "dica", es: "consejo" } as Question["mnemonic"],
    });
    render(
      <PlayerProvider>
        <FeedbackPanel
          question={q}
          chosenAnswer="water"
          isCorrect={true}
          onContinue={vi.fn()}
          userId="u1"
        />
      </PlayerProvider>
    );
    const img = screen.getByTestId("feedback-image");
    // The mnemonic block contains the literal label "Memory tip" (FeedbackPanel line ~154).
    // Case-sensitive exact match disambiguates from the localized mnemonic body
    // text which happens to share the same string in this fixture.
    const mnemonicLabel = screen.getByText("Memory tip");
    // image must appear earlier in document order than the mnemonic label.
    const order = img.compareDocumentPosition(mnemonicLabel);
    expect(order & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
