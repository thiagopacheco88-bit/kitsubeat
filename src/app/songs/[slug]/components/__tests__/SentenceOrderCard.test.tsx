// @vitest-environment jsdom
/**
 * Phase 10 Plan 05 — SentenceOrderCard rendering tests.
 *
 * Guards:
 *   - Pitfall 1: NO data-position / data-correct-index attributes in DOM.
 *     Tokens are keyed by UUID (generated at shuffle time), so devtools
 *     cannot read the correct-order index from the DOM.
 *   - Submit button disabled until pool is empty (all tokens placed).
 *   - Show hint toggle is one-way (reveals translation; no un-hide).
 *
 * jsdom environment required for React rendering + crypto.randomUUID().
 */

// Silence React 19 act() stderr warnings (see Phase 10-02 for rationale)
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import SentenceOrderCard from "../SentenceOrderCard";
import { useExerciseSession } from "@/stores/exerciseSession";
import type { Question } from "@/lib/exercises/generator";
import type { Token } from "@/lib/types/lesson";

function makeToken(surface: string): Token {
  return {
    surface,
    reading: surface,
    romaji: surface,
    grammar: "noun",
    grammar_color: "blue",
    meaning: `meaning_${surface}`,
    jlpt_level: "N5",
  };
}

function makeSentenceOrderQuestion(
  surfaces: string[],
  translation?: string
): Question {
  const verseTokens = surfaces.map(makeToken);
  return {
    id: "q-test-1",
    type: "sentence_order",
    vocabItemId: "",
    prompt: "Tap the words in order to reconstruct the verse.",
    correctAnswer: surfaces.join(""),
    distractors: [],
    explanation: `The verse reads: 「${surfaces.join("")}」.`,
    vocabInfo: {
      surface: surfaces.join(""),
      reading: surfaces.join(""),
      romaji: "",
    },
    verseTokens,
    translation,
  };
}

describe("SentenceOrderCard", () => {
  beforeEach(() => {
    // Reset session store + mark hydrated so useEffect initSentenceOrder runs.
    act(() => {
      useExerciseSession.getState().clearSession();
      useExerciseSession.getState().setHasHydrated(true);
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders without any data-position or data-correct-index attribute (Pitfall 1)", () => {
    const q = makeSentenceOrderQuestion(["the", "cat", "sat"]);
    render(
      <SentenceOrderCard
        question={q}
        onAnswer={vi.fn()}
        onContinue={vi.fn()}
      />
    );

    const buttons = document.querySelectorAll("[data-token-uuid]");
    expect(buttons.length).toBeGreaterThan(0);
    for (const btn of buttons) {
      expect(btn.hasAttribute("data-position")).toBe(false);
      expect(btn.hasAttribute("data-correct-index")).toBe(false);
      expect(btn.hasAttribute("data-correct")).toBe(false);
    }
    // Global guard: no such attribute anywhere in the rendered subtree.
    expect(document.querySelectorAll("[data-position]").length).toBe(0);
    expect(document.querySelectorAll("[data-correct-index]").length).toBe(0);
    expect(document.querySelectorAll("[data-correct]").length).toBe(0);
  });

  it("Submit button is disabled until all pool tokens are placed", () => {
    const q = makeSentenceOrderQuestion(["a", "b", "c"]);
    render(
      <SentenceOrderCard
        question={q}
        onAnswer={vi.fn()}
        onContinue={vi.fn()}
      />
    );

    const submit = screen.getByRole("button", { name: /submit/i });
    expect(submit).toBeDisabled();

    // Tap all pool tokens into the answer row
    const poolButtons = document.querySelectorAll("[aria-label='Word pool'] [data-token-uuid]");
    const firstUuid = poolButtons[0].getAttribute("data-token-uuid")!;
    const secondUuid = poolButtons[1].getAttribute("data-token-uuid")!;
    const thirdUuid = poolButtons[2].getAttribute("data-token-uuid")!;

    act(() => {
      useExerciseSession.getState().moveToAnswer(q.id, firstUuid);
      useExerciseSession.getState().moveToAnswer(q.id, secondUuid);
      useExerciseSession.getState().moveToAnswer(q.id, thirdUuid);
    });

    expect(submit).not.toBeDisabled();
  });

  it("Show hint toggle is one-way (reveals translation, no un-hide path)", () => {
    const q = makeSentenceOrderQuestion(["a", "b"], "Translation text here.");
    render(
      <SentenceOrderCard
        question={q}
        onAnswer={vi.fn()}
        onContinue={vi.fn()}
      />
    );

    // Initially: Show hint button visible, translation hidden
    const showHintBtn = screen.getByRole("button", { name: /show hint/i });
    expect(showHintBtn).toBeInTheDocument();
    expect(screen.queryByText(/Translation text here/)).not.toBeInTheDocument();

    // Click Show hint
    act(() => {
      useExerciseSession.getState().showHint(q.id);
    });

    // Translation revealed; Show hint button gone (no un-hide)
    expect(screen.queryByRole("button", { name: /show hint/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Translation text here/)).toBeInTheDocument();
  });

  it("submitting with pool empty + correct order calls onAnswer with correct=true + revealedReading=false when hint not shown", () => {
    const q = makeSentenceOrderQuestion(["a", "b", "c"]);
    const onAnswer = vi.fn();
    render(
      <SentenceOrderCard
        question={q}
        onAnswer={onAnswer}
        onContinue={vi.fn()}
      />
    );

    // Look up the pool tokens and move them in the CORRECT original order.
    // Because the pool is shuffled, we must look up each token by surface.
    const verseSurfaces = q.verseTokens!.map((t) => t.surface);
    act(() => {
      for (const surface of verseSurfaces) {
        const pool = useExerciseSession.getState().sentenceOrderPool[q.id];
        const token = pool.find((t) => t.surface === surface)!;
        useExerciseSession.getState().moveToAnswer(q.id, token.uuid);
      }
    });

    const submit = screen.getByRole("button", { name: /submit/i });
    act(() => {
      submit.click();
    });

    expect(onAnswer).toHaveBeenCalledTimes(1);
    const [answerStr, correct, , meta] = onAnswer.mock.calls[0];
    expect(answerStr).toBe(q.correctAnswer);
    expect(correct).toBe(true);
    expect(meta).toEqual({ revealedReading: false });
  });

  it("submitting with hint shown propagates revealedReading=true", () => {
    const q = makeSentenceOrderQuestion(["x", "y"], "hint text");
    const onAnswer = vi.fn();
    render(
      <SentenceOrderCard
        question={q}
        onAnswer={onAnswer}
        onContinue={vi.fn()}
      />
    );

    act(() => {
      // Show hint first
      useExerciseSession.getState().showHint(q.id);
      // Place tokens in correct order
      const pool = useExerciseSession.getState().sentenceOrderPool[q.id];
      for (const surface of q.verseTokens!.map((t) => t.surface)) {
        const token = pool.find((t) => t.surface === surface)!;
        useExerciseSession.getState().moveToAnswer(q.id, token.uuid);
      }
    });

    act(() => {
      screen.getByRole("button", { name: /submit/i }).click();
    });

    const [, , , meta] = onAnswer.mock.calls[0];
    expect(meta).toEqual({ revealedReading: true });
  });
});

