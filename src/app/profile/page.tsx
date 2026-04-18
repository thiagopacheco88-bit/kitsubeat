import { getUserPrefs, isPremium } from "@/app/actions/userPrefs";
import {
  DEFAULT_NEW_CARD_CAP,
  PLACEHOLDER_USER_ID,
  PREMIUM_NEW_CARD_CAP_CEILING,
} from "@/lib/user-prefs";
import ProfileForm from "./ProfileForm";
import GlobalLearnedCounter from "@/app/components/GlobalLearnedCounter";

export default async function ProfilePage() {
  const userId = PLACEHOLDER_USER_ID;
  const [prefs, premium] = await Promise.all([
    getUserPrefs(userId),
    isPremium(userId),
  ]);

  return (
    <main className="mx-auto max-w-xl px-4 py-8 text-white">
      <h1 className="mb-6 text-2xl font-semibold">Profile</h1>
      <div className="mb-6">
        <GlobalLearnedCounter variant="profile" />
      </div>
      <section className="rounded-xl border border-gray-700 bg-gray-900 p-6">
        <h2 className="mb-4 text-lg font-semibold">Learning preferences</h2>
        <ProfileForm
          userId={userId}
          initialSkipLearning={prefs.skipLearning}
          initialNewCardCap={prefs.newCardCap}
          isPremium={premium}
          defaultCap={DEFAULT_NEW_CARD_CAP}
          maxCap={PREMIUM_NEW_CARD_CAP_CEILING}
        />
      </section>
    </main>
  );
}
