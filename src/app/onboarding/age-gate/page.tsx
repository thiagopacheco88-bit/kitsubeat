import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { CURRENT_TERMS_VERSION } from "@/lib/legal/versions";
import { AgeGateForm } from "./AgeGateForm";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const { userId } = await auth();
  const { redirect_url } = await searchParams;

  let initialDob: string | undefined;
  if (userId) {
    const row = await db
      .select({ date_of_birth: users.date_of_birth, terms_version: users.terms_version })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const record = row[0];

    // User already accepted the current terms — Clerk JWT or cookie was just missing
    // (e.g. new device, Clerk updateUserMetadata silently failed on original onboarding).
    // Route handler sets the cookie; Server Component pages cannot.
    if (record?.date_of_birth && record?.terms_version === CURRENT_TERMS_VERSION) {
      const target = redirect_url ?? "/";
      redirect(`/api/onboarding/resync?redirect_url=${encodeURIComponent(target)}`);
    }

    initialDob = record?.date_of_birth ?? undefined;
  }

  return <AgeGateForm initialDob={initialDob} />;
}
