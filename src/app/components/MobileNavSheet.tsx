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
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type Props = { isAdmin: boolean; isSignedIn: boolean };

export default function MobileNavSheet({ isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const links = [
    { href: "/path", label: "Path" },
    { href: "/anime-list", label: "Songs" },
    { href: "/kana", label: "Kana" },
    { href: "/journal", label: "Journal" },
    { href: "/vocabulary", label: "Progress" },
    ...(isAdmin ? [{ href: "/admin/lyrics", label: "Admin", testId: "mobile-nav-admin" }] : []),
    { href: "/profile", label: "Profile" },
  ];

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [close, open]);

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
            className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm motion-safe:transition-opacity motion-safe:duration-150"
          />
          {/* Sheet */}
          <div
            id="mobile-nav-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            data-testid="mobile-nav-sheet"
            className="fixed inset-0 z-[1010] flex min-h-dvh flex-col bg-[var(--color-bg)] px-5 py-4 shadow-[0_24px_80px_rgba(0,0,0,0.55)] motion-safe:transition-transform motion-safe:duration-200"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border-strong)] pb-4">
              <Link href="/" onClick={close} className="flex shrink-0 items-center gap-2">
                <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                  <ellipse cx="16" cy="20" rx="9" ry="7" fill="var(--color-grammar-adverb)" />
                  <polygon points="9,15 4,5 13,11" fill="var(--color-grammar-adverb)" />
                  <polygon points="23,15 28,5 19,11" fill="var(--color-grammar-adverb)" />
                  <ellipse cx="13" cy="20" rx="1.4" ry="1.8" fill="var(--color-text)" />
                  <ellipse cx="19" cy="20" rx="1.4" ry="1.8" fill="var(--color-text)" />
                  <ellipse cx="16" cy="23.5" rx="1.4" ry="1" fill="var(--color-accent)" />
                </svg>
                <span className="text-lg font-extrabold tracking-tight" aria-label="KitsuBeat">
                  <span className="text-[var(--color-text)]">Kitsu</span>
                  <span className="text-[var(--color-accent-readable)]">Beat</span>
                </span>
              </Link>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                aria-label="Close menu"
                data-testid="mobile-nav-close"
                className="rounded-[var(--radius-pill)] border border-[var(--color-border-strong)] bg-[var(--color-card)] px-4 py-2 text-sm font-medium text-[var(--color-text)] shadow-[var(--shadow-card-ring)] transition-colors hover:bg-[var(--color-card-2)]"
              >
                Close
              </button>
            </div>
            <div className="flex flex-1 flex-col justify-center gap-3">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={close}
                  data-testid={link.testId}
                  className={[
                    "rounded-[var(--radius-xl)] border border-[var(--color-border-strong)] bg-[var(--color-card)] px-5 py-4 text-xl font-semibold shadow-[var(--shadow-card-ring)] transition-colors hover:bg-[var(--color-card-2)]",
                    link.label === "Admin"
                      ? "text-[var(--color-accent-readable)]"
                      : "text-[var(--color-text)]",
                  ].join(" ")}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
