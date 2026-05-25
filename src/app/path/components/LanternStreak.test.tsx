// @vitest-environment jsdom
/**
 * LanternStreak — updated for PNG icon + CSS tooltip (streak label tiers).
 *
 * Old SVG-specific tests (lantern-flame opacity, ka-flicker) removed —
 * component now uses <Image> and a group-hover tooltip instead.
 *
 * Tiers:
 *   count < 7   -> dim     (opacity 0.55, plain label)
 *   7 <= n < 30 -> warm    (opacity 0.80, "keep it up!")
 *   count >= 30 -> blazing (opacity 1.0,  "on fire!")
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { LanternStreak } from "./LanternStreak";

afterEach(() => cleanup());

describe("LanternStreak — accessibility", () => {
  it("aria-label includes the streak count", () => {
    const { getByLabelText } = render(<LanternStreak count={42} />);
    expect(getByLabelText("42-day streak")).toBeDefined();
  });

  it("aria-label works for count=1", () => {
    const { getByLabelText } = render(<LanternStreak count={1} />);
    expect(getByLabelText("1-day streak")).toBeDefined();
  });
});

describe("LanternStreak — W-5 dual testid discipline (Plan 12 mask hooks)", () => {
  it("count <span> exposes data-testid='lantern-streak-count' for Plan 12 mask", () => {
    const { getByTestId } = render(<LanternStreak count={42} />);
    const countEl = getByTestId("lantern-streak-count");
    expect(countEl.tagName).toBe("SPAN");
    expect(countEl.textContent).toBe("42");
    // The count testid must NOT be the same element as the root testid
    const rootEl = getByTestId("lantern-streak");
    expect(rootEl).not.toBe(countEl);
    // The count is INSIDE the root.
    expect(rootEl.contains(countEl)).toBe(true);
  });
});

describe("LanternStreak — tooltip label tiers", () => {
  it("shows plain label for dim tier (count < 7)", () => {
    const { getByTestId } = render(<LanternStreak count={3} />);
    const tooltip = getByTestId("lantern-streak").querySelector("[aria-hidden='true']:last-child");
    expect(tooltip?.textContent).toBe("🏮 3-day streak");
  });

  it("shows 'keep it up' for warm tier (count 7–29)", () => {
    const { getByTestId } = render(<LanternStreak count={15} />);
    const tooltip = getByTestId("lantern-streak").querySelector("[aria-hidden='true']:last-child");
    expect(tooltip?.textContent).toBe("🏮 15-day streak — keep it up!");
  });

  it("shows 'on fire' for blazing tier (count >= 30)", () => {
    const { getByTestId } = render(<LanternStreak count={60} />);
    const tooltip = getByTestId("lantern-streak").querySelector("[aria-hidden='true']:last-child");
    expect(tooltip?.textContent).toBe("🔥 60-day streak — on fire!");
  });

  it("blazing tier boundary at count=30", () => {
    const { getByTestId } = render(<LanternStreak count={30} />);
    const tooltip = getByTestId("lantern-streak").querySelector("[aria-hidden='true']:last-child");
    expect(tooltip?.textContent).toBe("🔥 30-day streak — on fire!");
  });

  it("warm tier boundary at count=7", () => {
    const { getByTestId } = render(<LanternStreak count={7} />);
    const tooltip = getByTestId("lantern-streak").querySelector("[aria-hidden='true']:last-child");
    expect(tooltip?.textContent).toBe("🏮 7-day streak — keep it up!");
  });
});
