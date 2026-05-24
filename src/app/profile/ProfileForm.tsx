"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { updateUserPrefs, setThemePreference } from "@/app/actions/userPrefs";
import { Button } from "@/components/ui/Button";

type ThemePref = "light" | "dark";
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
  /** Phase 14.4: Social opt-in toggle */
  initialSocialActivityEnabled: boolean;
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
  initialSocialActivityEnabled,
}: ProfileFormProps) {
  const t = useTranslations("settings");
  const [skipLearning, setSkipLearning] = useState(initialSkipLearning);
  const [newCardCap, setNewCardCap] = useState<number>(initialNewCardCap);
  const [soundEnabled, setSoundEnabled] = useState(initialSoundEnabled);
  const [hapticsEnabled, setHapticsEnabled] = useState(initialHapticsEnabled);
  const [socialActivityEnabled, setSocialActivityEnabled] = useState(initialSocialActivityEnabled);
  const [state, setState] = useState<SaveState>({ kind: "idle" });

  // Phase 14 D-10 — Appearance state. Seeded from kb_theme cookie on mount
  // (the layout.tsx inline script + SSR cookie read have already settled the
  // visual state; this just mirrors it into the form's local state).
  const [themePreference, setThemePreferenceLocal] =
    useState<ThemePref>("dark");
  useEffect(() => {
    const m =
      typeof document !== "undefined"
        ? document.cookie.match(/kb_theme=(light|dark)/)
        : null;
    if (m) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThemePreferenceLocal(m[1] as ThemePref);
    }
  }, []);

  const handleThemeChange = async (next: ThemePref) => {
    document.documentElement.setAttribute("data-theme", next);
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `kb_theme=${next}; max-age=${COOKIE_MAX_AGE}; path=/; samesite=lax`;
    setThemePreferenceLocal(next);

    // Server action — DB column write
    try {
      await setThemePreference(next);
    } catch (err) {
      // Non-fatal: the cookie write already kept things consistent client-side
      console.error("setThemePreference failed:", err);
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
      await updateUserPrefs({
        skipLearning,
        newCardCap: capToSend,
        soundEnabled,
        hapticsEnabled,
        socialActivityEnabled,
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
            {t("learning.skipLearnCards")}
          </span>
          <span className="block text-sm text-[var(--color-text-muted)]">
            {t("learning.skipLearnCardsDesc")}
          </span>
        </span>
      </label>

      {/* new_card_cap input — disabled for free users */}
      <div>
        <label
          htmlFor="new-card-cap"
          className="block font-medium text-[var(--color-text)]"
        >
          {t("learning.newWordsPerSession")}
        </label>
        <p className="mb-2 text-sm text-[var(--color-text-muted)]">
          {t("learning.newWordsDesc", { n: defaultCap })}
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
            {t("learning.upgradePremiumCap", { max: maxCap })}
          </p>
        )}
        {isPremium && (
          <p id="cap-help" className="mt-2 text-xs text-[var(--color-text-dim)]">
            {t("learning.capRange", { max: maxCap })}
          </p>
        )}
      </div>

      {/* Celebration effects — sound + haptics toggles */}
      <fieldset className="space-y-4">
        <legend className="font-medium text-[var(--color-text)]">{t("celebration.heading")}</legend>

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
              {t("celebration.sound")}
            </span>
            <span className="block text-sm text-[var(--color-text-muted)]">
              {t("celebration.soundDesc")}
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
              {t("celebration.haptics")}
            </span>
            <span className="block text-sm text-[var(--color-text-muted)]">
              {t("celebration.hapticsDesc")}
            </span>
            <span className="mt-0.5 block text-xs text-[var(--color-text-dim)]">
              {t("celebration.hapticsIosNote")}
            </span>
          </span>
        </label>
      </fieldset>

      {/* Phase 14.4 D-15/D-17 — Social & notifications section */}
      <fieldset className="border-t border-[var(--color-border)] pt-4 space-y-4">
        <legend className="mb-2 text-base font-semibold text-[var(--color-text)]">
          {t("social.heading")}
        </legend>

        <label className="flex min-h-14 cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name="socialActivityEnabled"
            checked={socialActivityEnabled}
            onChange={(e) => {
              setSocialActivityEnabled(e.target.checked);
              setState({ kind: "idle" });
            }}
            className="mt-1 h-4 w-4 rounded border-[var(--color-border-strong)] bg-[var(--color-card-2)] accent-[var(--color-accent)]"
          />
          <span>
            <span className="block font-medium text-[var(--color-text)]">
              {t("social.activityLabel")}
            </span>
            <ul className="mt-1 list-disc pl-4 text-sm text-[var(--color-text-muted)] space-y-0.5">
              <li>{t("social.bullet1")}</li>
              <li>{t("social.bullet2")}</li>
              <li>{t("social.bullet3")}</li>
              <li>{t("social.bullet4")}</li>
            </ul>
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
          {t("appearance.heading")}
        </legend>
        <p className="mb-3 text-sm text-[var(--color-text-muted)]">
          {t("appearance.desc")}
        </p>
        <div
          className="flex flex-col gap-2"
          role="radiogroup"
          aria-label={t("appearance.heading")}
        >
          {(["dark", "light"] as const).map((opt) => (
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
              <span className="text-sm capitalize text-[var(--color-text)]">
                {t(`theme.${opt}`)}
              </span>
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
          {state.kind === "saving" ? t("form.saving") : t("form.save")}
        </Button>
        {state.kind === "saved" && (
          <span className="text-sm text-[var(--color-grammar-adjective)]">{t("form.saved")}</span>
        )}
        {state.kind === "error" && (
          <span className="text-sm text-[var(--color-accent)]">{state.message}</span>
        )}
      </div>
    </form>
  );
}
