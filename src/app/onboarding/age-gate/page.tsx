import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { AgeGateForm } from "./AgeGateForm";

export default async function OnboardingPage() {
  const { userId } = await auth();

  let initialDob: string | undefined;
  if (userId) {
    const row = await db
      .select({ date_of_birth: users.date_of_birth })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    initialDob = row[0]?.date_of_birth ?? undefined;
  }

  return <AgeGateForm initialDob={initialDob} />;
}
