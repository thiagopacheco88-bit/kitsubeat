// @vitest-environment jsdom
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ContinueCard } from "./ContinueCard";

afterEach(() => cleanup());

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/app/songs/components/SongMasteredBanner", () => ({
  default: () => <div data-testid="song-mastered-banner-mock">MASTERED</div>,
}));

const baseProps = {
  slug: "yoru-ni-kakeru",
  title: "夜に駆ける",
  anime: "Bessatsu Margaret",
  youtube_id: "x8VYWazR5mE",
};

describe("ContinueCard - progress bar clamp (D-02)", () => {
  it("Test 1: completion_pct=0.005 -> width clamps to 1% (floor)", () => {
    const { getByTestId } = render(
      <ContinueCard {...baseProps} completion_pct={0.005} />,
    );
    const fill = getByTestId("continue-card-progress-fill") as HTMLElement;
    expect(fill.style.width).toBe("1%");
  });

  it("Test 2: completion_pct=1.5 -> width clamps to 100% (ceiling)", () => {
    const { getByTestId } = render(
      <ContinueCard {...baseProps} completion_pct={1.5} />,
    );
    const fill = getByTestId("continue-card-progress-fill") as HTMLElement;
    expect(fill.style.width).toBe("100%");
  });

  it("Test 3: completion_pct=0.33 -> width = 33%", () => {
    const { getByTestId } = render(
      <ContinueCard {...baseProps} completion_pct={0.33} />,
    );
    const fill = getByTestId("continue-card-progress-fill") as HTMLElement;
    expect(fill.style.width).toBe("33%");
  });

  it("Test 4: ka-pulse PLAY overlay rendered with correct testid + class", () => {
    const { getByTestId } = render(
      <ContinueCard {...baseProps} completion_pct={0.5} />,
    );
    const overlay = getByTestId("continue-card-play-overlay");
    expect(overlay.className).toContain("ka-pulse");
  });

  it("Test 5: link href = /songs/{slug}; Japanese title uses var(--font-jp)", () => {
    const { getByTestId } = render(
      <ContinueCard {...baseProps} completion_pct={0.5} />,
    );
    const root = getByTestId(`continue-card-${baseProps.slug}`) as HTMLAnchorElement;
    expect(root.tagName.toLowerCase()).toBe("a");
    expect(root.getAttribute("href")).toBe(`/songs/${baseProps.slug}`);

    const titleJp = getByTestId("continue-card-title-jp") as HTMLElement;
    expect(titleJp.style.fontFamily).toBe("var(--font-jp)");
  });

  it("Test 6: M1 invariant - root no disabled / no pointer-events:none on root; overlays HAVE pointer-events:none", () => {
    const { getByTestId, container } = render(
      <ContinueCard {...baseProps} completion_pct={0.5} />,
    );
    const root = getByTestId(`continue-card-${baseProps.slug}`) as HTMLAnchorElement;
    expect(root.hasAttribute("disabled")).toBe(false);
    expect(root.style.pointerEvents).not.toBe("none");

    // ka-pulse overlay carries pointer-events-none class OR style
    const playOverlay = getByTestId("continue-card-play-overlay");
    const hasPenNone =
      playOverlay.className.includes("pointer-events-none") ||
      (playOverlay as HTMLElement).style.pointerEvents === "none";
    expect(hasPenNone).toBe(true);

    // Vignette has pointer-events: none
    const overlays = Array.from(
      container.querySelectorAll('[aria-hidden="true"]'),
    ) as HTMLElement[];
    const vignette = overlays.find(
      (el) => el.style.pointerEvents === "none" && el.style.background?.includes("linear-gradient"),
    );
    expect(vignette).toBeDefined();
  });

  it("Test 7: D-14 - stars=3 renders ribbon + aura + ka-aura halo class on root", () => {
    const { getByTestId } = render(
      <ContinueCard {...baseProps} completion_pct={0.66} stars={3} />,
    );
    // 3-star ribbon present
    const ribbon = getByTestId("continue-card-stars");
    expect(ribbon).toBeInTheDocument();
    // StarAura present
    const aura = getByTestId("continue-card-aura");
    expect(aura).toBeInTheDocument();
    // ka-aura halo class on root
    const root = getByTestId(`continue-card-${baseProps.slug}`);
    expect(root.className).toContain("ka-aura");
  });

  it("Test 8: D-14 - 0<stars<3 renders StarAura only (no ribbon, no halo on root)", () => {
    const { getByTestId, queryByTestId } = render(
      <ContinueCard {...baseProps} completion_pct={0.5} stars={2} />,
    );
    // No 3-star ribbon
    expect(queryByTestId("continue-card-stars")).toBeNull();
    // StarAura present (partial)
    const aura = getByTestId("continue-card-aura");
    expect(aura).toBeInTheDocument();
    // Root className does NOT contain ka-aura halo (halo is mastery-only)
    const root = getByTestId(`continue-card-${baseProps.slug}`);
    expect(root.className).not.toContain("ka-aura");
  });

  it("Test 9: D-14 - stars=0 OR undefined renders NO decorations", () => {
    // stars=0 explicit
    const { queryByTestId, getByTestId } = render(
      <ContinueCard {...baseProps} completion_pct={0.4} stars={0} />,
    );
    expect(queryByTestId("continue-card-stars")).toBeNull();
    expect(queryByTestId("continue-card-aura")).toBeNull();
    const root = getByTestId(`continue-card-${baseProps.slug}`);
    expect(root.className).not.toContain("ka-aura");

    // stars undefined (no prop) — same result
    cleanup();
    const result2 = render(<ContinueCard {...baseProps} completion_pct={0.4} />);
    expect(result2.queryByTestId("continue-card-stars")).toBeNull();
    expect(result2.queryByTestId("continue-card-aura")).toBeNull();
    const root2 = result2.getByTestId(`continue-card-${baseProps.slug}`);
    expect(root2.className).not.toContain("ka-aura");
  });
});
