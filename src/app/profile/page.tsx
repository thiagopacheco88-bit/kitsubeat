import { getUserPrefs, isPremium } from "@/app/actions/userPrefs";
import {
  DEFAULT_NEW_CARD_CAP,
  getCurrentUserId,
  PREMIUM_NEW_CARD_CAP_CEILING,
} from "@/lib/user-prefs";
import ProfileForm from "./ProfileForm";
import { ProfileHud } from "./ProfileHud";
import GlobalLearnedCounter from "@/app/components/GlobalLearnedCounter";

export default async function ProfilePage() {
  const userId = await getCurrentUserId();
  const [prefs, premium] = await Promise.all([
    getUserPrefs(userId),
    isPremium(userId),
  ]);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 text-[var(--color-text)] sm:px-6">
      <header className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card-ring-strong)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
          Account
        </p>
        <h1 className="mt-1 text-3xl font-bold">Profile</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Tune your learning defaults, daily limits, and interface preferences.
        </p>
      </header>
      <ProfileHud userId={userId} />
      <div>
        <GlobalLearnedCounter variant="profile" />
      </div>
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
        />
      </section>
    </main>
  );
}
