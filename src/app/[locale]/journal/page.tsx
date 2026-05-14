/**
 * /[locale]/journal — Locale-aware journal listing page (PT-BR and ES routes).
 *
 * English stays at /journal (src/app/journal/page.tsx — UNCHANGED).
 * /pt-BR/journal and /es/journal resolve here via the [locale] segment.
 *
 * D-12: locale articles appear first (no badge — they are primary content).
 * EN articles appear below with an EN LanguageBadge.
 *
 * BLAST RADIUS: new file only — src/app/journal/page.tsx (EN canonical) UNCHANGED.
 */
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { getArticlesByLocale } from "@/lib/journal/articles";
import { JournalCard } from "@/app/journal/components/JournalCard";
import { LanguageBadge } from "@/components/ui/LanguageBadge";

export default async function LocaleJournalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // MUST be first — enables static rendering for locale segment
  setRequestLocale(locale);

  const t = await getTranslations("journal");

  // D-12: locale articles first, then EN articles below with EN badge
  const localeArticles =
    locale !== "en"
      ? getArticlesByLocale(locale as "pt-BR" | "es")
      : [];
  const enArticles = getArticlesByLocale("en");

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
      {/* Page header — mirrors src/app/journal/page.tsx pattern */}
      <header className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card-ring-strong)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
          Content Hub
        </p>
        <h1 className="mt-1 text-3xl font-bold text-[var(--color-text)]">
          {t("heading")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-muted)]">
          {t("subheading")}
        </p>
      </header>

      {localeArticles.length === 0 && enArticles.length === 0 ? (
        /* Empty state — graceful, no crash */
        <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-12 text-center">
          <p className="text-[var(--color-text-muted)]">
            No articles yet — check back soon.
          </p>
        </div>
      ) : (
        <>
          {/* D-12: Locale articles appear first — no badge (they are primary content) */}
          {localeArticles.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {localeArticles.map((article) => (
                <JournalCard key={article.slug} article={article} />
              ))}
            </div>
          )}

          {/* D-12: EN articles appear below with EN badge */}
          {enArticles.length > 0 && (
            <>
              {localeArticles.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-[var(--color-border)]" />
                  <LanguageBadge locale="en" />
                  <div className="h-px flex-1 bg-[var(--color-border)]" />
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {enArticles.map((article) => (
                  <div key={article.slug} className="relative">
                    {/* EN badge overlaid on top-right of card when locale content is also shown */}
                    {localeArticles.length > 0 && (
                      <div className="absolute right-2 top-2 z-10">
                        <LanguageBadge locale="en" />
                      </div>
                    )}
                    <JournalCard article={article} />
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}
