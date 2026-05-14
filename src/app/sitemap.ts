// src/app/sitemap.ts
// Next.js auto-serves this file at /sitemap.xml via MetadataRoute.Sitemap.
// Place at src/app/sitemap.ts (NOT inside a subdirectory) — must be at app root.
//
// I18N-07: alternates.languages added to all entry types for hreflang SEO.
// next-intl middleware also emits link hreflang response headers automatically;
// sitemap alternates are belt-and-suspenders for crawlers that prefer XML sitemaps.
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
    alternates: {
      languages: {
        'pt-BR': `${BASE_URL}/pt-BR/journal/${a.slug}`,
        'es': `${BASE_URL}/es/journal/${a.slug}`,
      },
    },
  }));

  const songEntries: MetadataRoute.Sitemap = songSlugs.map(({ slug, updated_at }) => ({
    url: `${BASE_URL}/songs/${slug}`,
    lastModified: updated_at,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
    alternates: {
      languages: {
        'pt-BR': `${BASE_URL}/pt-BR/songs/${slug}`,
        'es': `${BASE_URL}/es/songs/${slug}`,
      },
    },
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
      alternates: {
        languages: {
          'pt-BR': `${BASE_URL}/pt-BR`,
          'es': `${BASE_URL}/es`,
        },
      },
    },
    {
      url: `${BASE_URL}/songs`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
      alternates: {
        languages: {
          'pt-BR': `${BASE_URL}/pt-BR/songs`,
          'es': `${BASE_URL}/es/songs`,
        },
      },
    },
    {
      url: `${BASE_URL}/anime-list`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
      alternates: {
        languages: {
          'pt-BR': `${BASE_URL}/pt-BR/anime-list`,
          'es': `${BASE_URL}/es/anime-list`,
        },
      },
    },
    {
      url: `${BASE_URL}/journal`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      alternates: {
        languages: {
          'pt-BR': `${BASE_URL}/pt-BR/journal`,
          'es': `${BASE_URL}/es/journal`,
        },
      },
    },
    ...songEntries,
    ...articleEntries,
  ];
}
