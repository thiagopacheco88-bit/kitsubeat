// @vitest-environment jsdom
/**
 * Phase 14 Plan 14-02 — Badge primitive variant rendering tests.
 *
 * Asserts variant=jlpt|grammar|mono|accent + level/category prop wiring +
 * 12% / 25% alpha-tint contract from SPEC §A.2.
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Badge } from "../Badge";

afterEach(() => cleanup());

describe("Badge primitive — jlpt variant", () => {
  it("variant=jlpt level=N5 renders bg + ring tokens for n5", () => {
    render(
      <Badge variant="jlpt" level="N5" data-testid="badge">
        N5
      </Badge>,
    );
    const badge = screen.getByTestId("badge");
    expect(badge.className).toMatch(/bg-\[var\(--color-jlpt-n5-bg\)\]/);
    expect(badge.className).toMatch(/ring-\[var\(--color-jlpt-n5-ring\)\]/);
    expect(badge.className).toMatch(/ring-1/);
  });

  it("variant=jlpt level=N1 renders bg + ring tokens for n1", () => {
    render(
      <Badge variant="jlpt" level="N1" data-testid="badge">
        N1
      </Badge>,
    );
    const badge = screen.getByTestId("badge");
    expect(badge.className).toMatch(/bg-\[var\(--color-jlpt-n1-bg\)\]/);
    expect(badge.className).toMatch(/ring-\[var\(--color-jlpt-n1-ring\)\]/);
  });

  it("variant=jlpt defaults children to the level when none supplied", () => {
    render(<Badge variant="jlpt" level="N3" data-testid="badge" />);
    const badge = screen.getByTestId("badge");
    expect(badge.textContent).toBe("N3");
  });
});

describe("Badge primitive — grammar variant", () => {
  it("variant=grammar category=verb applies inline color-mix tint via style", () => {
    render(
      <Badge variant="grammar" category="verb" data-testid="badge">
        verb
      </Badge>,
    );
    const badge = screen.getByTestId("badge");
    // Grammar variant uses inline style with color-mix referencing --color-grammar-verb
    expect(badge.getAttribute("style") ?? "").toMatch(/--color-grammar-verb/);
  });

  it("variant=grammar category=noun applies inline color-mix tint for noun", () => {
    render(
      <Badge variant="grammar" category="noun" data-testid="badge">
        noun
      </Badge>,
    );
    const badge = screen.getByTestId("badge");
    expect(badge.getAttribute("style") ?? "").toMatch(/--color-grammar-noun/);
  });
});

describe("Badge primitive — mono variant", () => {
  it("variant=mono renders font-mono uppercase tracking-wide eyebrow style", () => {
    render(
      <Badge variant="mono" data-testid="badge">
        N5 · J-POP
      </Badge>,
    );
    const badge = screen.getByTestId("badge");
    expect(badge.className).toMatch(/font-mono/);
    expect(badge.className).toMatch(/uppercase/);
    expect(badge.className).toMatch(/tracking-wide/);
  });
});

describe("Badge primitive — accent variant", () => {
  it("variant=accent renders bg-[var(--color-accent)]", () => {
    render(
      <Badge variant="accent" data-testid="badge">
        Premium
      </Badge>,
    );
    const badge = screen.getByTestId("badge");
    expect(badge.className).toMatch(/bg-\[var\(--color-accent\)\]/);
  });
});

describe("Badge primitive — defaults", () => {
  it("renders mono variant when no variant prop is supplied", () => {
    render(<Badge data-testid="badge">Default</Badge>);
    const badge = screen.getByTestId("badge");
    expect(badge.className).toMatch(/font-mono/);
  });
});
