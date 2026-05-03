// @vitest-environment jsdom
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { AnimeCard } from "./AnimeCard";

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

describe("AnimeCard", () => {
  it("Test 1: renders Japanese name with var(--font-jp) inline style + song-count testid renders integer", () => {
    const { getByText, getByTestId } = render(
      <AnimeCard anime="Frieren" nameJp="葬送のフリーレン" songCount={5} />,
    );
    const jp = getByText("葬送のフリーレン");
    expect(jp.style.fontFamily).toBe("var(--font-jp)");

    // Per revision: songCount integer renders inside [data-testid="anime-card-song-count"]
    const count = getByTestId("anime-card-song-count");
    expect(count.textContent).toContain("5");
    expect(count.textContent).not.toContain("0 songs");
  });

  it("Test 2: link href = /songs?search={encoded-anime}", () => {
    const { getByTestId } = render(
      <AnimeCard anime="Frieren" nameJp="葬送のフリーレン" songCount={5} />,
    );
    const link = getByTestId("anime-card-Frieren") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/songs?search=Frieren");
  });

  it("Test 3: encodeURIComponent escapes special chars", () => {
    const { getByTestId } = render(
      <AnimeCard anime="Re:Zero" nameJp="リゼロ" songCount={3} />,
    );
    const link = getByTestId("anime-card-Re:Zero") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/songs?search=Re%3AZero");
  });

  it("Test 4: no images → renders placeholder, no broken img", () => {
    const { getByTestId, container } = render(
      <AnimeCard anime="X" nameJp="エックス" songCount={1} />,
    );
    expect(getByTestId("anime-card-placeholder")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("Test 5: M1 invariant — root <a>, 130×130, no disabled, vignette overlay non-interactive", () => {
    const { getByTestId, container } = render(
      <AnimeCard
        anime="Frieren"
        nameJp="葬送のフリーレン"
        songCount={5}
        coverImage="https://example.com/x.jpg"
      />,
    );
    const root = getByTestId("anime-card-Frieren") as HTMLAnchorElement;
    expect(root.tagName.toLowerCase()).toBe("a");
    expect(root.hasAttribute("disabled")).toBe(false);
    expect(root.style.pointerEvents).not.toBe("none");

    // Check dimensions via inline style (same pattern as CoverCard)
    expect(root.style.width).toBe("130px");
    expect(root.style.height).toBe("130px");

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
