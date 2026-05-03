// @vitest-environment jsdom
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Carousel } from "./Carousel";

afterEach(() => cleanup());

describe("Carousel", () => {
  it("Test 1: renders children", () => {
    const { getByTestId } = render(
      <Carousel>
        <div data-testid="child-a">A</div>
        <div data-testid="child-b">B</div>
      </Carousel>,
    );
    expect(getByTestId("child-a")).toBeInTheDocument();
    expect(getByTestId("child-b")).toBeInTheDocument();
  });

  it("Test 2: root has scroll-snap CSS classes (flex / overflow / snap / gap)", () => {
    const { container } = render(
      <Carousel testId="t">
        <div>x</div>
      </Carousel>,
    );
    const root = container.querySelector('[data-testid="t"]')!;
    expect(root.className).toContain("flex");
    expect(root.className).toContain("gap-3");
    expect(root.className).toContain("overflow-x-auto");
    expect(root.className).toContain("snap-x");
    expect(root.className).toContain("snap-mandatory");
  });

  it("Test 3: testId prop renders as data-testid on root", () => {
    const { container } = render(
      <Carousel testId="continue-carousel">
        <div>x</div>
      </Carousel>,
    );
    const root = container.querySelector('[data-testid="continue-carousel"]');
    expect(root).not.toBeNull();
  });

  it("Test 4: ariaLabel prop renders as aria-label on root", () => {
    const { container } = render(
      <Carousel ariaLabel="Browse by anime" testId="t">
        <div>x</div>
      </Carousel>,
    );
    const root = container.querySelector('[data-testid="t"]');
    expect(root?.getAttribute("aria-label")).toBe("Browse by anime");
    expect(root?.getAttribute("role")).toBe("region");
  });

  it("Test 5: M1 invariant — no disabled attr, no inline pointer-events:none on root", () => {
    const { container } = render(
      <Carousel testId="t">
        <div>x</div>
      </Carousel>,
    );
    const root = container.querySelector('[data-testid="t"]') as HTMLElement;
    expect(root.hasAttribute("disabled")).toBe(false);
    expect(root.style.pointerEvents).not.toBe("none");
  });
});
