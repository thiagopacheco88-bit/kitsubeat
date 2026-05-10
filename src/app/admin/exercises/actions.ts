"use server";

import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { vocabularyItems } from "@/lib/db/schema";
import { revalidateTag } from "next/cache";

async function requireAdmin() {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function updateVocabImage(vocabItemId: string, imageUrl: string | null) {
  await requireAdmin();

  // Basic URL validation — must be https or null (clear)
  if (imageUrl !== null && !imageUrl.startsWith("https://")) {
    throw new Error("Image URL must start with https://");
  }

  await db
    .update(vocabularyItems)
    .set({ image_url: imageUrl })
    .where(eq(vocabularyItems.id, vocabItemId));

  // Bust all song caches that may include this vocab item
  revalidateTag("vocab");
}

export async function updateVocabFlag(
  vocabItemId: string,
  flagged: boolean,
  note: string | null
) {
  await requireAdmin();

  await db
    .update(vocabularyItems)
    .set({
      admin_flagged: flagged,
      admin_flag_note: note?.trim() || null,
    })
    .where(eq(vocabularyItems.id, vocabItemId));
}
