import { Suspense } from "react";
import type { Metadata } from "next";
import { getSongBySlug } from "@/lib/db/queries";
import { getCurrentUserId } from "@/lib/user-prefs";
import { SongPlayerLoader } from "./SongPlayerLoader";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kitsubeat.vercel.app';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const song = await getSongBySlug(slug);
  if (!song) return { title: "Song Not Found | KitsuBeat" };

  const canonicalUrl = `${SITE_URL}/songs/${slug}`;
  const description = `Learn Japanese from "${song.title}" by ${song.artist}${song.anime ? ` (${song.anime})` : ''}. Interactive lyrics, vocabulary cards, and spaced repetition.`;

  return {
    title: `${song.title} - ${song.artist} | KitsuBeat`,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `${song.title} - ${song.artist}`,
      description,
      url: canonicalUrl,
      siteName: 'KitsuBeat',
      type: 'music.song',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${song.title} - ${song.artist}`,
      description,
    },
  };
}

export default async function SongPlayerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const userId = await getCurrentUserId();
  const song = await getSongBySlug(slug);

  const musicRecordingJsonLd = song
    ? {
        '@context': 'https://schema.org',
        '@type': 'MusicRecording',
        '@id': `${SITE_URL}/songs/${slug}`,
        name: song.title,
        byArtist: { '@type': 'MusicGroup', name: song.artist },
        ...(song.anime ? { inAlbum: { '@type': 'MusicAlbum', name: song.anime } } : {}),
        ...(song.year_launched ? { datePublished: String(song.year_launched) } : {}),
        url: `${SITE_URL}/songs/${slug}`,
        inLanguage: 'ja',
        description: `Learn Japanese vocabulary from "${song.title}" by ${song.artist}${song.anime ? ` from ${song.anime}` : ''}.`,
        isPartOf: { '@type': 'WebSite', name: 'KitsuBeat', url: SITE_URL },
      }
    : null;

  const breadcrumbJsonLd = song
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Songs', item: `${SITE_URL}/songs` },
          { '@type': 'ListItem', position: 3, name: song.title, item: `${SITE_URL}/songs/${slug}` },
        ],
      }
    : null;

  return (
    <>
      {musicRecordingJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(musicRecordingJsonLd).replace(/</g, '\\u003c') }}
        />
      )}
      {breadcrumbJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }}
        />
      )}
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
    </>
  );
}
