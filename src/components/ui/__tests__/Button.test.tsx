// @vitest-environment jsdom
/**
 * Phase 14 Plan 14-02 — Button primitive variant rendering tests.
 *
 * Asserts the 3×3 variant×size matrix (primary|secondary|ghost × sm|md|lg)
 * + onClick forwarding + disabled prop + custom className merging.
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Button } from "../Button";

afterEach(() => cleanup());

describe("Button primitive — variants", () => {
  it("renders primary variant with bg-accent + shadow-button-red token classes", () => {
    render(<Button variant="primary">Go</Button>);
    const btn = screen.getByRole("button", { name: "Go" });
    expect(btn.className).toMatch(/bg-\[var\(--color-accent\)\]/);
    expect(btn.className).toMatch(/shadow-\[var\(--shadow-button-red\)\]/);
  });

  it("renders secondary variant with border + bg-card-2 token classes", () => {
    render(<Button variant="secondary">Cancel</Button>);
    const btn = screen.getByRole("button", { name: "Cancel" });
    expect(btn.className).toMatch(/bg-\[var\(--color-card-2\)\]/);
    expect(btn.className).toMatch(/border/);
  });

  it("renders ghost variant with no bg utility", () => {
    render(<Button variant="ghost">Dismiss</Button>);
    const btn = screen.getByRole("button", { name: "Dismiss" });
    // Ghost should not have a primary bg-accent or bg-card-2 baseline
    expect(btn.className).not.toMatch(/bg-\[var\(--color-accent\)\](?!\/)/);
    expect(btn.className).toMatch(/text-\[var\(--color-text-muted\)\]/);
  });
});

describe("Button primitive — sizes", () => {
  it("renders sm size with h-9 px-3 + min-h-[44px] tap target", () => {
    render(
      <Button size="sm" variant="primary">
        sm
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "sm" });
    expect(btn.className).toMatch(/h-9/);
    expect(btn.className).toMatch(/px-3/);
    expect(btn.className).toMatch(/min-h-\[44px\]/);
  });

  it("renders md size with h-11 px-4 + min-h-[44px] tap target", () => {
    render(
      <Button size="md" variant="primary">
        md
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "md" });
    expect(btn.className).toMatch(/h-11/);
    expect(btn.className).toMatch(/px-4/);
    expect(btn.className).toMatch(/min-h-\[44px\]/);
  });

  it("renders lg size with h-12 px-6 text-lg + min-h-[44px] tap target", () => {
    render(
      <Button size="lg" variant="primary">
        lg
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "lg" });
    expect(btn.className).toMatch(/h-12/);
    expect(btn.className).toMatch(/px-6/);
    expect(btn.className).toMatch(/text-lg/);
    expect(btn.className).toMatch(/min-h-\[44px\]/);
  });
});

describe("Button primitive — behavior", () => {
  it("forwards onClick handler", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Click" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("respects disabled prop (opacity-50 + pointer-events-none)", () => {
    render(<Button disabled>Off</Button>);
    const btn = screen.getByRole("button", { name: "Off" });
    expect(btn).toBeDisabled();
    expect(btn.className).toMatch(/disabled:opacity-50/);
    expect(btn.className).toMatch(/disabled:pointer-events-none/);
  });

  it("merges custom className via twMerge (rounded-full overrides default radius)", () => {
    render(
      <Button className="rounded-full" size="md">
        Pill
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Pill" });
    // twMerge should drop rounded-[var(--radius-md)] in favor of rounded-full
    expect(btn.className).toMatch(/rounded-full/);
    expect(btn.className).not.toMatch(/rounded-\[var\(--radius-md\)\]/);
  });
});
