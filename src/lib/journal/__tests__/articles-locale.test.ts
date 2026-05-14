import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'node:path';

// I18N-06: Journal locale articles appear first for matching locale
// Integration-style tests: mock the fs module to avoid real filesystem reads.

vi.mock('node:fs');
vi.mock('server-only', () => ({}));

import fs from 'node:fs';
import { getArticlesByLocale, getArticleSourceByLocale } from '../articles';

const CONTENT_DIR = path.join(process.cwd(), 'src/content/journal');

const EN_MDX = `---
title: Test Article EN
slug: test-article
date: "2026-01-15"
coverImage: /img/test.jpg
category: lore
summary: A test article in English.
---
Body content here.
`;

const PT_MDX = `---
title: Artigo de Teste PT
slug: test-article
date: "2026-01-15"
coverImage: /img/test.jpg
category: lore
summary: Um artigo de teste em português.
---
Conteúdo em português.
`;

describe('getArticlesByLocale', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns EN articles from CONTENT_DIR for locale=en', () => {
    const mockFs = vi.mocked(fs);
    mockFs.existsSync = vi.fn().mockReturnValue(true);
    mockFs.readdirSync = vi.fn().mockReturnValue(['test-article.mdx'] as unknown as fs.Dirent[]);
    mockFs.readFileSync = vi.fn().mockReturnValue(EN_MDX);

    const articles = getArticlesByLocale('en');
    expect(articles).toHaveLength(1);
    expect(articles[0].title).toBe('Test Article EN');
    // Should read from CONTENT_DIR (no locale subdir)
    expect(mockFs.readdirSync).toHaveBeenCalledWith(CONTENT_DIR);
  });

  it('returns PT-BR articles from CONTENT_DIR/pt-BR for locale=pt-BR', () => {
    const mockFs = vi.mocked(fs);
    const ptDir = path.join(CONTENT_DIR, 'pt-BR');
    mockFs.existsSync = vi.fn().mockReturnValue(true);
    mockFs.readdirSync = vi.fn().mockReturnValue(['test-article.mdx'] as unknown as fs.Dirent[]);
    mockFs.readFileSync = vi.fn().mockReturnValue(PT_MDX);

    const articles = getArticlesByLocale('pt-BR');
    expect(articles).toHaveLength(1);
    expect(articles[0].title).toBe('Artigo de Teste PT');
    expect(mockFs.readdirSync).toHaveBeenCalledWith(ptDir);
  });

  it('returns ES articles from CONTENT_DIR/es for locale=es', () => {
    const mockFs = vi.mocked(fs);
    const esDir = path.join(CONTENT_DIR, 'es');
    mockFs.existsSync = vi.fn().mockReturnValue(true);
    mockFs.readdirSync = vi.fn().mockReturnValue(['test-article.mdx'] as unknown as fs.Dirent[]);
    mockFs.readFileSync = vi.fn().mockReturnValue(EN_MDX);

    getArticlesByLocale('es');
    expect(mockFs.readdirSync).toHaveBeenCalledWith(esDir);
  });

  it('returns empty array if locale subdir does not exist', () => {
    const mockFs = vi.mocked(fs);
    mockFs.existsSync = vi.fn().mockReturnValue(false);

    const articles = getArticlesByLocale('pt-BR');
    expect(articles).toEqual([]);
  });

  it('articles are sorted by date descending', () => {
    const olderMdx = EN_MDX.replace('2026-01-15', '2025-06-01');
    const newerMdx = EN_MDX.replace('2026-01-15', '2026-03-01').replace('Test Article EN', 'Newer Article');

    const mockFs = vi.mocked(fs);
    mockFs.existsSync = vi.fn().mockReturnValue(true);
    mockFs.readdirSync = vi.fn().mockReturnValue(['older.mdx', 'newer.mdx'] as unknown as fs.Dirent[]);
    mockFs.readFileSync = vi.fn()
      .mockReturnValueOnce(olderMdx)
      .mockReturnValueOnce(newerMdx);

    const articles = getArticlesByLocale('en');
    expect(articles).toHaveLength(2);
    // Newer article first
    expect(articles[0].title).toBe('Newer Article');
  });
});

describe('getArticleSourceByLocale', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns locale MDX content when locale file exists', () => {
    const mockFs = vi.mocked(fs);
    mockFs.existsSync = vi.fn().mockReturnValue(true);
    mockFs.readFileSync = vi.fn().mockReturnValue(PT_MDX);

    const result = getArticleSourceByLocale('test-article', 'pt-BR');
    expect(result).toBe(PT_MDX);
    expect(mockFs.existsSync).toHaveBeenCalledWith(
      path.join(CONTENT_DIR, 'pt-BR', 'test-article.mdx')
    );
  });

  it('falls back to EN content when locale file is missing', () => {
    const mockFs = vi.mocked(fs);
    // First call (pt-BR file): false. Second call (EN file): true.
    mockFs.existsSync = vi.fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    mockFs.readFileSync = vi.fn().mockReturnValue(EN_MDX);

    const result = getArticleSourceByLocale('test-article', 'pt-BR');
    expect(result).toBe(EN_MDX);
    // Should fall back to EN CONTENT_DIR
    expect(mockFs.readFileSync).toHaveBeenCalledWith(
      path.join(CONTENT_DIR, 'test-article.mdx'),
      'utf8'
    );
  });

  it('returns null for slugs with path traversal attempts (e.g. ../admin)', () => {
    const result = getArticleSourceByLocale('../admin', 'en');
    expect(result).toBeNull();
  });

  it('returns null for slugs with uppercase letters (SAFE_SLUG_RE guard)', () => {
    const result = getArticleSourceByLocale('TestArticle', 'en');
    expect(result).toBeNull();
  });
});
