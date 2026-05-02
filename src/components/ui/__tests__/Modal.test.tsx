// @vitest-environment jsdom
/**
 * Phase 14 Plan 14-02 — Modal primitive (Radix Dialog wrapper) tests.
 *
 * jsdom does not fully simulate Radix Dialog's portal lifecycle (focus trap,
 * scroll lock, ESC handler are integration concerns). Wave 2+ E2E specs
 * (theme-toggle.spec.ts, mobile-parity.spec.ts) cover real interaction.
 *
 * These unit tests assert the wrapper-shape contract:
 *   - Imports + re-exports the right Radix surface
 *   - Renders without throwing when open=true with proper Title child
 *   - Honors srOnly Title escape hatch (Pitfall 5 a11y compliance)
 *   - Forwards onOpenChange handler from consumers to Radix Root
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  Modal,
  ModalTrigger,
  ModalContent,
  ModalTitle,
  ModalDescription,
  ModalClose,
} from "../Modal";

afterEach(() => cleanup());

describe("Modal primitive — surface", () => {
  it("exports Modal, ModalTrigger, ModalContent, ModalTitle, ModalDescription, ModalClose", () => {
    expect(Modal).toBeDefined();
    expect(ModalTrigger).toBeDefined();
    expect(ModalContent).toBeDefined();
    expect(ModalTitle).toBeDefined();
    expect(ModalDescription).toBeDefined();
    expect(ModalClose).toBeDefined();
  });
});

describe("Modal primitive — open state", () => {
  it("renders dialog with role=dialog when open=true", () => {
    render(
      <Modal open={true}>
        <ModalContent>
          <ModalTitle>Test</ModalTitle>
        </ModalContent>
      </Modal>,
    );
    // Radix renders the dialog into a portal — query within document.body
    const dialog = screen.queryByRole("dialog");
    expect(dialog).not.toBeNull();
  });

  it("does not render dialog when open=false", () => {
    render(
      <Modal open={false}>
        <ModalContent>
          <ModalTitle>Test</ModalTitle>
        </ModalContent>
      </Modal>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("Modal primitive — title contract (Pitfall 5)", () => {
  it("ModalTitle with srOnly=true applies sr-only class", () => {
    render(
      <Modal open={true}>
        <ModalContent>
          <ModalTitle srOnly>Hidden Title</ModalTitle>
        </ModalContent>
      </Modal>,
    );
    const title = screen.getByText("Hidden Title");
    expect(title.className).toMatch(/sr-only/);
  });

  it("ModalTitle without srOnly applies visible heading style", () => {
    render(
      <Modal open={true}>
        <ModalContent>
          <ModalTitle>Visible Title</ModalTitle>
        </ModalContent>
      </Modal>,
    );
    const title = screen.getByText("Visible Title");
    expect(title.className).toMatch(/text-xl|font-semibold/);
    expect(title.className).not.toMatch(/sr-only/);
  });
});

describe("Modal primitive — onOpenChange forwarding", () => {
  it("invokes onOpenChange when ModalClose is clicked", () => {
    const onOpenChange = vi.fn();
    render(
      <Modal open={true} onOpenChange={onOpenChange}>
        <ModalContent>
          <ModalTitle>Test</ModalTitle>
          <ModalClose data-testid="close">Close</ModalClose>
        </ModalContent>
      </Modal>,
    );
    fireEvent.click(screen.getByTestId("close"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("Modal primitive — content tokens", () => {
  it("ModalContent applies token-driven background + radius classes", () => {
    render(
      <Modal open={true}>
        <ModalContent data-testid="content">
          <ModalTitle>Test</ModalTitle>
        </ModalContent>
      </Modal>,
    );
    const content = screen.getByTestId("content");
    expect(content.className).toMatch(/bg-\[var\(--color-card\)\]/);
    expect(content.className).toMatch(/rounded-\[var\(--radius-3xl\)\]/);
  });
});

describe("Modal primitive — description", () => {
  it("ModalDescription renders body text with muted token color", () => {
    render(
      <Modal open={true}>
        <ModalContent>
          <ModalTitle>T</ModalTitle>
          <ModalDescription>Body text here</ModalDescription>
        </ModalContent>
      </Modal>,
    );
    const desc = screen.getByText("Body text here");
    expect(desc.className).toMatch(/text-\[var\(--color-text-muted\)\]/);
  });
});
