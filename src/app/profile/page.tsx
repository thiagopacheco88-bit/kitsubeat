import { Suspense } from "react";
import { getUserPrefs, isPremium } from "@/app/actions/userPrefs";
import {
  DEFAULT_NEW_CARD_CAP,
  getCurrentUserId,
  PREMIUM_NEW_CARD_CAP_CEILING,
} from "@/lib/user-prefs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import ProfileForm from "./ProfileForm";
import { ProfileHud } from "./ProfileHud";
import GlobalLearnedCounter from "@/app/components/GlobalLearnedCounter";
import { ProfileNudgeBanner } from "@/components/ProfileNudgeBanner";
import { DataExportButton } from "@/components/DataExportButton";

export default async function ProfilePage() {
  const userId = await getCurrentUserId();
  const [prefs, premium, userData] = await Promise.all([
    getUserPrefs(userId),
    isPremium(userId),
    db.select({ date_of_birth: users.date_of_birth }).from(users).where(eq(users.id, userId)).limit(1).then((rows) => rows[0] ?? null),
  ]);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 text-[var(--color-text)] sm:px-6">
      {!userData?.date_of_birth && <ProfileNudgeBanner userId={userId} />}
      <header className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card-ring-strong)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
          Account
        </p>
        <h1 className="mt-1 text-3xl font-bold">Profile</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Tune your learning defaults, daily limits, and interface preferences.
        </p>
      </header>
      <Suspense fallback={
        <div className="animate-pulse rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-6 flex items-center gap-6 mb-6">
          <div className="shrink-0 rounded-full bg-[var(--color-card-2)]" style={{ width: 72, height: 72 }} />
          <div className="flex-1 flex flex-col gap-3">
            <div className="h-5 w-24 rounded bg-[var(--color-card-2)]" />
            <div className="h-2 w-full rounded-full bg-[var(--color-card-2)]" />
            <div className="h-4 w-40 rounded bg-[var(--color-card-2)]" />
          </div>
        </div>
      }>
        <ProfileHud userId={userId} />
      </Suspense>
      <div>
        <Suspense fallback={
          <div className="animate-pulse rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 flex items-center justify-between">
            <div className="h-5 w-36 rounded bg-[var(--color-card-2)]" />
            <div className="h-7 w-16 rounded bg-[var(--color-card-2)]" />
          </div>
        }>
          <GlobalLearnedCounter variant="profile" />
        </Suspense>
      </div>
      <section aria-labelledby="account-section-heading" className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card-ring)] sm:p-6">
        <h2 id="account-section-heading" className="text-[20px] font-bold text-[var(--color-text)]">Account</h2>
        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4 mt-2">
          <div>
            <p className="text-sm text-[var(--color-text)]">Download my data</p>
            <p className="text-sm text-[var(--color-text-muted)]">Export all your KitsuBeat data as JSON (GDPR/LGPD right of access)</p>
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
