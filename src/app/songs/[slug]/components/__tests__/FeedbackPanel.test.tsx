// @vitest-environment jsdom
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Phase 11.4 Plan 02 — FeedbackPanel image rendering tests.
 *
 * Covers:
 *   - AC-4 (image renders inside the More accordion body)
 *   - AC-5 (CLS-safe numeric width=112 / height=112)
 *   - AC-6 (loading="lazy" + alt = English meaning)
 *   - DOM ordering: image precedes mnemonic block in the accordion body
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

  it("renders <img> inside the More accordion with width=112 height=112 alt=meaning_en (AC-4, AC-5, AC-6)", () => {
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

    const accordion = screen.getByTestId("feedback-more-accordion");
    expect(accordion.contains(img)).toBe(true);
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

  it("image appears BEFORE mnemonic block in DOM order (AC-4 ordering)", () => {
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
