import { describe, it, expect, vi } from 'vitest';

// I18N-06: Journal locale articles appear first for matching locale
// These tests require getArticlesByLocale implemented in articles.ts (Wave 3b).
// Wave 0 stubs.

describe('getArticlesByLocale', () => {
  it.todo('returns EN articles from CONTENT_DIR for locale=en');
  it.todo('returns PT-BR articles from CONTENT_DIR/pt-BR for locale=pt-BR');
  it.todo('returns ES articles from CONTENT_DIR/es for locale=es');
  it.todo('returns empty array if locale subdir does not exist');
  it.todo('articles are sorted by date descending');
});

describe('getArticleSourceByLocale', () => {
  it.todo('returns locale MDX content when locale file exists');
  it.todo('falls back to EN content when locale file is missing');
  it.todo('returns null for slugs with path traversal attempts (e.g. ../admin)');
  it.todo('returns null for slugs with uppercase letters (SAFE_SLUG_RE guard)');
});
