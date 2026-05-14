"use server";
import { auth, clerkClient } from "@clerk/nextjs/server";

const VALID_LOCALES = ['en', 'pt-BR', 'es'] as const;
type ValidLocale = typeof VALID_LOCALES[number];

export async function syncLocaleToClerk(locale: string): Promise<void> {
  // Validate locale before any Clerk call (RESEARCH Pitfall: locale injection)
  if (!(VALID_LOCALES as readonly string[]).includes(locale)) return;

  const { userId } = await auth();
  if (!userId) return; // Unauthed — kb_locale cookie is sufficient

  try {
    const client = await clerkClient();
    // updateUserMetadata MERGES publicMetadata — does not wipe existing keys (e.g. terms_version).
    // Verified against Clerk v7 docs (RESEARCH A2 resolution).
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { locale: locale as ValidLocale },
    });
  } catch {
    // Fail silently — cookie drives routing; Clerk sync is background enhancement
  }
}
