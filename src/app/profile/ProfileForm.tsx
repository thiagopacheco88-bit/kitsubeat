"use client";

import { useState, useEffect } from "react";
import { updateUserPrefs, setThemePreference } from "@/app/actions/userPrefs";
import { Button } from "@/components/ui/Button";

type ThemePref = "system" | "light" | "dark";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year (matches setThemePreference D-08)

interface ProfileFormProps {
  userId: string;
  initialSkipLearning: boolean;
  initialNewCardCap: number;
  isPremium: boolean;
  defaultCap: number;
  maxCap: number;
  /** Phase 12: celebration effects defaults */
  initialSoundEnabled: boolean;
  initialHapticsEnabled: boolean;
}

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

export default function ProfileForm({
  userId,
  initialSkipLearning,
  initialNewCardCap,
  isPremium,
  defaultCap,
  maxCap,
  initialSoundEnabled,
  initialHapticsEnabled,
}: ProfileFormProps) {
  const [skipLearning, setSkipLearning] = useState(initialSkipLearning);
  const [newCardCap, setNewCardCap] = useState<number>(initialNewCardCap);
  const [soundEnabled, setSoundEnabled] = useState(initialSoundEnabled);
  const [hapticsEnabled, setHapticsEnabled] = useState(initialHapticsEnabled);
  const [state, setState] = useState<SaveState>({ kind: "idle" });

  // Phase 14 D-10 — Appearance state. Seeded from kb_theme cookie on mount
  // (the layout.tsx inline script + SSR cookie read have already settled the
  // visual state; this just mirrors it into the form's local state).
  const [themePreference, setThemePreferenceLocal] =
    useState<ThemePref>("system");
  useEffect(() => {
    const m =
      typeof document !== "undefined"
        ? document.cookie.match(/kb_theme=(system|light|dark)/)
        : null;
    if (m) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThemePreferenceLocal(m[1] as ThemePref);
    }
  }, []);

  const handleThemeChange = async (next: ThemePref) => {
    // Optimistic UI: apply data-theme + cookie immediately
    const resolved =
      next === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : next;
    document.documentElement.setAttribute("data-theme", resolved);
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `kb_theme=${next}; max-age=${COOKIE_MAX_AGE}; path=/; samesite=lax`;
    setThemePreferenceLocal(next);

    // Server action — DB column write
    if (userId) {
      try {
        await setThemePreference(userId, next);
      } catch (err) {
        // Non-fatal: the cookie write already kept things consistent client-side
        console.error("setThemePreference failed:", err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ kind: "saving" });

    // Defensive client validation — mirrors the server action's bounds.
    // Free users can't submit a raised cap; the UI disables the input but a
    // rogue client could patch the DOM, so fall back to defaultCap on submit.
    const capToSend = isPremium
      ? Math.min(Math.max(newCardCap, 1), maxCap)
      : defaultCap;

    try {
      await updateUserPrefs(userId, {
        skipLearning,
        newCardCap: capToSend,
        soundEnabled,
        hapticsEnabled,
      });
      setState({ kind: "saved" });
    } catch (err) {
      setState({
        kind: "error",
        message:
          err instanceof Error ? err.message : "Failed to save preferences.",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* skip_learning toggle */}
      <label className="flex min-h-11 cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={skipLearning}
          onChange={(e) => {
            setSkipLearning(e.target.checked);
            setState({ kind: "idle" });
          }}
          className="mt-1 h-4 w-4 rounded border-[var(--color-border-strong)] bg-[var(--color-card-2)] accent-[var(--color-accent)]"
        />
        <span>
          <span className="block font-medium text-[var(--color-text)]">
            Skip learn cards
          </span>
          <span className="block text-sm text-[var(--color-text-muted)]">
            Jump straight into exercises without a pre-question breakdown.
            The new-word cap still applies.
          </span>
        </span>
      </label>

      {/* new_card_cap input — disabled for free users */}
      <div>
        <label
          htmlFor="new-card-cap"
          className="block font-medium text-[var(--color-text)]"
        >
          New words per session
        </label>
        <p className="mb-2 text-sm text-[var(--color-text-muted)]">
          How many brand-new words can enter a single session. Default{" "}
          {defaultCap}.
        </p>
        <input
          id="new-card-cap"
          type="number"
          min={1}
          max={maxCap}
          step={1}
          disabled={!isPremium}
          value={newCardCap}
          onChange={(e) => {
            const v = Number(e.target.value);
            setNewCardCap(Number.isFinite(v) ? v : defaultCap);
            setState({ kind: "idle" });
          }}
          aria-describedby="cap-help"
          className="w-24 rounded-[var(--radius-lg)] border border-[var(--color-border-strong)] bg-[var(--color-card-2)] px-3 py-2 text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-60"
        />
        {!isPremium && (
          <p id="cap-help" className="mt-2 text-xs text-[var(--color-grammar-expression)]">
            Upgrade to premium to raise the cap (up to {maxCap}).
          </p>
        )}
        {isPremium && (
          <p id="cap-help" className="mt-2 text-xs text-[var(--color-text-dim)]">
            Between 1 and {maxCap}.
          </p>
        )}
      </div>

      {/* Celebration effects — sound + haptics toggles */}
      <fieldset className="space-y-4">
        <legend className="font-medium text-[var(--color-text)]">Celebration effects</legend>

        <label className="flex min-h-11 cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={soundEnabled}
            onChange={(e) => {
              setSoundEnabled(e.target.checked);
              setState({ kind: "idle" });
            }}
            className="mt-1 h-4 w-4 rounded border-[var(--color-border-strong)] bg-[var(--color-card-2)] accent-[var(--color-accent)]"
          />
          <span>
            <span className="block font-medium text-[var(--color-text)]">
              Sound effects
            </span>
            <span className="block text-sm text-[var(--color-text-muted)]">
              Play a chime on level-up.
            </span>
          </span>
        </label>

        <label className="flex min-h-11 cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={hapticsEnabled}
            onChange={(e) => {
              setHapticsEnabled(e.target.checked);
              setState({ kind: "idle" });
            }}
            className="mt-1 h-4 w-4 rounded border-[var(--color-border-strong)] bg-[var(--color-card-2)] accent-[var(--color-accent)]"
          />
          <span>
            <span className="block font-medium text-[var(--color-text)]">
              Haptic feedback
            </span>
            <span className="block text-sm text-[var(--color-text-muted)]">
              Vibrate on mobile on level-up.
            </span>
            <span className="mt-0.5 block text-xs text-[var(--color-text-dim)]">
              No effect on iOS — Web Vibration API unsupported.
            </span>
          </span>
        </label>
      </fieldset>

      {/*
        Phase 14 D-10 — Appearance theme picker (mirrors header ThemeToggle).
        Per D-28: this is "Appearance" not "Avatar theme" (which is the
        cosmetic slot from Phase 12). Writes via setThemePreference server
        action — same as the header ThemeToggle — so DB + cookie stay in sync.
      */}
      <fieldset className="border-t border-[var(--color-border)] pt-4">
        <legend className="mb-2 text-base font-semibold text-[var(--color-text)]">
          Appearance
        </legend>
        <p className="mb-3 text-sm text-[var(--color-text-muted)]">
          Choose the color theme for KitsuBeat.
        </p>
        <div
          className="flex flex-col gap-2"
          role="radiogroup"
          aria-label="Theme preference"
        >
          {(["system", "light", "dark"] as const).map((opt) => (
            <label
              key={opt}
              className="flex min-h-11 cursor-pointer items-center gap-2"
            >
              <input
                type="radio"
                name="themePreference"
                value={opt}
                checked={themePreference === opt}
                onChange={() => handleThemeChange(opt)}
                className="h-4 w-4 accent-[var(--color-accent)]"
              />
              <span className="text-sm capitalize text-[var(--color-text)]">{opt}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Submit + status */}
      <div className="flex items-center gap-4">
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={state.kind === "saving"}
        >
          {state.kind === "saving" ? "Saving..." : "Save"}
        </Button>
        {state.kind === "saved" && (
          <span className="text-sm text-[var(--color-grammar-adjective)]">Saved.</span>
        )}
        {state.kind === "error" && (
          <span className="text-sm text-[var(--color-accent)]">{state.message}</span>
        )}
      </div>
    </form>
  );
}
