// @vitest-environment jsdom
/**
 * PathHeader — Phase 14.1 Plan 05 structural tests (SPEC-REQ-2).
 *
 * Asserts: root testid, KitsuBeat wordmark text, LanternStreak composition,
 * streakCurrent threading, and accent-token emphasis on "Beat".
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { PathHeader } from "./PathHeader";

afterEach(() => cleanup());

describe("PathHeader", () => {
  it("renders with data-testid='path-header'", () => {
    const { getByTestId } = render(<PathHeader streakCurrent={5} />);
    expect(getByTestId("path-header")).toBeDefined();
  });

  it("contains 'KitsuBeat' wordmark text", () => {
    const { container } = render(<PathHeader streakCurrent={5} />);
    expect(container.textContent).toContain("KitsuBeat");
  });

  it("composes LanternStreak (data-testid present)", () => {
    const { getByTestId } = render(<PathHeader streakCurrent={5} />);
    expect(getByTestId("lantern-streak")).toBeDefined();
  });

  it("threads streakCurrent into LanternStreak aria-label", () => {
    const { getByLabelText } = render(<PathHeader streakCurrent={42} />);
    expect(getByLabelText("42-day streak")).toBeDefined();
  });

  it("emphasis span 'Beat' carries the accent token reference", () => {
    const { getByTestId } = render(<PathHeader streakCurrent={5} />);
    const emphasis = getByTestId("wordmark-emphasis");
    expect(emphasis.textContent).toBe("Beat");
    expect(emphasis.className).toContain("var(--color-accent)");
  });
});
