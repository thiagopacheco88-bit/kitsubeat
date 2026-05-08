/**
 * Phase 14.4 D-03 — Shared email layout helpers.
 * Hand-written HTML strings — no react-email dep.
 * Colors resolved from Phase 14 token values as hex (CSS vars unsupported in email clients).
 */

const BRAND_BG = "#0f0f13";
const BRAND_CARD = "#1a1a24";
const BRAND_TEXT = "#e8e8f0";
const BRAND_MUTED = "#9090a8";
const BRAND_ACCENT = "#ff6b6b";

export function renderHeader(): string {
  return `<div style="background:${BRAND_BG};padding:24px 24px 0;text-align:center;"><h1 style="color:${BRAND_ACCENT};font-family:sans-serif;font-size:22px;margin:0;">KitsuBeat</h1></div>`;
}

export function renderFooter(): string {
  return `<div style="background:${BRAND_BG};padding:16px 24px;text-align:center;"><p style="color:${BRAND_MUTED};font-family:sans-serif;font-size:12px;margin:0;">You're receiving this because you opted in to social activity emails. <a href="https://kitsubeat.app/profile" style="color:${BRAND_ACCENT};">Manage preferences</a></p></div>`;
}

export function wrapLayout(body: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:${BRAND_BG};"><table width="100%" style="max-width:600px;margin:0 auto;"><tr><td>${renderHeader()}</td></tr><tr><td style="background:${BRAND_CARD};padding:24px;">${body}</td></tr><tr><td>${renderFooter()}</td></tr></table></body></html>`;
}

// Re-export brand colors for use in templates (hex literals — not CSS vars)
export const EMAIL_COLORS = {
  BG: BRAND_BG,
  CARD: BRAND_CARD,
  TEXT: BRAND_TEXT,
  MUTED: BRAND_MUTED,
  ACCENT: BRAND_ACCENT,
} as const;
