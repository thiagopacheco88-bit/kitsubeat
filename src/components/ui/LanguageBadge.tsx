/**
 * LanguageBadge — Phase 18.1 Plan 03 (I18N-03).
 *
 * Server Component — no "use client" directive.
 * Renders the language indicator badge on journal cards to mark the
 * original article language (e.g., "EN") when viewing in a different locale.
 *
 * Usage: show on JournalCard when the article locale differs from the
 * user's current UI locale (e.g., PT-BR user viewing English articles).
 *
 * Style: matches the existing Badge component pattern for JLPT/difficulty
 * badges — inline-flex rounded-full with card-2 background and border ring.
 *
 * Token discipline: all colors via var(--color-*), no raw hex, no Tailwind
 * palette utilities (D-12, PATTERNS.md CSS Token Discipline).
 */

interface LanguageBadgeProps {
  /** The locale of the article — defaults to 'en' */
  locale?: string;
}

export function LanguageBadge({ locale = "en" }: LanguageBadgeProps) {
  // Derive 2-character display code: 'en' → 'EN', 'pt-BR' → 'PT', 'es' → 'ES'
  const code = locale.toUpperCase().slice(0, 2);
  const fullName =
    locale === "en"
      ? "English"
      : locale === "pt-BR"
        ? "Portuguese"
        : locale === "es"
          ? "Spanish"
          : locale;

  return (
    <span
      className="inline-flex items-center rounded-full bg-[var(--color-card-2)] border border-[var(--color-border)] px-2 py-0.5 text-xs font-semibold text-[var(--color-text-muted)]"
      aria-label={`Article in ${fullName}`}
    >
      {code}
    </span>
  );
}
