import { Suspense } from "react";
import { getSongBySlug } from "@/lib/db/queries";
import { getCurrentUserId } from "@/lib/user-prefs";
import { SongPlayerLoader } from "./SongPlayerLoader";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const song = await getSongBySlug(slug);
  if (!song) return { title: "Song Not Found | KitsuBeat" };
  return { title: `${song.title} - ${song.artist} | KitsuBeat` };
}

export default async function SongPlayerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const userId = await getCurrentUserId();

  return (
    <Suspense fallback={
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-6 sm:px-6">
        <div className="animate-pulse rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 sm:p-6">
          <div className="h-3 w-20 rounded bg-[var(--color-card-2)]" />
          <div className="mt-2 h-8 w-64 rounded bg-[var(--color-card-2)]" />
          <div className="mt-2 h-4 w-48 rounded bg-[var(--color-card-2)]" />
          <div className="mt-4 flex gap-2">
            <div className="h-9 w-24 rounded-[var(--radius-md)] bg-[var(--color-card-2)]" />
            <div className="h-9 w-24 rounded-[var(--radius-md)] bg-[var(--color-card-2)]" />
          </div>
        </div>
        <div className="animate-pulse rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)]" style={{ height: 420 }} />
      </div>
    }>
      <SongPlayerLoader slug={slug} userId={userId} />
    </Suspense>
  );
}
