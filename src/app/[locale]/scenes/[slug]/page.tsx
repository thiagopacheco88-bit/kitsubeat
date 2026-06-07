import { Suspense } from "react";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getSongBySlug } from "@/lib/db/queries";
import { getCurrentUserId } from "@/lib/user-prefs";
import { ScenePlayerLoader } from "./ScenePlayerLoader";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kitsubeat.vercel.app";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const scene = await getSongBySlug(slug);
  if (!scene || scene.content_type !== "scene") return { title: "Scene Not Found | KitsuBeat" };

  const canonicalUrl = `${SITE_URL}/scenes/${slug}`;
  const description = `Learn Japanese from "${scene.title}" — ${scene.anime}${scene.season_info ? ` (${scene.season_info})` : ""}. Interactive dialogue, vocabulary cards, and spaced repetition.`;

  return {
    title: `${scene.title} — ${scene.anime} | KitsuBeat`,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `${scene.title} — ${scene.anime}`,
      description,
      url: canonicalUrl,
      siteName: "KitsuBeat",
      type: "video.other",
    },
    twitter: {
      card: "summary_large_image",
      title: `${scene.title} — ${scene.anime}`,
      description,
    },
  };
}

export default async function ScenePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const userId = await getCurrentUserId();

  return (
    <Suspense
      fallback={
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
          <div
            className="animate-pulse rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)]"
            style={{ height: 420 }}
          />
        </div>
      }
    >
      <ScenePlayerLoader slug={slug} userId={userId} />
    </Suspense>
  );
}
