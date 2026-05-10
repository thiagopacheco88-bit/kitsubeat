// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fs BEFORE importing the module under test so the module picks up mocks
vi.mock('node:fs');
import * as fs from 'node:fs';
import { getAllArticles, getArticleSource } from '../articles';

const FIXTURE_A = `---
title: "Article A"
slug: "article-a"
date: "2026-05-10"
coverImage: "/images/journal/article-a.jpg"
category: "lore"
summary: "Summary of article A"
---
This is the body of article A with some words for reading time.`;

const FIXTURE_B = `---
title: "Article B"
slug: "article-b"
date: "2026-04-01"
coverImage: "/images/journal/article-b.jpg"
category: "language"
summary: "Summary of article B"
readingTime: "3 min read"
---
Article B body text.`;

describe('getAllArticles', () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue(['article-a.mdx', 'article-b.mdx'] as any);
    vi.mocked(fs.readFileSync).mockImplementation((p: any) => {
      if (String(p).includes('article-a')) return FIXTURE_A;
      if (String(p).includes('article-b')) return FIXTURE_B;
      return '';
    });
  });
  afterEach(() => vi.clearAllMocks());

  it('returns both articles sorted newest-first', () => {
    const articles = getAllArticles();
    expect(articles).toHaveLength(2);
    expect(articles[0].slug).toBe('article-a'); // 2026-05-10 > 2026-04-01
    expect(articles[1].slug).toBe('article-b');
  });

  it('computes readingTimeComputed from content when not in frontmatter', () => {
    const articles = getAllArticles();
    const a = articles.find((x) => x.slug === 'article-a')!;
    expect(a.readingTimeComputed).toMatch(/\d+ min read/);
  });

  it('uses frontmatter readingTime when present', () => {
    const articles = getAllArticles();
    const b = articles.find((x) => x.slug === 'article-b')!;
    expect(b.readingTimeComputed).toBe('3 min read');
  });

  it('returns [] when content directory does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(getAllArticles()).toEqual([]);
  });
});

describe('getArticleSource', () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(FIXTURE_A);
  });
  afterEach(() => vi.clearAllMocks());

  it('returns source string for a valid slug', () => {
    const src = getArticleSource('magikarp-legend');
    expect(src).toBe(FIXTURE_A);
  });

  it('returns null for an unknown slug', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(getArticleSource('no-such-article')).toBeNull();
  });

  it('returns null for path traversal slug ../../etc/passwd', () => {
    expect(getArticleSource('../../etc/passwd')).toBeNull();
  });

  it('returns null for slug with forward slash', () => {
    expect(getArticleSource('bad/slug')).toBeNull();
  });
});
