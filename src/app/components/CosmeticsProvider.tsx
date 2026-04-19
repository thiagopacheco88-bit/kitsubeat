"use client";

import type React from "react";

interface CosmeticsProviderProps {
  theme: { css_vars: Record<string, string>; label: string } | null;
  children: React.ReactNode;
}

/**
 * CosmeticsProvider — lightweight client wrapper applying equipped theme
 * CSS variables to its subtree.
 *
 * Applied ONLY on /path and /profile wrappers — never in layout.tsx or on
 * /songs — so cosmetics never leak to the song catalog (M4 constraint).
 *
 * When theme is null (no equipped color theme), renders children unchanged
 * (no wrapper div style attribute at all).
 */
export function CosmeticsProvider({ theme, children }: CosmeticsProviderProps) {
  if (!theme) {
    return <>{children}</>;
  }

  return (
    <div style={theme.css_vars as React.CSSProperties}>{children}</div>
  );
}
