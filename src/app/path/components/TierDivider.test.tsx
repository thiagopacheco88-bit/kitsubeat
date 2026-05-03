// @vitest-environment jsdom
/**
 * TierDivider — Phase 14.1 Plan 07 — 3-tier label + icon + aria-label + fallback.
 *
 * Bilingual labels (CONTEXT Specifics):
 *   basic        -> "Side A · 基礎 · Beginner"    (bamboo icon)
 *   intermediate -> "Side B · 中級 · Intermediate" (torii icon)
 *   advanced     -> "Side C · 上級 · Advanced"     (mountain icon)
 *   unknown      -> graceful fallback (no icon, no crash)
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { TierDivider } from "./TierDivider";

afterEach(() => cleanup());

describe("TierDivider — bilingual label text", () => {
  it("renders 'Side A', '基礎', and 'Beginner' for tier='basic'", () => {
    const { container } = render(<TierDivider tier="basic" />);
    expect(container.textContent).toContain("Side A");
    expect(container.textContent).toContain("基礎");
    expect(container.textContent).toContain("Beginner");
  });

  it("renders 'Side B', '中級', and 'Intermediate' for tier='intermediate'", () => {
    const { container } = render(<TierDivider tier="intermediate" />);
    expect(container.textContent).toContain("Side B");
    expect(container.textContent).toContain("中級");
    expect(container.textContent).toContain("Intermediate");
  });

  it("renders 'Side C', '上級', and 'Advanced' for tier='advanced'", () => {
    const { container } = render(<TierDivider tier="advanced" />);
    expect(container.textContent).toContain("Side C");
    expect(container.textContent).toContain("上級");
    expect(container.textContent).toContain("Advanced");
  });
});

describe("TierDivider — tier-specific SVG icons", () => {
  it("includes bamboo icon (data-testid='tier-icon-bamboo') for tier='basic'", () => {
    const { getByTestId } = render(<TierDivider tier="basic" />);
    expect(getByTestId("tier-icon-bamboo")).toBeDefined();
  });

  it("includes torii icon (data-testid='tier-icon-torii') for tier='intermediate'", () => {
    const { getByTestId } = render(<TierDivider tier="intermediate" />);
    expect(getByTestId("tier-icon-torii")).toBeDefined();
  });

  it("includes mountain icon (data-testid='tier-icon-mountain') for tier='advanced'", () => {
    const { getByTestId } = render(<TierDivider tier="advanced" />);
    expect(getByTestId("tier-icon-mountain")).toBeDefined();
  });
});

describe("TierDivider — aria-label (full bilingual text for screen readers)", () => {
  it("aria-label carries full 'Side A · 基礎 · Beginner' for tier='basic'", () => {
    const { getByLabelText } = render(<TierDivider tier="basic" />);
    expect(getByLabelText("Side A · 基礎 · Beginner")).toBeDefined();
  });

  it("aria-label carries full 'Side B · 中級 · Intermediate' for tier='intermediate'", () => {
    const { getByLabelText } = render(<TierDivider tier="intermediate" />);
    expect(getByLabelText("Side B · 中級 · Intermediate")).toBeDefined();
  });

  it("aria-label carries full 'Side C · 上級 · Advanced' for tier='advanced'", () => {
    const { getByLabelText } = render(<TierDivider tier="advanced" />);
    expect(getByLabelText("Side C · 上級 · Advanced")).toBeDefined();
  });
});

describe("TierDivider — graceful fallback for unknown tier", () => {
  it("renders the input string as label for unknown tier (no crash)", () => {
    const { container } = render(<TierDivider tier="unknown" />);
    expect(container.textContent).toContain("unknown");
  });

  it("does NOT render any tier-icon SVG for unknown tier", () => {
    const { container } = render(<TierDivider tier="unknown" />);
    expect(container.querySelector('[data-testid^="tier-icon-"]')).toBeNull();
  });
});
