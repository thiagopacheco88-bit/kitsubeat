import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock zustand's persist middleware to avoid localStorage dependency in node env
vi.mock("zustand/middleware", () => ({
  persist: (fn: (set: unknown, get: unknown, api: unknown) => unknown) =>
    fn,
  createJSONStorage: () => null,
}));

// Import AFTER mocking
import { useExerciseSession } from "../exerciseSession";
import type { Question } from "@/lib/exercises/generator";

function makeDummyQuestion(id: string): Question {
  return {
    id,
    type: "vocab_meaning",
    vocabItemId: `vocab-${id}`,
    prompt: "What does 犬 mean?",
    correctAnswer: "dog",
    distractors: ["cat", "fish", "bird"],
    explanation: "犬 means dog.",
    vocabInfo: { surface: "犬", reading: "いぬ", romaji: "inu" },
  };
}

describe("exerciseSession store — moreAccordionOpen", () => {
  beforeEach(() => {
    // Reset the store to initial state before each test
    useExerciseSession.getState().clearSession();
  });

  it("defaults moreAccordionOpen to false", () => {
    const state = useExerciseSession.getState();
    expect(state.moreAccordionOpen).toBe(false);
  });

  it("setMoreAccordionOpen(true) opens the accordion", () => {
    useExerciseSession.getState().setMoreAccordionOpen(true);
    expect(useExerciseSession.getState().moreAccordionOpen).toBe(true);
  });

  it("setMoreAccordionOpen(false) closes the accordion", () => {
    useExerciseSession.getState().setMoreAccordionOpen(true);
    useExerciseSession.getState().setMoreAccordionOpen(false);
    expect(useExerciseSession.getState().moreAccordionOpen).toBe(false);
  });

  it("startSession resets moreAccordionOpen to false", () => {
    // Open the accordion first
    useExerciseSession.getState().setMoreAccordionOpen(true);
    expect(useExerciseSession.getState().moreAccordionOpen).toBe(true);

    // Start a new session
    const questions = [makeDummyQuestion("q1"), makeDummyQuestion("q2")];
    useExerciseSession.getState().startSession("version-id-abc", questions, "short");

    // Accordion should be reset
    expect(useExerciseSession.getState().moreAccordionOpen).toBe(false);
  });

  it("moreAccordionOpen persists across question advances (within a session)", () => {
    const questions = [makeDummyQuestion("q1"), makeDummyQuestion("q2")];
    useExerciseSession.getState().startSession("version-id-xyz", questions, "short");

    // Open accordion after first question
    useExerciseSession.getState().setMoreAccordionOpen(true);
    expect(useExerciseSession.getState().moreAccordionOpen).toBe(true);

    // Advance question — accordion should remain open
    useExerciseSession.getState().advanceQuestion();
    expect(useExerciseSession.getState().moreAccordionOpen).toBe(true);
  });

  it("clearSession resets moreAccordionOpen to false", () => {
    useExerciseSession.getState().setMoreAccordionOpen(true);
    useExerciseSession.getState().clearSession();
    expect(useExerciseSession.getState().moreAccordionOpen).toBe(false);
  });
});
