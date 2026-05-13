// src/app/sitemap.test.ts
// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';

// Mock BEFORE importing sitemap
vi.mock('@/lib/journal/articles', () => ({
  getAllArticles: vi.fn(),
}));
vi.mock('@/lib/db/queries', () => ({
  getAllSongSlugsForSitemap: vi.fn(),
}));

import { getAllArticles } from '@/lib/journal/articles';
import { getAllSongSlugsForSitemap } from '@/lib/db/queries';
import sitemap from './sitemap';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kitsubeat.vercel.app';

describe('sitemap()', () => {
  afterEach(() => vi.clearAllMocks());

  it('includes the homepage as first entry', async () => {
    vi.mocked(getAllArticles).mockReturnValue([]);
    vi.mocked(getAllSongSlugsForSitemap).mockResolvedValue([]);
    const entries = await sitemap();
    expect(entries[0].url).toBe(BASE);
    expect(entries[0].priority).toBe(1);
  });

  it('includes /journal and /songs static entries', async () => {
    vi.mocked(getAllArticles).mockReturnValue([]);
    vi.mocked(getAllSongSlugsForSitemap).mockResolvedValue([]);
    const entries = await sitemap();
    expect(entries.find((e) => e.url === `${BASE}/journal`)).toBeDefined();
    expect(entries.find((e) => e.url === `${BASE}/songs`)).toBeDefined();
    expect(entries.find((e) => e.url === `${BASE}/anime-list`)).toBeDefined();
  });

  it('includes one entry per article', async () => {
    vi.mocked(getAllArticles).mockReturnValue([
      {
        slug: 'test-article',
        title: 'Test',
        date: '2026-05-10',
        coverImage: '/img.jpg',
        category: 'lore' as const,
        summary: 'summary',
        readingTimeComputed: '3 min read',
      },
    ]);
    vi.mocked(getAllSongSlugsForSitemap).mockResolvedValue([]);
    const entries = await sitemap();
    const articleEntry = entries.find((e) => e.url === `${BASE}/journal/test-article`);
    expect(articleEntry).toBeDefined();
    expect(articleEntry?.changeFrequency).toBe('monthly');
    expect(articleEntry?.priority).toBe(0.7);
  });

  it('includes one entry per song', async () => {
    vi.mocked(getAllArticles).mockReturnValue([]);
    vi.mocked(getAllSongSlugsForSitemap).mockResolvedValue([
      { slug: 'guren-no-yumiya', updated_at: new Date('2026-01-01') },
    ]);
    const entries = await sitemap();
    const songEntry = entries.find((e) => e.url === `${BASE}/songs/guren-no-yumiya`);
    expect(songEntry).toBeDefined();
    expect(songEntry?.changeFrequency).toBe('weekly');
    expect(songEntry?.priority).toBe(0.8);
  });

  it('returns only static entries when no songs or articles exist', async () => {
    vi.mocked(getAllArticles).mockReturnValue([]);
    vi.mocked(getAllSongSlugsForSitemap).mockResolvedValue([]);
    const entries = await sitemap();
    // homepage + /songs + /anime-list + /journal = 4 static entries
    expect(entries).toHaveLength(4);
  });
});
