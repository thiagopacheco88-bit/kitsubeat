// @vitest-environment jsdom
/**
 * Phase 14 Plan 14-02 — Card primitive variant rendering tests.
 *
 * Asserts the 3-variant matrix (flat|elevated|hero), CardLink polymorphism,
 * HTML attribute forwarding, and twMerge className merging.
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Card, CardLink } from "../Card";

afterEach(() => cleanup());

describe("Card primitive — variants", () => {
  it("renders flat variant with --color-card background + border tokens", () => {
    render(
      <Card variant="flat" data-testid="card">
        body
      </Card>,
    );
    const card = screen.getByTestId("card");
    expect(card.className).toMatch(/bg-\[var\(--color-card\)\]/);
    expect(card.className).toMatch(/border-\[var\(--color-border\)\]/);
  });

  it("renders elevated variant with shadow-card-ring-strong + bg-card-2", () => {
    render(
      <Card variant="elevated" data-testid="card">
        body
      </Card>,
    );
    const card = screen.getByTestId("card");
    expect(card.className).toMatch(/bg-\[var\(--color-card-2\)\]/);
    expect(card.className).toMatch(/shadow-\[var\(--shadow-card-ring-strong\)\]/);
  });

  it("renders hero variant with shadow-hero-glow", () => {
    render(
      <Card variant="hero" data-testid="card">
        body
      </Card>,
    );
    const card = screen.getByTestId("card");
    expect(card.className).toMatch(/shadow-\[var\(--shadow-hero-glow\)\]/);
  });
});

describe("CardLink primitive", () => {
  it("renders as <a> element with href", () => {
    render(
      <CardLink href="/songs/test" data-testid="card-link">
        Song
      </CardLink>,
    );
    const link = screen.getByTestId("card-link");
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("/songs/test");
  });

  it("CardLink applies same variant token classes as Card", () => {
    render(
      <CardLink href="/x" variant="hero" data-testid="card-link">
        Hero
      </CardLink>,
    );
    const link = screen.getByTestId("card-link");
    expect(link.className).toMatch(/shadow-\[var\(--shadow-hero-glow\)\]/);
  });
});

describe("Card primitive — passthrough", () => {
  it("forwards arbitrary data-* and aria-* attributes", () => {
    render(
      <Card data-testid="card" aria-label="Test card" data-track="x">
        body
      </Card>,
    );
    const card = screen.getByTestId("card");
    expect(card.getAttribute("aria-label")).toBe("Test card");
    expect(card.getAttribute("data-track")).toBe("x");
  });

  it("merges custom className via twMerge (custom rounded overrides default)", () => {
    render(
      <Card variant="flat" size="md" className="rounded-full" data-testid="card">
        body
      </Card>,
    );
    const card = screen.getByTestId("card");
    expect(card.className).toMatch(/rounded-full/);
    // twMerge should drop the variant's rounded-[var(--radius-lg)]
    expect(card.className).not.toMatch(/rounded-\[var\(--radius-lg\)\]/);
  });
});
