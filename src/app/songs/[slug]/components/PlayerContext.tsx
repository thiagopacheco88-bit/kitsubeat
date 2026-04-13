"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

type TranslationLang = "en" | "pt-BR" | "es";

interface PlayerState {
  showFurigana: boolean;
  setShowFurigana: (v: boolean) => void;
  showRomaji: boolean;
  setShowRomaji: (v: boolean) => void;
  translationLang: TranslationLang;
  setTranslationLang: (v: TranslationLang) => void;
  currentTimeMs: number;
  setCurrentTimeMs: (v: number) => void;
}

const PlayerCtx = createContext<PlayerState | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [showFurigana, setShowFurigana] = useState(true);
  const [showRomaji, setShowRomaji] = useState(true);
  const [translationLang, setTranslationLang] =
    useState<TranslationLang>("en");
  const [currentTimeMs, setCurrentTimeMs] = useState(0);

  return (
    <PlayerCtx.Provider
      value={{
        showFurigana,
        setShowFurigana,
        showRomaji,
        setShowRomaji,
        translationLang,
        setTranslationLang,
        currentTimeMs,
        setCurrentTimeMs,
      }}
    >
      {children}
    </PlayerCtx.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerCtx);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
