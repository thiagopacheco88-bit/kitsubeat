// @vitest-environment jsdom
/**
 * Phase 15 Plan 01 — Unit tests for ConsentBanner component
 *
 * Covers:
 * - Renders null when posthog status is '' (SSR-safe, no flash)
 * - Renders dialog when status is 'pending'
 * - Renders null when status is 'granted' (returning user)
 * - Accept click calls opt_in_capturing() and banner disappears
 * - Decline click calls opt_out_capturing() and banner disappears
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock posthog-js
const mockGetExplicitConsentStatus = vi.fn();
const mockOptIn = vi.fn();
const mockOptOut = vi.fn();

vi.mock("posthog-js", () => ({
  default: {
    get_explicit_consent_status: mockGetExplicitConsentStatus,
    opt_in_capturing: mockOptIn,
    opt_out_capturing: mockOptOut,
  },
}));

import { ConsentBanner } from "@/components/ConsentBanner";

describe("ConsentBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders null when posthog status is '' (SSR-safe, no flash)", async () => {
    mockGetExplicitConsentStatus.mockReturnValue("");
    let container: HTMLElement;
    await act(async () => {
      const result = render(<ConsentBanner />);
      container = result.container;
    });
    expect(container!.firstChild).toBeNull();
  });

  it("renders a dialog element when status is 'pending'", async () => {
    mockGetExplicitConsentStatus.mockReturnValue("pending");
    await act(async () => {
      render(<ConsentBanner />);
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("renders null when status is 'granted' (returning user)", async () => {
    mockGetExplicitConsentStatus.mockReturnValue("granted");
    let container: HTMLElement;
    await act(async () => {
      const result = render(<ConsentBanner />);
      container = result.container;
    });
    expect(container!.firstChild).toBeNull();
  });

  it("clicking Accept calls posthog.opt_in_capturing() and banner disappears", async () => {
    mockGetExplicitConsentStatus.mockReturnValue("pending");
    let container: HTMLElement;
    await act(async () => {
      const result = render(<ConsentBanner />);
      container = result.container;
    });

    const acceptBtn = screen.getByRole("button", { name: /accept/i });
    await act(async () => {
      acceptBtn.click();
    });

    expect(mockOptIn).toHaveBeenCalled();
    expect(container!.firstChild).toBeNull();
  });

  it("clicking Decline calls posthog.opt_out_capturing() and banner disappears", async () => {
    mockGetExplicitConsentStatus.mockReturnValue("pending");
    let container: HTMLElement;
    await act(async () => {
      const result = render(<ConsentBanner />);
      container = result.container;
    });

    const declineBtn = screen.getByRole("button", { name: /decline/i });
    await act(async () => {
      declineBtn.click();
    });

    expect(mockOptOut).toHaveBeenCalled();
    expect(container!.firstChild).toBeNull();
  });
});
