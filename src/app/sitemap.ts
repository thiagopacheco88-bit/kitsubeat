// src/app/sitemap.ts
// Next.js auto-serves this file at /sitemap.xml via MetadataRoute.Sitemap.
// Place at src/app/sitemap.ts (NOT inside a subdirectory) — must be at app root.
import type { MetadataRoute } from 'next';
import { getAllArticles } from '@/lib/journal/articles';
import { getAllSongSlugsForSitemap } from '@/lib/db/queries';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kitsubeat.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, songSlugs] = await Promise.all([
    Promise.resolve(getAllArticles()),
    getAllSongSlugsForSitemap(),
  ]);

  const articleEntries: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${BASE_URL}/journal/${a.slug}`,
    lastModified: new Date(a.dateModified ?? a.date),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  const songEntries: MetadataRoute.Sitemap = songSlugs.map(({ slug, updated_at }) => ({
    url: `${BASE_URL}/songs/${slug}`,
    lastModified: updated_at,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${BASE_URL}/songs`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/anime-list`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/journal`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    ...songEntries,
    ...articleEntries,
  ];
}
