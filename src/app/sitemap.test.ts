// src/app/sitemap.test.ts
// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';

// Mock getAllArticles BEFORE importing sitemap
vi.mock('@/lib/journal/articles', () => ({
  getAllArticles: vi.fn(),
}));

import { getAllArticles } from '@/lib/journal/articles';
import sitemap from './sitemap';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kitsubeat.vercel.app';

describe('sitemap()', () => {
  afterEach(() => vi.clearAllMocks());

  it('includes the homepage as first entry', () => {
    vi.mocked(getAllArticles).mockReturnValue([]);
    const entries = sitemap();
    expect(entries[0].url).toBe(BASE);
    expect(entries[0].priority).toBe(1);
  });

  it('includes /journal entry', () => {
    vi.mocked(getAllArticles).mockReturnValue([]);
    const entries = sitemap();
    const journalIndex = entries.find((e) => e.url === `${BASE}/journal`);
    expect(journalIndex).toBeDefined();
    expect(journalIndex?.changeFrequency).toBe('weekly');
  });

  it('includes one entry per article', () => {
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
    const entries = sitemap();
    const articleEntry = entries.find((e) =>
      e.url === `${BASE}/journal/test-article`
    );
    expect(articleEntry).toBeDefined();
    expect(articleEntry?.changeFrequency).toBe('monthly');
    expect(articleEntry?.priority).toBe(0.7);
  });

  it('returns only static entries when no articles exist', () => {
    vi.mocked(getAllArticles).mockReturnValue([]);
    const entries = sitemap();
    // homepage + /journal = 2 entries
    expect(entries).toHaveLength(2);
  });
});
