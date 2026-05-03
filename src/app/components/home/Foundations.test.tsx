// @vitest-environment jsdom
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import React from "react";

afterEach(() => cleanup());

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock useKanaProgress so KanaCheckpointNode renders past the hydration skeleton
vi.mock("@/stores/kanaProgress", () => {
  const useKanaProgress = vi.fn((sel: (s: { _hasHydrated: boolean; hiragana: object; katakana: object; sessionsCompleted: number }) => unknown) =>
    sel({ _hasHydrated: true, hiragana: {}, katakana: {}, sessionsCompleted: 0 }),
  );
  return { useKanaProgress };
});

import { Foundations } from "./Foundations";

describe("Foundations", () => {
  it("Test 1: renders 2 KanaCheckpointNode size='home' instances (hiragana + katakana)", () => {
    const { getByTestId } = render(<Foundations />);
    const hira = getByTestId("kana-checkpoint-hiragana");
    const kata = getByTestId("kana-checkpoint-katakana");
    expect(hira).toBeInTheDocument();
    expect(kata).toBeInTheDocument();
    expect(hira.getAttribute("data-size")).toBe("home");
    expect(kata.getAttribute("data-size")).toBe("home");
  });

  it("Test 2: renders SectionHeader 基礎 / Foundations + viewAll=/kana", () => {
    const { getByText } = render(<Foundations />);
    expect(getByText("基礎")).toBeInTheDocument();
    expect(getByText("Foundations")).toBeInTheDocument();
    const viewAll = getByText(/View all/i).closest("a");
    expect(viewAll?.getAttribute("href")).toBe("/kana");
  });

  it("Test 3: root section carries [data-testid='foundations']", () => {
    const { getByTestId } = render(<Foundations />);
    expect(getByTestId("foundations")).toBeInTheDocument();
  });
});
