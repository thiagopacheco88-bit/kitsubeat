// @vitest-environment jsdom
/**
 * LanternStreak — Phase 14.1 Plan 04 — opacity-tier + a11y + W-5 dual testid coverage.
 *
 * Tiers (CONTEXT Specifics):
 *   count < 7   -> dim     (flame opacity 0.45)
 *   7 <= n < 30 -> warm    (flame opacity 0.70)
 *   count >= 30 -> blazing (flame opacity 1.0)
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { LanternStreak } from "./LanternStreak";

afterEach(() => cleanup());

describe("LanternStreak — opacity tiers", () => {
  it("flame opacity is 0.45 at count=3 (dim tier)", () => {
    const { getByTestId } = render(<LanternStreak count={3} />);
    expect(getByTestId("lantern-flame").getAttribute("opacity")).toBe("0.45");
  });

  it("flame opacity is 0.7 at count=15 (warm tier)", () => {
    const { getByTestId } = render(<LanternStreak count={15} />);
    expect(getByTestId("lantern-flame").getAttribute("opacity")).toBe("0.7");
  });

  it("flame opacity is 1 at count=60 (blazing tier)", () => {
    const { getByTestId } = render(<LanternStreak count={60} />);
    const opacity = getByTestId("lantern-flame").getAttribute("opacity");
    expect(opacity === "1" || opacity === "1.0").toBe(true);
  });

  it("flame opacity flips to 0.7 exactly at count=7 (warm boundary)", () => {
    const { getByTestId } = render(<LanternStreak count={7} />);
    expect(getByTestId("lantern-flame").getAttribute("opacity")).toBe("0.7");
  });

  it("flame opacity flips to 1 exactly at count=30 (blazing boundary)", () => {
    const { getByTestId } = render(<LanternStreak count={30} />);
    const opacity = getByTestId("lantern-flame").getAttribute("opacity");
    expect(opacity === "1" || opacity === "1.0").toBe(true);
  });
});

describe("LanternStreak — accessibility", () => {
  it("aria-label includes the streak count", () => {
    const { getByLabelText } = render(<LanternStreak count={42} />);
    expect(getByLabelText("42-day streak")).toBeDefined();
  });

  it("flame ellipse carries ka-flicker class for Plan 01 keyframe hook", () => {
    const { getByTestId } = render(<LanternStreak count={1} />);
    expect(getByTestId("lantern-flame").classList.contains("ka-flicker")).toBe(true);
  });
});

describe("LanternStreak — W-5 dual testid discipline (Plan 12 mask hooks)", () => {
  it("count <span> exposes data-testid='lantern-streak-count' for Plan 12 mask", () => {
    const { getByTestId } = render(<LanternStreak count={42} />);
    const countEl = getByTestId("lantern-streak-count");
    expect(countEl.tagName).toBe("SPAN");
    expect(countEl.textContent).toBe("42");
    // The count testid must NOT be the same element as the root testid —
    // they're distinct nodes (root wraps SVG + count; count is a child <span>).
    const rootEl = getByTestId("lantern-streak");
    expect(rootEl).not.toBe(countEl);
    // The count is INSIDE the root.
    expect(rootEl.contains(countEl)).toBe(true);
  });
});
