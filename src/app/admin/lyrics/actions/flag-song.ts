"use server";

/**
 * Phase 11.5 SPEC #22: flag / unflag a song.
 *
 * Updates songs.quality_status + quality_notes. Revalidates public cache so the
 * catalog and the song page reflect the change immediately.
 *
 * Security:
 *   FLAG-T-01: TypeScript union restricts status enum; Drizzle pgEnum enforces at DB layer.
 *   FLAG-T-03: Both revalidateSongCache + revalidatePath called on every flag/clear.
 */

export const runtime = "nodejs";

import { db } from "@/lib/db";
import { songs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdminUser } from "@/lib/admin/require-admin";
import { revalidateSongCache } from "@/app/actions/cache";
import { revalidatePath } from "next/cache";

export interface FlagSongInput {
  songId: string;
  slug: string;
  status: "flagged_wrong_song" | "flagged_unfixable";
  notes: string;
}

export interface ClearFlagInput {
  songId: string;
  slug: string;
}

export type FlagResult = { ok: true } | { ok: false; error: string };

export async function flagSong(input: FlagSongInput): Promise<FlagResult> {
  await requireAdminUser();
  await db
    .update(songs)
    .set({
      quality_status: input.status,
      quality_notes: input.notes,
    })
    .where(eq(songs.id, input.songId));

  await revalidateSongCache(input.slug);
  revalidatePath("/songs");
  return { ok: true };
}

export async function clearFlag(input: ClearFlagInput): Promise<FlagResult> {
  await requireAdminUser();
  await db
    .update(songs)
    .set({
      quality_status: "active",
      quality_notes: null,
    })
    .where(eq(songs.id, input.songId));

  await revalidateSongCache(input.slug);
  revalidatePath("/songs");
  return { ok: true };
}
