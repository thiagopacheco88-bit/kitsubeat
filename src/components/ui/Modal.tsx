"use client";

/**
 * Modal primitive — Phase 14 Plan 14-02 (D-06).
 *
 * Wraps @radix-ui/react-dialog for a11y-correct modal substrate (focus trap,
 * ESC, scroll lock, aria-modal, restored focus, portal). Tree-shakes to ~5 KB
 * gzipped on /songs/[slug] (CONTEXT D-23 budget).
 *
 * Surface re-exports:
 *   - Modal           = Dialog.Root
 *   - ModalTrigger    = Dialog.Trigger
 *   - ModalClose      = Dialog.Close
 *   - ModalContent    = wrapper around Dialog.Portal + Dialog.Overlay + Dialog.Content
 *   - ModalTitle      = Dialog.Title with optional srOnly prop (Pitfall 5)
 *   - ModalDescription = Dialog.Description with token-driven muted color
 *
 * "use client" is required — Radix Dialog uses React refs + portal lifecycle
 * (browser-only).
 *
 * Pitfall 5 (Radix a11y contract): Every ModalContent MUST include a ModalTitle
 * child or Radix logs a console warning. Use `srOnly` to hide visually while
 * preserving the screen-reader announcement.
 */
import * as Dialog from "@radix-ui/react-dialog";
import { type ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";

export const Modal = Dialog.Root;
export const ModalTrigger = Dialog.Trigger;
export const ModalClose = Dialog.Close;

type ModalContentProps = {
  children: ReactNode;
  className?: string;
  /**
   * Forward to Dialog.Content's forceMount (Phase 13 / future-proofing for
   * nested modals; D-discretion in CONTEXT says nested unlikely but the
   * defensive escape hatch is cheap).
   */
  forceMount?: true;
  "data-testid"?: string;
};

/**
 * Modal content shell — wraps Dialog.Portal + Dialog.Overlay + Dialog.Content
 * with token-driven backdrop, surface, and shadow recipes.
 *
 * Pitfall 5: callers MUST include `<ModalTitle>` as a child (with `srOnly` if
 * the design has no visible heading). Radix logs a console warning otherwise.
 */
export function ModalContent({
  children,
  className,
  forceMount,
  ...rest
}: ModalContentProps) {
  return (
    <Dialog.Portal forceMount={forceMount}>
      <Dialog.Overlay
        className={clsx(
          "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
        )}
      />
      <Dialog.Content
        forceMount={forceMount}
        className={twMerge(
          clsx(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
            "w-full max-w-md p-6 rounded-[var(--radius-3xl)]",
            "bg-[var(--color-card)] text-[var(--color-text)]",
            "shadow-[var(--shadow-card-ring-strong)]",
            "focus:outline-none",
          ),
          className,
        )}
        data-testid={rest["data-testid"]}
      >
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}

export function ModalTitle({
  children,
  srOnly,
}: {
  children: ReactNode;
  srOnly?: boolean;
}) {
  return (
    <Dialog.Title
      className={
        srOnly ? "sr-only" : "text-xl font-semibold text-[var(--color-text)]"
      }
    >
      {children}
    </Dialog.Title>
  );
}

export function ModalDescription({ children }: { children: ReactNode }) {
  return (
    <Dialog.Description className="mt-2 text-sm text-[var(--color-text-muted)]">
      {children}
    </Dialog.Description>
  );
}
