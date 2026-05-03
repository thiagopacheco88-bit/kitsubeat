// @vitest-environment jsdom
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CoverCard } from "./CoverCard";

afterEach(() => cleanup());

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [k: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/app/songs/components/SongMasteredBanner", () => ({
  default: () => <div data-testid="song-mastered-banner">MASTERED</div>,
}));

const baseSong = {
  slug: "yoru-ni-kakeru",
  title: "夜に駆ける",
  artist: "YOASOBI",
  anime: "Bessatsu Margaret",
  youtube_id: "x8VYWazR5mE",
  jlpt_level: "N3",
};

describe("CoverCard — anonymous-catalog clean gate (D-14)", () => {
  it("Test 1: showMastery=false hides ALL mastery decorations even at stars=3", () => {
    const { queryByTestId } = render(
      <CoverCard song={baseSong} stars={3} showMastery={false} />,
    );
    expect(queryByTestId("song-mastered-banner")).toBeNull();
    expect(queryByTestId("cover-card-aura")).toBeNull();
    expect(queryByTestId("star-aura")).toBeNull();
  });

  it("Test 2: showMastery=true, stars=3 → banner + ka-aura halo", () => {
    const { getByTestId } = render(
      <CoverCard song={baseSong} stars={3} showMastery={true} />,
    );
    expect(getByTestId("song-mastered-banner")).toBeInTheDocument();
    expect(getByTestId("cover-card-aura")).toBeInTheDocument();
  });

  it("Test 3: showMastery=true, 0<stars<3 → StarAura only, no banner", () => {
    const { getByTestId, queryByTestId } = render(
      <CoverCard song={baseSong} stars={2} showMastery={true} />,
    );
    expect(queryByTestId("song-mastered-banner")).toBeNull();
    expect(queryByTestId("cover-card-aura")).toBeNull();
    expect(getByTestId("star-aura")).toBeInTheDocument();
  });

  it("Test 4: showMastery=true, stars=0 → no decorations", () => {
    const { queryByTestId } = render(
      <CoverCard song={baseSong} stars={0} showMastery={true} />,
    );
    expect(queryByTestId("song-mastered-banner")).toBeNull();
    expect(queryByTestId("cover-card-aura")).toBeNull();
    expect(queryByTestId("star-aura")).toBeNull();
  });

  it("Test 5: youtube_id null → renders placeholder, no broken img", () => {
    const { getByTestId, container } = render(
      <CoverCard
        song={{ ...baseSong, youtube_id: null }}
        stars={0}
        showMastery={false}
      />,
    );
    expect(getByTestId("cover-card-placeholder")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("Test 6: M1 invariant — root <a> clickable, no disabled, no inline pointer-events:none on root; vignette overlay HAS pointer-events:none", () => {
    const { getByTestId, container } = render(
      <CoverCard song={baseSong} stars={3} showMastery={true} />,
    );
    const root = getByTestId(
      `cover-card-${baseSong.slug}`,
    ) as HTMLAnchorElement;
    expect(root.tagName.toLowerCase()).toBe("a");
    expect(root.hasAttribute("disabled")).toBe(false);
    expect(root.style.pointerEvents).not.toBe("none");

    // Vignette overlay should carry pointer-events: none
    const overlays = Array.from(
      container.querySelectorAll('[aria-hidden="true"]'),
    ) as HTMLElement[];
    const vignette = overlays.find(
      (el) =>
        el.style.pointerEvents === "none" &&
        el.style.background?.includes("linear-gradient"),
    );
    expect(vignette).toBeDefined();
  });
});
