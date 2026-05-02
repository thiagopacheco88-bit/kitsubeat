// @vitest-environment jsdom
/**
 * Phase 14 — ThemeToggle component tests.
 *
 * Asserts:
 *  1. Renders a button with a dynamic aria-label containing "Theme"
 *  2. Clicking cycles system → light → dark → system; data-theme attribute updates
 *  3. Optimistic update — data-theme set synchronously on click without awaiting
 *     the server action (it's wrapped in startTransition fire-and-forget)
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Mock the server action so the component renders in isolation (no Next runtime needed).
vi.mock("@/app/actions/userPrefs", () => ({
  setThemePreference: vi.fn(async () => {}),
}));

import { ThemeToggle } from "../ThemeToggle";

afterEach(() => {
  cleanup();
  // Clear cookie + reset data-theme between tests
  document.cookie = "kb_theme=; max-age=0; path=/";
  document.documentElement.removeAttribute("data-theme");
});

describe("ThemeToggle", () => {
  beforeEach(() => {
    // matchMedia stub — system → dark resolves true
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: true,
        media: "(prefers-color-scheme: dark)",
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("renders a button with aria-label containing 'Theme'", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button");
    const label = btn.getAttribute("aria-label") ?? "";
    expect(label).toMatch(/Theme/);
  });

  it("cycles system -> light -> dark -> system on click", async () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button");

    // Initial: cookie absent → 'system'
    // Wrap clicks in act() so React flushes state updates between them
    // (the cycle handler reads pref via closure; it must re-render between clicks).
    await act(async () => {
      fireEvent.click(btn); // → light
    });
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    await act(async () => {
      fireEvent.click(btn); // → dark
    });
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    await act(async () => {
      fireEvent.click(btn); // → system (resolves to dark via mocked matchMedia)
    });
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("applies optimistic update synchronously (no await for server action)", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button");

    // Synchronous click: data-theme should be set IMMEDIATELY (before any
    // async work resolves — the server action runs inside startTransition).
    fireEvent.click(btn);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});
