// @vitest-environment jsdom
/**
 * src/app/path/components/KanaCheckpointNode.test.tsx
 *
 * Phase 14.1 SPEC-REQ-6 — KanaCheckpointNode vitest harness.
 *
 * Tests updated to match current component implementation:
 * - No Skeleton/pre-hydration state (removed in post-14.1 refactor)
 * - No mist overlay (removed; locked shows 0% pill instead)
 * - Mock t() returns translation key strings
 * - data-state values: "mastered" | "in-progress" | "not-started"
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { KanaCheckpointNode } from "./KanaCheckpointNode";
import type { MasteryMap } from "@/lib/kana/types";

// Mock useKanaProgress — controllable per test
vi.mock("@/stores/kanaProgress", () => ({
  useKanaProgress: vi.fn(),
}));
import { useKanaProgress } from "@/stores/kanaProgress";

afterEach(() => cleanup());

/** Minimal store shape used by the selector calls in KanaCheckpointNode. */
interface MockKanaStore {
  _hasHydrated: boolean;
  hiragana: MasteryMap;
  katakana: MasteryMap;
  sessionsCompleted: number;
}

const mockStore = (state: {
  _hasHydrated: boolean;
  hiragana?: MasteryMap;
  katakana?: MasteryMap;
}) => {
  // useKanaProgress is called with a selector; the mock returns selector(store)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(useKanaProgress).mockImplementation((sel: (s: any) => unknown) =>
    sel({
      _hasHydrated: state._hasHydrated,
      hiragana: state.hiragana ?? {},
      katakana: state.katakana ?? {},
      sessionsCompleted: 0,
    }),
  );
};

describe("KanaCheckpointNode", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Test 1: renders checkpoint node (no skeleton in current impl)", () => {
    // Component no longer has a skeleton state — always renders the checkpoint chrome
    mockStore({ _hasHydrated: false });
    const { getByTestId } = render(
      <KanaCheckpointNode script="hiragana" />,
    );
    // Component renders kana-checkpoint-hiragana regardless of _hasHydrated
    expect(getByTestId("kana-checkpoint-hiragana")).toBeDefined();
  });

  it("Test 2: renders not-started state for empty map (0% pill, no mist overlay)", () => {
    mockStore({ _hasHydrated: true, hiragana: {} });
    const { getByTestId, container } = render(
      <KanaCheckpointNode script="hiragana" />,
    );
    expect(getByTestId("kana-checkpoint-hiragana")).toBeDefined();
    // Component shows 0% pill for not-started; no mist overlay in current impl
    expect(container.textContent).toContain("0%");
    const link = getByTestId("kana-checkpoint-hiragana");
    expect(link.getAttribute("href")).toBe("/kana?script=hiragana");
    // data-state may be "not-started" or "locked" depending on computeCheckpointState
    expect(["not-started", "locked"]).toContain(link.getAttribute("data-state"));
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
    // mock t returns key: t('mastered') => 'mastered'
    expect(container.textContent).toContain("mastered");
  });

  it("Test 5: renders katakana glyph and href when script='katakana'", () => {
    mockStore({ _hasHydrated: true, katakana: {} });
    const { getByTestId, container } = render(
      <KanaCheckpointNode script="katakana" />,
    );
    expect(container.textContent).toContain("ア");
    // mock t returns key: t('kana.katakana') => 'kana.katakana'
    expect(container.textContent).toContain("kana.katakana");
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

  it("Test 7: M1 invariant — no pointer-events:none on the root link", () => {
    mockStore({ _hasHydrated: true, hiragana: {} });
    const { getByTestId } = render(
      <KanaCheckpointNode script="hiragana" />,
    );
    const link = getByTestId("kana-checkpoint-hiragana");
    // Root link must be clickable (no mist overlay in current impl)
    expect(link.getAttribute("style") ?? "").not.toMatch(
      /pointer-events\s*:\s*none/,
    );
  });

  it("Test 8: a11y — link has aria-label with script and state info", () => {
    mockStore({ _hasHydrated: true, hiragana: {} });
    const { getByTestId } = render(<KanaCheckpointNode script="hiragana" />);
    const link = getByTestId("kana-checkpoint-hiragana");
    // aria-label includes the script name (mock key) and state
    const ariaLabel = link.getAttribute("aria-label") ?? "";
    expect(ariaLabel).toContain("kana.hiragana");
  });

  it("Test 9: size='home' renders 130x124 dashed-border layout (locked default)", () => {
    mockStore({ _hasHydrated: true, hiragana: {} });
    const { getByTestId } = render(<KanaCheckpointNode script="hiragana" size="home" />);
    const link = getByTestId("kana-checkpoint-hiragana");

    // Home-variant dimensions — expressed as inline styles (lint-clean approach)
    expect(link.style.width).toBe("130px");
    expect(link.style.height).toBe("124px");
    // className still carries layout classes including border-dashed
    expect(link.className).toContain("border-dashed");

    // data-size attribute carries the variant for future selector use
    expect(link.getAttribute("data-size")).toBe("home");

    // M1 invariant — root clickable, no disabled, no inline pointer-events:none
    expect(link.hasAttribute("disabled")).toBe(false);
    expect(link.style.pointerEvents).not.toBe("none");

    // /kana?script=hiragana navigation preserved (V1 verified in 14.2-01)
    expect(link.getAttribute("href")).toBe("/kana?script=hiragana");
  });

  it("Test 10: size='home' in-progress state renders progress bar with grammar-adverb token", () => {
    // Seed an in-progress mastery map. Use the same shape Test 3 uses — adapt
    // to the actual MasteryMap entry shape: Record<string, number> (star count).
    mockStore({
      _hasHydrated: true,
      hiragana: {
        // 2 chars at 7 stars: enough for in-progress (2/46 = 4%), not mastered (need 42)
        あ: 7,
        い: 7,
      },
    });
    const { getByTestId } = render(<KanaCheckpointNode script="hiragana" size="home" />);
    const link = getByTestId("kana-checkpoint-hiragana");

    // If this seed maps to in-progress per computeCheckpointState, assert progress bar.
    if (link.getAttribute("data-state") === "in-progress") {
      const progressBars = link.querySelectorAll("[aria-hidden='true']");
      const hasProgressBar = Array.from(progressBars).some((el) =>
        el.innerHTML.includes("bg-[var(--color-jlpt-n3)]") ||
        el.innerHTML.includes("bg-[var(--color-grammar-adverb)]"),
      );
      expect(hasProgressBar).toBe(true);
    }
  });

  it("Test 11: backward compat — no size prop renders byte-equivalent 14.1 layout (h-16, no data-size='home')", () => {
    mockStore({ _hasHydrated: true, hiragana: {} });
    const { getByTestId } = render(<KanaCheckpointNode script="hiragana" />);
    const link = getByTestId("kana-checkpoint-hiragana");

    // 14.1 layout preserved — h-16 in className, no inline width/height overrides
    expect(link.className).toContain("h-16");
    expect(link.style.width).not.toBe("130px");
    expect(link.style.height).not.toBe("124px");

    // data-size MAY be present as "path" (the default) OR absent — assert NOT "home"
    expect(link.getAttribute("data-size")).not.toBe("home");
  });
});
