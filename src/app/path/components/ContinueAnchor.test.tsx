// @vitest-environment jsdom
/**
 * ContinueAnchor.test.tsx — Phase 14.1 Plan 10.
 *
 * Vitest harness covering:
 * - Visibility logic: null slug, null title, empty title → no render
 * - href correctness
 * - Text content (Continue + song title)
 * - Position class (fixed bottom-0 on wrapper)
 * - Min-height tap-target class (min-h-[56px] on link)
 * - aria-label
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// next/link renders an <a> in test environments
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
    "data-testid": testId,
    "aria-label": ariaLabel,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    "data-testid"?: string;
    "aria-label"?: string;
  }) => (
    <a
      href={href}
      className={className}
      data-testid={testId}
      aria-label={ariaLabel}
    >
      {children}
    </a>
  ),
}));

import { ContinueAnchor } from "./ContinueAnchor";

afterEach(() => cleanup());

describe("ContinueAnchor — Phase 14.1 Plan 10 (SPEC-REQ-8)", () => {
  it("renders nothing when currentSongSlug is null", () => {
    const { container } = render(
      <ContinueAnchor currentSongSlug={null} currentSongTitle="X" />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when currentSongTitle is null", () => {
    const { container } = render(
      <ContinueAnchor currentSongSlug="slug" currentSongTitle={null} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when currentSongTitle is empty string", () => {
    const { container } = render(
      <ContinueAnchor currentSongSlug="slug" currentSongTitle="" />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders with href '/songs/{slug}' when both props valid", () => {
    const { getByTestId } = render(
      <ContinueAnchor
        currentSongSlug="silhouette-kanaboon"
        currentSongTitle="シルエット"
      />,
    );
    const link = getByTestId("continue-anchor");
    expect(link.getAttribute("href")).toBe("/songs/silhouette-kanaboon");
  });

  it("visible text contains 'Continue' and the song title", () => {
    const { container } = render(
      <ContinueAnchor
        currentSongSlug="silhouette-kanaboon"
        currentSongTitle="シルエット"
      />,
    );
    expect(container.textContent).toContain("Continue");
    expect(container.textContent).toContain("シルエット");
  });

  it("CTA element has data-testid='continue-anchor'", () => {
    const { getByTestId } = render(
      <ContinueAnchor currentSongSlug="slug" currentSongTitle="title" />,
    );
    expect(getByTestId("continue-anchor")).toBeInTheDocument();
  });

  it("CTA wrapper carries fixed-bottom-0 positioning utilities", () => {
    const { getByTestId } = render(
      <ContinueAnchor currentSongSlug="slug" currentSongTitle="title" />,
    );
    const link = getByTestId("continue-anchor");
    const wrapper = link.parentElement;
    expect(wrapper?.className).toContain("fixed");
    expect(wrapper?.className).toContain("bottom-0");
  });

  it("CTA link carries min-h-[56px] class for tap-target compliance", () => {
    const { getByTestId } = render(
      <ContinueAnchor currentSongSlug="x" currentSongTitle="y" />,
    );
    expect(getByTestId("continue-anchor").className).toContain("min-h-[56px]");
  });

  it("aria-label on the link includes 'Continue:' and the title", () => {
    const { getByTestId } = render(
      <ContinueAnchor currentSongSlug="x" currentSongTitle="シルエット" />,
    );
    expect(getByTestId("continue-anchor").getAttribute("aria-label")).toBe(
      "Continue: シルエット",
    );
  });
});
