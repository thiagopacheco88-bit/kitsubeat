import { describe, it, expect, beforeEach } from "vitest";
import { useExerciseSession } from "../../src/stores/exerciseSession";

describe("exerciseSession.moreAccordionOpen", () => {
  beforeEach(() => {
    useExerciseSession.getState().clearSession();
    useExerciseSession.setState({ moreAccordionOpen: false });
  });

  it("defaults to false", () => {
    expect(useExerciseSession.getState().moreAccordionOpen).toBe(false);
  });

  it("setMoreAccordionOpen(true) flips the flag", () => {
    useExerciseSession.getState().setMoreAccordionOpen(true);
    expect(useExerciseSession.getState().moreAccordionOpen).toBe(true);
  });

  it("startSession resets moreAccordionOpen to false", () => {
    useExerciseSession.getState().setMoreAccordionOpen(true);
    useExerciseSession.getState().startSession("song-v1", [], "short");
    expect(useExerciseSession.getState().moreAccordionOpen).toBe(false);
  });

  it("advanceQuestion does NOT reset moreAccordionOpen (cross-question persistence)", () => {
    useExerciseSession.getState().setMoreAccordionOpen(true);
    useExerciseSession.getState().advanceQuestion();
    expect(useExerciseSession.getState().moreAccordionOpen).toBe(true);
  });
});
