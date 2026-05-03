"use client";
/**
 * MobileNavSheet — Phase 14.2 Plan 11 Task 2.
 *
 * Mobile-only (sm:hidden) hamburger trigger + slide-in nav sheet.
 * Fixes pre-14.2 horizontal-scroll on global header at ≤640px.
 *
 * Desktop (sm and up): renders nothing — the layout.tsx inline link cluster
 * wrapped in `hidden sm:contents` takes over.
 *
 * A11y contract:
 *   - Trigger: aria-label="Open menu", aria-expanded, aria-controls
 *   - Sheet: role="dialog", aria-modal="true", aria-label="Navigation", id="mobile-nav-sheet"
 *   - Focus: sheet open → closeRef focused; sheet close → triggerRef focused
 *   - Escape: closes sheet and returns focus
 *   - Reduced motion: sheet appears instantly (motion-safe prefix on transitions)
 *
 * Token discipline (D-12): all colors via var(--color-*). Raw px only in
 * style prop (not className) per the no-raw-tokens ESLint rule.
 *
 * Note: GlobalLearnedCounter is an async server component and cannot be
 * rendered inside a client island. The word-count link is omitted from the
 * sheet — it's visible in the desktop nav (hidden sm:contents) and accessible
 * via the /vocabulary link in the sheet.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Props = { isAdmin: boolean; isSignedIn: boolean };

export default function MobileNavSheet({ isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // close is a stable function (defined inline), open is the actual dep
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Hidden on sm and up — desktop uses the inline cluster from layout.tsx
  return (
    <div className="sm:hidden">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-nav-sheet"
        data-testid="mobile-nav-trigger"
        className="flex items-center justify-center text-[var(--color-text)]"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M3 6h18M3 12h18M3 18h18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <>
          {/* Backdrop — tap to close */}
          <div
            onClick={close}
            aria-hidden="true"
            data-testid="mobile-nav-backdrop"
            className="fixed inset-0 z-[60] bg-black/50 motion-safe:transition-opacity motion-safe:duration-150"
          />
          {/* Sheet */}
          <div
            id="mobile-nav-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            data-testid="mobile-nav-sheet"
            style={{ width: "280px" }}
            className="fixed right-0 top-0 z-[70] flex h-full flex-col gap-2 border-l border-[var(--color-border)] bg-[var(--color-bg)] p-4 motion-safe:transition-transform motion-safe:duration-200"
          >
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              aria-label="Close menu"
              data-testid="mobile-nav-close"
              className="self-end text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              Close
            </button>
            <Link
              href="/path"
              onClick={close}
              className="py-2 text-base text-[var(--color-text)]"
            >
              Path
            </Link>
            <Link
              href="/anime-list"
              onClick={close}
              className="py-2 text-base text-[var(--color-text)]"
            >
              Songs
            </Link>
            <Link
              href="/kana"
              onClick={close}
              className="py-2 text-base text-[var(--color-text)]"
            >
              Kana
            </Link>
            <Link
              href="/vocabulary"
              onClick={close}
              className="py-2 text-base text-[var(--color-text)]"
            >
              Progress
            </Link>
            {isAdmin && (
              <Link
                href="/admin/lyrics"
                onClick={close}
                data-testid="mobile-nav-admin"
                className="py-2 text-base text-[var(--color-accent)]"
              >
                Admin
              </Link>
            )}
            <Link
              href="/profile"
              onClick={close}
              className="py-2 text-base text-[var(--color-text)]"
            >
              Profile
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
