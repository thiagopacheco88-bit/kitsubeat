"use client";

/**
 * LanguagePicker — Phase 18.1 Plan 03 (I18N-03, I18N-04).
 *
 * Globe icon button + dropdown panel for switching UI locale (EN / PT-BR / ES).
 *
 * Behavior:
 *  1. Globe button opens a listbox dropdown with 3 locale options.
 *  2. Selecting a locale triggers router.replace(pathname, { locale }) which
 *     navigates to the locale-prefixed URL — next-intl middleware automatically
 *     writes the kb_locale cookie on the subsequent request (no manual cookie write).
 *  3. Fire-and-forget syncLocaleToClerk for authenticated users — fails silently;
 *     cookie is the source of truth for routing.
 *  4. Escape key closes the dropdown; clicking outside closes it.
 *
 * Pattern: structural analog of ThemeToggle.tsx — ghost Button, inline SVG,
 * Escape-close via useEffect, click-outside via useRef + pointerdown listener.
 *
 * Token discipline: all colors via var(--color-*), radii via var(--radius-*),
 * shadows via var(--shadow-*). No raw hex, no Tailwind palette utilities.
 *
 * Icons: inline SVG (no lucide-react — project-wide constraint).
 *
 * Tap-target: ghost Button with !min-h-[44px] !min-w-[44px] override (SPEC AC #11).
 */
import { useState, useTransition, useRef, useEffect } from "react";
import { Button } from "./Button";
import { usePathname } from "next/navigation";
import { syncLocaleToClerk } from "@/app/actions/locale";

// Inline SVG globe icon — no lucide-react, no icon library (project constraint)
function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

// Inline SVG checkmark for selected option
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const LOCALE_OPTIONS = [
  { value: "en", label: "English", code: "EN" },
  { value: "pt-BR", label: "Português", code: "PT" },
  { value: "es", label: "Español", code: "ES" },
] as const;

interface LanguagePickerProps {
  currentLocale: "en" | "pt-BR" | "es";
}

export function LanguagePicker({ currentLocale }: LanguagePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [, startTransition] = useTransition();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key — pattern from MobileNavSheet.tsx
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  // Close on outside click — pointerdown fires before click (prevents re-open on same click)
  useEffect(() => {
    if (!isOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [isOpen]);

  // Strip the locale prefix from the raw Next.js pathname so router.replace
  // receives a locale-neutral path. usePathname() here is next/navigation (raw),
  // which includes the prefix (e.g. "/pt-BR/songs"). next-intl's router.replace
  // then re-adds the correct prefix for the target locale.
  const localePrefix = currentLocale !== "en" ? `/${currentLocale}` : "";
  const strippedPathname =
    localePrefix && pathname.startsWith(localePrefix)
      ? pathname.slice(localePrefix.length) || "/"
      : pathname;

  function switchLocale(newLocale: string) {
    setIsOpen(false);
    // Write kb_locale cookie BEFORE navigating. When switching back to English
    // (no URL prefix), the middleware cannot infer the locale from the URL and
    // falls back to the cookie — if the cookie still says pt-BR it redirects
    // back to the prefixed URL, causing an infinite loop. Updating the cookie
    // first prevents that. 1-year TTL matches next-intl's own cookie behaviour.
    document.cookie = `kb_locale=${newLocale}; path=/; SameSite=Lax; max-age=${60 * 60 * 24 * 365}`;
    const prefix = newLocale !== "en" ? `/${newLocale}` : "";
    const targetPath = `${prefix}${strippedPathname}`;
    window.location.href = targetPath;
    // Fire-and-forget Clerk sync — fail silently if unauthenticated or network error
    startTransition(async () => {
      try {
        await syncLocaleToClerk(newLocale);
      } catch {
        // Silent — cookie drives routing
      }
    });
  }

  const currentOption = LOCALE_OPTIONS.find((o) => o.value === currentLocale);

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen((o) => !o)}
        aria-label="Change language"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="!min-h-[44px] !min-w-[44px] !p-2 flex items-center gap-1"
      >
        <GlobeIcon className="text-[var(--color-text-muted)]" />
        {/* Active locale code — hidden on mobile, visible sm+ (UI-SPEC) */}
        <span className="text-xs font-semibold text-[var(--color-text-muted)] hidden sm:block">
          {currentOption?.code ?? "EN"}
        </span>
      </Button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Select language"
          className="absolute right-0 top-full mt-1 z-50 bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-xl)] shadow-[var(--shadow-card-ring-strong)] min-w-[160px] overflow-hidden"
          style={{ transition: "opacity 120ms" }}
        >
          {LOCALE_OPTIONS.map((option) => {
            const isSelected = option.value === currentLocale;
            return (
              <button
                key={option.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => switchLocale(option.value)}
                className={`w-full min-h-[44px] px-4 flex items-center justify-between text-sm transition-colors ${
                  isSelected
                    ? "text-[var(--color-text)] font-semibold"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-card-2)] hover:text-[var(--color-text)]"
                }`}
              >
                {option.label}
                {isSelected && (
                  <CheckIcon className="text-[var(--color-accent)] ml-2 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
