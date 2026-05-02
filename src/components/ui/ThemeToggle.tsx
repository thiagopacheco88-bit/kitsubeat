"use client";

/**
 * ThemeToggle — Phase 14 Plan 14-03 (CONTEXT D-09, D-10).
 *
 * Header sun/moon/monitor button cycling system → light → dark → system.
 *
 * Behavior:
 *  1. On mount, read kb_theme cookie to seed local state (avoids hydration mismatch
 *     because the inline <script> in layout.tsx already set <html data-theme>).
 *  2. On click: cycle to next pref → optimistically set <html data-theme> +
 *     kb_theme cookie immediately → fire setThemePreference server action async.
 *  3. On server-action failure: revert optimistic state and log to console.
 *
 * Persistence model: cookie is the immediate source of truth (also written by the
 * server action for SSR consistency). DB write is fire-and-forget via useTransition.
 *
 * Tap-target compliance: button carries min-h-[44px] min-w-[44px] (SPEC AC #11).
 *
 * Icons: inline SVG (not lucide-react — bundle budget per CONTEXT, no new deps).
 *
 * userId source: passed in as a prop from the parent server component
 * (resolves Clerk's auth().userId there); falls back to PLACEHOLDER_USER_ID
 * when the prop is omitted so the cookie/SSR theme path still works without
 * a session and so unit tests don't need a ClerkProvider wrapper.
 */
import { useEffect, useState, useTransition } from "react";
import { Button } from "./Button";
import { setThemePreference } from "@/app/actions/userPrefs";
import { PLACEHOLDER_USER_ID } from "@/lib/user-prefs";

type ThemePref = "system" | "light" | "dark";
const ORDER: readonly ThemePref[] = ["system", "light", "dark"] as const;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year (matches server action D-08)

function readCookie(): ThemePref {
  if (typeof document === "undefined") return "system";
  const m = document.cookie.match(/kb_theme=(system|light|dark)/);
  return (m?.[1] as ThemePref) ?? "system";
}

function resolveSystem(value: ThemePref): "light" | "dark" {
  if (value === "light" || value === "dark") return value;
  // system → resolve via prefers-color-scheme
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyOptimistic(value: ThemePref): void {
  const resolved = resolveSystem(value);
  document.documentElement.setAttribute("data-theme", resolved);
  document.cookie = `kb_theme=${value}; max-age=${COOKIE_MAX_AGE}; path=/; samesite=lax`;
}

// Inline SVG icons — no extra deps, ~150B each gzipped.
function MonitorIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

interface ThemeToggleProps {
  /** Resolved by the parent server component (Clerk auth().userId or placeholder) */
  userId?: string;
}

export function ThemeToggle({ userId = PLACEHOLDER_USER_ID }: ThemeToggleProps = {}) {
  const [pref, setPref] = useState<ThemePref>("system");
  const [isPending, startTransition] = useTransition();

  // Read cookie on mount (avoids SSR/CSR mismatch — server didn't see this state).
  useEffect(() => {
    setPref(readCookie());
  }, []);

  const cycle = () => {
    const next = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];
    const prev = pref;

    // Optimistic: apply data-theme + cookie BEFORE server action returns (D-10).
    applyOptimistic(next);
    setPref(next);

    // Server action async — DB column write. Cookie write is redundant (we already
    // set it client-side) but defensive for SSR consistency on next request.
    startTransition(async () => {
      try {
        await setThemePreference(userId, next);
      } catch (e) {
        // Revert optimistic state on failure
        // eslint-disable-next-line no-console
        console.error("setThemePreference failed:", e);
        applyOptimistic(prev);
        setPref(prev);
      }
    });
  };

  const Icon = pref === "system" ? MonitorIcon : pref === "light" ? SunIcon : MoonIcon;
  const label = `Theme: ${pref}. Click to change.`;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={cycle}
      aria-label={label}
      title={label}
      disabled={isPending}
      className="!min-h-[44px] !min-w-[44px] !p-2"
    >
      <Icon className="h-5 w-5" />
    </Button>
  );
}
