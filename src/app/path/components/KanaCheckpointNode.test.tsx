// @vitest-environment jsdom
/**
 * src/app/path/components/KanaCheckpointNode.test.tsx
 *
 * Phase 14.1 SPEC-REQ-6 — KanaCheckpointNode vitest harness.
 *
 * Tests:
 *   1. Pre-hydration: Skeleton renders, no checkpoint chrome
 *   2. Locked state: empty map -> mist overlay, '霧 · Locked' pill, correct href
 *   3. In-progress state: partial mastery -> percent pill, orange progress bar
 *   4. Mastered state: 42+ chars at 7 stars -> 'Mastered' pill
 *   5. Katakana variant: script='katakana' -> 'ア' glyph, katakana href
 *   6. M1 invariant (locked): link has no `disabled` attr AND no pointer-events:none on link
 *   7. M1 invariant (mist): mist overlay has pointer-events: none
 *   8. a11y: link aria-label describes the state
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { KanaCheckpointNode } from "./KanaCheckpointNode";

// Mock useKanaProgress — controllable per test
vi.mock("@/stores/kanaProgress", () => ({
  useKanaProgress: vi.fn(),
}));
import { useKanaProgress } from "@/stores/kanaProgress";

afterEach(() => cleanup());

const mockStore = (state: {
  _hasHydrated: boolean;
  hiragana?: Record<string, number>;
  katakana?: Record<string, number>;
}) => {
  // useKanaProgress is called with a selector; the mock returns selector(state)
  vi.mocked(useKanaProgress).mockImplementation((sel: any) =>
    sel({
      _hasHydrated: state._hasHydrated,
      hiragana: state.hiragana ?? {},
      katakana: state.katakana ?? {},
      sessionsCompleted: 0,
    } as any),
  );
};

describe("KanaCheckpointNode", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Test 1: renders Skeleton pre-hydration, no checkpoint chrome", () => {
    mockStore({ _hasHydrated: false });
    const { getByTestId, queryByTestId } = render(
      <KanaCheckpointNode script="hiragana" />,
    );
    expect(getByTestId("kana-checkpoint-skeleton-hiragana")).toBeDefined();
    expect(queryByTestId("kana-checkpoint-hiragana")).toBeNull();
  });

  it("Test 2: renders locked state for empty map", () => {
    mockStore({ _hasHydrated: true, hiragana: {} });
    const { getByTestId, container } = render(
      <KanaCheckpointNode script="hiragana" />,
    );
    expect(getByTestId("kana-checkpoint-hiragana")).toBeDefined();
    expect(getByTestId("kana-checkpoint-mist-hiragana")).toBeDefined();
    expect(container.textContent).toContain("霧");
    expect(container.textContent).toContain("Locked");
    const link = getByTestId("kana-checkpoint-hiragana");
    expect(link.getAttribute("href")).toBe("/kana?script=hiragana");
    expect(link.getAttribute("data-state")).toBe("locked");
  });

  it("Test 3: renders in-progress state with percent pill", () => {
    mockStore({ _hasHydrated: true, hiragana: { あ: 7, い: 7 } });
    const { getByTestId, container } = render(
      <KanaCheckpointNode script="hiragana" />,
    );
    const link = getByTestId("kana-checkpoint-hiragana");
    expect(link.getAttribute("data-state")).toBe("in-progress");
    // 2/46 = 4.34..., Math.round -> 4%
    expect(container.textContent).toMatch(/\d+%/);
  });

  it("Test 4: renders mastered state when 42+ chars at threshold", () => {
    // Construct 42 hiragana keys at 7 stars (>= ceil(0.9 * 46) = 42 required)
    const masteredMap: Record<string, number> = {};
    // Well-known basic 46 gojuon hiragana in order
    const basicHiragana =
      "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";
    for (let i = 0; i < 42; i++) {
      masteredMap[basicHiragana[i]] = 7;
    }
    mockStore({ _hasHydrated: true, hiragana: masteredMap });
    const { getByTestId, container } = render(
      <KanaCheckpointNode script="hiragana" />,
    );
    expect(
      getByTestId("kana-checkpoint-hiragana").getAttribute("data-state"),
    ).toBe("mastered");
    expect(container.textContent).toContain("Mastered");
  });

  it("Test 5: renders katakana glyph and href when script='katakana'", () => {
    mockStore({ _hasHydrated: true, katakana: {} });
    const { getByTestId, container } = render(
      <KanaCheckpointNode script="katakana" />,
    );
    expect(container.textContent).toContain("ア");
    expect(container.textContent).toContain("Katakana");
    expect(
      getByTestId("kana-checkpoint-katakana").getAttribute("href"),
    ).toBe("/kana?script=katakana");
  });

  it("Test 6: M1 invariant — link has no disabled attr in locked state", () => {
    mockStore({ _hasHydrated: true, hiragana: {} });
    const { getByTestId } = render(
      <KanaCheckpointNode script="hiragana" />,
    );
    const link = getByTestId("kana-checkpoint-hiragana");
    expect(link.hasAttribute("disabled")).toBe(false);
    // Inline style should NOT have pointer-events: none on the link itself
    expect(link.getAttribute("style") ?? "").not.toMatch(
      /pointer-events\s*:\s*none/,
    );
  });

  it("Test 7: M1 invariant — mist overlay has pointer-events: none", () => {
    mockStore({ _hasHydrated: true, hiragana: {} });
    const { getByTestId } = render(
      <KanaCheckpointNode script="hiragana" />,
    );
    const mist = getByTestId("kana-checkpoint-mist-hiragana");
    expect(mist.getAttribute("style") ?? "").toMatch(
      /pointer-events\s*:\s*none/,
    );
  });

  it("Test 8: a11y — link aria-label describes the state", () => {
    mockStore({ _hasHydrated: true, hiragana: {} });
    const { getByLabelText } = render(<KanaCheckpointNode script="hiragana" />);
    expect(getByLabelText(/Hiragana checkpoint.*locked/i)).toBeDefined();
  });
});
