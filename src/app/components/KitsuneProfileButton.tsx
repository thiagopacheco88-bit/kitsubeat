"use client";

import { useClerk } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

/**
 * KitsuneProfileButton — replaces Clerk's generic UserButton in the nav.
 *
 * Shows the kitsune fox avatar as a 32×32 circle trigger.
 * Dropdown contains Profile link + Sign out.
 * Closes on outside click or Escape.
 */
export function KitsuneProfileButton() {
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open profile menu"
        aria-expanded={open}
        className="rounded-full ring-2 ring-transparent transition-all hover:ring-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
      >
        <Image
          src="/kitsune-avatar.png"
          width={32}
          height={32}
          alt="Your profile"
          className="rounded-full"
          priority
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 min-w-[140px] overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg"
        >
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-card-2)]"
          >
            Profile
          </Link>
          <button
            role="menuitem"
            onClick={() => signOut({ redirectUrl: "/" })}
            className="w-full px-4 py-2.5 text-left text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-card-2)] hover:text-[var(--color-text)]"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
