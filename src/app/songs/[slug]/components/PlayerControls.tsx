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
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-800 bg-gray-900 px-4 py-3">
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
      <div className="ml-auto flex items-center gap-1">
        {LANGS.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setTranslationLang(lang.code)}
            className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
              translationLang === lang.code
                ? "bg-white text-gray-900"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
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
      className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-red-500/20 text-red-400"
          : "bg-gray-800 text-gray-500 hover:bg-gray-700"
      }`}
    >
      {label} {active ? "ON" : "OFF"}
    </button>
  );
}
