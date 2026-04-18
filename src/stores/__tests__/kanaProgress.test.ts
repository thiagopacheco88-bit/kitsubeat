import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock zustand's persist middleware so the unit test doesn't depend on a real
// localStorage. Persist becomes a passthrough; createJSONStorage is a no-op.
// Mirrors the pattern in src/stores/__tests__/exerciseSession.test.ts.
vi.mock("zustand/middleware", () => ({
  persist: (fn: (set: unknown, get: unknown, api: unknown) => unknown) => fn,
  createJSONStorage: () => null,
}));

// Import AFTER mocking so the persist wrapper is the passthrough above.
import { useKanaProgress } from "../kanaProgress";

beforeEach(() => {
  // Each test starts from a clean slate. __resetForTests does NOT touch the
  // hydration flag (that's deliberate — see store comment), so we set it
  // explicitly when a test cares about it.
  useKanaProgress.getState().__resetForTests();
  useKanaProgress.setState({ _hasHydrated: false });
});

describe("kanaProgress — initial state", () => {
  it("starts with empty maps, sessionsCompleted=0, _hasHydrated=false", () => {
    const s = useKanaProgress.getState();
    expect(s.hiragana).toEqual({});
    expect(s.katakana).toEqual({});
    expect(s.sessionsCompleted).toBe(0);
    expect(s._hasHydrated).toBe(false);
  });
});

describe("kanaProgress — applyAnswer", () => {
  it("hiragana correct: あ 0 -> 1; katakana untouched", () => {
    useKanaProgress.getState().applyAnswer("hiragana", "あ", true);
    const s = useKanaProgress.getState();
    expect(s.hiragana["あ"]).toBe(1);
    expect(s.katakana).toEqual({});
  });

  it("hiragana correct ×3: あ -> 3", () => {
    const { applyAnswer } = useKanaProgress.getState();
    applyAnswer("hiragana", "あ", true);
    applyAnswer("hiragana", "あ", true);
    applyAnswer("hiragana", "あ", true);
    expect(useKanaProgress.getState().hiragana["あ"]).toBe(3);
  });

  it("hiragana wrong on a fresh char clamps to 0 (NOT -2)", () => {
    useKanaProgress.getState().applyAnswer("hiragana", "あ", false);
    expect(useKanaProgress.getState().hiragana["あ"]).toBe(0);
  });

  it("hiragana correct ×5 then wrong: 5 -> 3", () => {
    const { applyAnswer } = useKanaProgress.getState();
    for (let i = 0; i < 5; i++) applyAnswer("hiragana", "あ", true);
    expect(useKanaProgress.getState().hiragana["あ"]).toBe(5);
    applyAnswer("hiragana", "あ", false);
    expect(useKanaProgress.getState().hiragana["あ"]).toBe(3);
  });

  it("katakana correct: ア -> 1; hiragana あ stays undefined (independence)", () => {
    useKanaProgress.getState().applyAnswer("katakana", "ア", true);
    const s = useKanaProgress.getState();
    expect(s.katakana["ア"]).toBe(1);
    expect(s.hiragana["あ"]).toBeUndefined();
  });
});

describe("kanaProgress — setStars", () => {
  it("setStars('hiragana', 'あ', 1) -> 1 (KANA-04 'Got it' path)", () => {
    useKanaProgress.getState().setStars("hiragana", "あ", 1);
    expect(useKanaProgress.getState().hiragana["あ"]).toBe(1);
  });

  it("setStars clamps above-ceiling values to 10", () => {
    useKanaProgress.getState().setStars("hiragana", "い", 99);
    expect(useKanaProgress.getState().hiragana["い"]).toBe(10);
  });

  it("setStars clamps below-floor values to 0", () => {
    useKanaProgress.getState().setStars("hiragana", "う", -7);
    expect(useKanaProgress.getState().hiragana["う"]).toBe(0);
  });

  it("setStars on katakana doesn't bleed into hiragana", () => {
    useKanaProgress.getState().setStars("katakana", "ア", 5);
    const s = useKanaProgress.getState();
    expect(s.katakana["ア"]).toBe(5);
    expect(s.hiragana["ア"]).toBeUndefined();
  });
});

describe("kanaProgress — incrementSessionsCompleted", () => {
  it("twice -> 2", () => {
    const { incrementSessionsCompleted } = useKanaProgress.getState();
    incrementSessionsCompleted();
    incrementSessionsCompleted();
    expect(useKanaProgress.getState().sessionsCompleted).toBe(2);
  });
});

describe("kanaProgress — hydrateFrom", () => {
  it("replaces both maps wholesale", () => {
    // Pre-seed something to make sure hydrateFrom REPLACES, not merges
    useKanaProgress.getState().applyAnswer("hiragana", "い", true);
    useKanaProgress.getState().hydrateFrom({
      hiragana: { あ: 7 },
      katakana: { ア: 4 },
    });
    const s = useKanaProgress.getState();
    expect(s.hiragana).toEqual({ あ: 7 });
    expect(s.katakana).toEqual({ ア: 4 });
  });
});

describe("kanaProgress — setHasHydrated", () => {
  it("flips the hydration flag to true", () => {
    expect(useKanaProgress.getState()._hasHydrated).toBe(false);
    useKanaProgress.getState().setHasHydrated(true);
    expect(useKanaProgress.getState()._hasHydrated).toBe(true);
  });
});

describe("kanaProgress — partialize shape", () => {
  // Note: persist middleware is mocked above to a passthrough, so we can't
  // observe the real localStorage write here. The store re-exports neither
  // the persist config nor the partialize function — they live inside the
  // create() call. Instead, we inline-replicate the same partialize shape and
  // assert the contract: _hasHydrated must NOT appear in the persisted JSON,
  // sessionsCompleted MUST.
  it("persisted JSON has sessionsCompleted but NOT _hasHydrated", () => {
    useKanaProgress.getState().applyAnswer("hiragana", "あ", true);
    useKanaProgress.getState().incrementSessionsCompleted();
    useKanaProgress.getState().setHasHydrated(true);

    const full = useKanaProgress.getState();
    // Replicate the exact partialize from kanaProgress.ts:
    const { _hasHydrated, ...persisted } = full;
    void _hasHydrated;

    const json = JSON.stringify(persisted);
    expect(json).toContain("sessionsCompleted");
    expect(json).toContain("hiragana");
    expect(json).toContain("katakana");
    expect(json).not.toContain("_hasHydrated");
  });
});
