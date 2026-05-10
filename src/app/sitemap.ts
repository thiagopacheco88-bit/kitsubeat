// src/app/sitemap.ts
// Next.js auto-serves this file at /sitemap.xml via MetadataRoute.Sitemap.
// Place at src/app/sitemap.ts (NOT inside a subdirectory) — must be at app root.
import type { MetadataRoute } from 'next';
import { getAllArticles } from '@/lib/journal/articles';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kitsubeat.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const articles = getAllArticles();

  const articleEntries: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${BASE_URL}/journal/${a.slug}`,
    lastModified: new Date(a.date),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${BASE_URL}/journal`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    ...articleEntries,
  ];
}
