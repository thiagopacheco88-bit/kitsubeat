/**
 * /[locale]/profile — Locale-aware profile/settings page (PT-BR and ES routes).
 *
 * English stays at /profile (src/app/profile/page.tsx — UNCHANGED).
 * /pt-BR/profile and /es/profile resolve here via the [locale] segment.
 *
 * Renders translated heading and section labels via getTranslations('settings').
 * D-04: language preference row displayed with translation key labels.
 * The LanguagePicker in the nav provides the primary language switch;
 * this page shows an informational language preference row per D-04.
 *
 * BLAST RADIUS: new file only — src/app/profile/page.tsx (EN canonical) UNCHANGED.
 */
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { getUserPrefs, isPremium } from "@/app/actions/userPrefs";
import {
  DEFAULT_NEW_CARD_CAP,
  getCurrentUserId,
  PREMIUM_NEW_CARD_CAP_CEILING,
} from "@/lib/user-prefs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import ProfileForm from "@/app/profile/ProfileForm";
import { ProfileHud } from "@/app/profile/ProfileHud";
import GlobalLearnedCounter from "@/app/components/GlobalLearnedCounter";
import { ProfileNudgeBanner } from "@/components/ProfileNudgeBanner";
import { DataExportButton } from "@/components/DataExportButton";
import { LanguagePicker } from "@/components/ui/LanguagePicker";

export default async function LocaleProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // MUST be first — enables static rendering for locale segment
  setRequestLocale(locale);

  const t = await getTranslations("settings");
  const userId = await getCurrentUserId();
  const [prefs, premium, userData] = await Promise.all([
    getUserPrefs(userId),
    isPremium(userId),
    db
      .select({ date_of_birth: users.date_of_birth })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 text-[var(--color-text)] sm:px-6">
      {!userData?.date_of_birth && <ProfileNudgeBanner userId={userId} />}
      <header className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card-ring-strong)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
          Account
        </p>
        <h1 className="mt-1 text-3xl font-bold">{t("heading")}</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Tune your learning defaults, daily limits, and interface preferences.
        </p>
      </header>
      <Suspense
        fallback={
          <div className="animate-pulse rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-6 flex items-center gap-6 mb-6">
            <div
              className="shrink-0 rounded-full bg-[var(--color-card-2)]"
              style={{ width: 72, height: 72 }}
            />
            <div className="flex-1 flex flex-col gap-3">
              <div className="h-5 w-24 rounded bg-[var(--color-card-2)]" />
              <div className="h-2 w-full rounded-full bg-[var(--color-card-2)]" />
              <div className="h-4 w-40 rounded bg-[var(--color-card-2)]" />
            </div>
          </div>
        }
      >
        <ProfileHud userId={userId} />
      </Suspense>
      <div>
        <Suspense
          fallback={
            <div className="animate-pulse rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 flex items-center justify-between">
              <div className="h-5 w-36 rounded bg-[var(--color-card-2)]" />
              <div className="h-7 w-16 rounded bg-[var(--color-card-2)]" />
            </div>
          }
        >
          <GlobalLearnedCounter variant="profile" />
        </Suspense>
      </div>

      {/* D-04: Language preference row — secondary language selector in profile */}
      <section
        aria-labelledby="language-section-heading"
        className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card-ring)] sm:p-6"
      >
        <h2 id="language-section-heading" className="text-[20px] font-bold text-[var(--color-text)]">
          {t("language.label")}
        </h2>
        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4 mt-2">
          <div>
            <p className="text-sm text-[var(--color-text)]">{t("language.label")}</p>
            <p className="text-sm text-[var(--color-text-muted)]">
              {t("language.description")}
            </p>
          </div>
          <LanguagePicker currentLocale={locale as "en" | "pt-BR" | "es"} />
        </div>
      </section>

      <section
        aria-labelledby="account-section-heading"
        className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card-ring)] sm:p-6"
      >
        <h2
          id="account-section-heading"
          className="text-[20px] font-bold text-[var(--color-text)]"
        >
          {t("account.heading")}
        </h2>
        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4 mt-2">
          <div>
            <p className="text-sm text-[var(--color-text)]">{t("data.export")}</p>
            <p className="text-sm text-[var(--color-text-muted)]">
              Export all your KitsuBeat data as JSON (GDPR/LGPD right of access)
            </p>
          </div>
          <DataExportButton />
        </div>
      </section>
      <section className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card-ring)] sm:p-6">
        <h2 className="mb-4 text-xl font-semibold">Learning preferences</h2>
        <ProfileForm
          userId={userId}
          initialSkipLearning={prefs.skipLearning}
          initialNewCardCap={prefs.newCardCap}
          isPremium={premium}
          defaultCap={DEFAULT_NEW_CARD_CAP}
          maxCap={PREMIUM_NEW_CARD_CAP_CEILING}
          initialSoundEnabled={prefs.soundEnabled}
          initialHapticsEnabled={prefs.hapticsEnabled}
          initialSocialActivityEnabled={prefs.socialActivityEnabled}
        />
      </section>
    </main>
  );
}
