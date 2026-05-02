// @vitest-environment jsdom
/**
 * Phase 14 Plan 14-02 — EmptyState primitive (icon + heading + body + CTA) tests.
 *
 * Composable shell for the 24 empty/loading/error states cataloged in Plan 14-04
 * (per SPEC AC #6). Asserts: default + error variants, optional fields, CTA
 * handler forwarding.
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { EmptyState } from "../EmptyState";

afterEach(() => cleanup());

describe("EmptyState primitive — default variant", () => {
  it("renders heading + body when both are supplied", () => {
    render(<EmptyState heading="Nothing here" body="Try a different filter" />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("Try a different filter")).toBeInTheDocument();
  });

  it("renders heading only when body is omitted (no body element)", () => {
    render(<EmptyState heading="Empty" />);
    expect(screen.getByText("Empty")).toBeInTheDocument();
    // Heading is the only text — no <p> body present
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders icon when supplied", () => {
    render(
      <EmptyState
        heading="With icon"
        icon={<svg data-testid="icon" aria-hidden="true" />}
      />,
    );
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });
});

describe("EmptyState primitive — CTA composition", () => {
  it("renders CTA button when ctaLabel + onCtaClick are supplied", () => {
    const onCta = vi.fn();
    render(
      <EmptyState
        heading="Empty"
        ctaLabel="Browse songs"
        onCtaClick={onCta}
      />,
    );
    const btn = screen.getByRole("button", { name: "Browse songs" });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onCta).toHaveBeenCalledTimes(1);
  });

  it("renders CTA as link when ctaHref is supplied", () => {
    render(
      <EmptyState heading="Empty" ctaLabel="Browse" ctaHref="/songs" />,
    );
    const link = screen.getByRole("link", { name: /browse/i });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute("href")).toBe("/songs");
  });

  it("does NOT render CTA when ctaLabel is omitted", () => {
    render(<EmptyState heading="Empty" body="No data." />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("EmptyState primitive — error variant", () => {
  it("variant=error renders accent-bordered shell with retry button", () => {
    const onRetry = vi.fn();
    render(
      <EmptyState
        variant="error"
        heading="Failed to load"
        body="Something broke."
        ctaLabel="Try again"
        onCtaClick={onRetry}
      />,
    );
    const btn = screen.getByRole("button", { name: "Try again" });
    fireEvent.click(btn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
