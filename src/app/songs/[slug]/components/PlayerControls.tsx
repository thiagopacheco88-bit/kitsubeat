"use client";

import { usePlayer } from "./PlayerContext";

const LANGS = [
  { code: "en" as const, label: "English" },
  { code: "pt-BR" as const, label: "Portugues" },
  { code: "es" as const, label: "Espanol" },
];

export default function PlayerControls() {
  const {
    showFurigana,
    setShowFurigana,
    showRomaji,
    setShowRomaji,
    translationLang,
    setTranslationLang,
  } = usePlayer();

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 sm:gap-3 sm:px-4 sm:py-3">
      <Toggle
        label="Furigana"
        active={showFurigana}
        onToggle={() => setShowFurigana(!showFurigana)}
      />
      <Toggle
        label="Romaji"
        active={showRomaji}
        onToggle={() => setShowRomaji(!showRomaji)}
      />
      <div className="flex min-w-0 flex-wrap items-center gap-1 sm:ml-auto">
        {LANGS.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setTranslationLang(lang.code)}
            className={`min-h-11 rounded-[var(--radius-sm)] px-2 py-1 text-xs font-medium transition-colors ${
              translationLang === lang.code
                ? "bg-[var(--color-text)] text-[var(--color-bg)]"
                : "bg-[var(--color-card-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`min-h-11 rounded-[var(--radius-sm)] px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-[var(--color-accent)]/15 text-[var(--color-accent-readable)]"
          : "bg-[var(--color-card-2)] text-[var(--color-text-dim)] hover:text-[var(--color-text-muted)]"
      }`}
    >
      {label} {active ? "ON" : "OFF"}
    </button>
  );
}
