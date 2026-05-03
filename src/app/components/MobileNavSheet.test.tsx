// @vitest-environment jsdom
/**
 * MobileNavSheet — Phase 14.2 Plan 11 — mobile nav sheet a11y + interaction contract.
 *
 * TDD: RED phase — tests written before the component exists.
 * Contract:
 *   1. Renders only trigger button when closed (sheet not in DOM)
 *   2. Trigger click opens the sheet (sheet in DOM, aria-expanded="true")
 *   3. Backdrop click closes the sheet
 *   4. Escape keypress closes the sheet
 *   5. Close button closes sheet AND returns focus to trigger
 *   6. Link click closes the sheet
 *   7. isAdmin=false omits Admin link; isAdmin=true includes it
 *   8. Sheet root has role="dialog", aria-modal="true", aria-label="Navigation"
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import MobileNavSheet from "./MobileNavSheet";

afterEach(() => cleanup());

describe("MobileNavSheet — closed state", () => {
  it("renders the trigger button when closed", () => {
    const { getByTestId, queryByTestId } = render(
      <MobileNavSheet isAdmin={false} isSignedIn={false} />
    );
    expect(getByTestId("mobile-nav-trigger")).toBeInTheDocument();
    expect(queryByTestId("mobile-nav-sheet")).not.toBeInTheDocument();
  });
});

describe("MobileNavSheet — open/close interactions", () => {
  it("trigger click opens the sheet with aria-expanded=true", async () => {
    const { getByTestId } = render(
      <MobileNavSheet isAdmin={false} isSignedIn={false} />
    );
    const trigger = getByTestId("mobile-nav-trigger");
    await act(async () => { fireEvent.click(trigger); });
    expect(getByTestId("mobile-nav-sheet")).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("backdrop click closes the sheet", async () => {
    const { getByTestId, queryByTestId } = render(
      <MobileNavSheet isAdmin={false} isSignedIn={false} />
    );
    await act(async () => { fireEvent.click(getByTestId("mobile-nav-trigger")); });
    expect(getByTestId("mobile-nav-sheet")).toBeInTheDocument();
    const backdrop = getByTestId("mobile-nav-backdrop");
    await act(async () => { fireEvent.click(backdrop); });
    expect(queryByTestId("mobile-nav-sheet")).not.toBeInTheDocument();
  });

  it("Escape keypress closes the sheet", async () => {
    const { getByTestId, queryByTestId } = render(
      <MobileNavSheet isAdmin={false} isSignedIn={false} />
    );
    await act(async () => { fireEvent.click(getByTestId("mobile-nav-trigger")); });
    expect(getByTestId("mobile-nav-sheet")).toBeInTheDocument();
    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    });
    expect(queryByTestId("mobile-nav-sheet")).not.toBeInTheDocument();
  });

  it("close button closes sheet and returns focus to trigger", async () => {
    const { getByTestId, queryByTestId } = render(
      <MobileNavSheet isAdmin={false} isSignedIn={false} />
    );
    const trigger = getByTestId("mobile-nav-trigger");
    await act(async () => { fireEvent.click(trigger); });
    expect(getByTestId("mobile-nav-sheet")).toBeInTheDocument();
    const closeBtn = getByTestId("mobile-nav-close");
    await act(async () => { fireEvent.click(closeBtn); });
    expect(queryByTestId("mobile-nav-sheet")).not.toBeInTheDocument();
    // Focus should return to trigger
    expect(document.activeElement).toBe(trigger);
  });

  it("link click closes the sheet", async () => {
    const { getByTestId, queryByTestId, getByRole } = render(
      <MobileNavSheet isAdmin={false} isSignedIn={false} />
    );
    await act(async () => { fireEvent.click(getByTestId("mobile-nav-trigger")); });
    expect(getByTestId("mobile-nav-sheet")).toBeInTheDocument();
    // Click the Path link
    const pathLink = getByRole("link", { name: "Path" });
    await act(async () => { fireEvent.click(pathLink); });
    expect(queryByTestId("mobile-nav-sheet")).not.toBeInTheDocument();
  });
});

describe("MobileNavSheet — isAdmin prop", () => {
  it("does NOT render Admin link when isAdmin=false", async () => {
    const { getByTestId, queryByTestId } = render(
      <MobileNavSheet isAdmin={false} isSignedIn={false} />
    );
    await act(async () => { fireEvent.click(getByTestId("mobile-nav-trigger")); });
    expect(queryByTestId("mobile-nav-admin")).not.toBeInTheDocument();
  });

  it("renders Admin link when isAdmin=true", async () => {
    const { getByTestId } = render(
      <MobileNavSheet isAdmin={true} isSignedIn={false} />
    );
    await act(async () => { fireEvent.click(getByTestId("mobile-nav-trigger")); });
    expect(getByTestId("mobile-nav-admin")).toBeInTheDocument();
  });
});

describe("MobileNavSheet — a11y contract", () => {
  it("sheet root has role=dialog, aria-modal=true, aria-label=Navigation", async () => {
    const { getByTestId } = render(
      <MobileNavSheet isAdmin={false} isSignedIn={false} />
    );
    await act(async () => { fireEvent.click(getByTestId("mobile-nav-trigger")); });
    const sheet = getByTestId("mobile-nav-sheet");
    expect(sheet).toHaveAttribute("role", "dialog");
    expect(sheet).toHaveAttribute("aria-modal", "true");
    expect(sheet).toHaveAttribute("aria-label", "Navigation");
  });
});
