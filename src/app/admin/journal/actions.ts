'use server';

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { requireAdminUser } from '@/lib/admin/require-admin';
import type { ArticleFrontmatter } from '@/lib/journal/articles';

const SAFE_SLUG_RE = /^[a-z0-9-]+$/;
const CONTENT_DIR = path.join(process.cwd(), 'src/content/journal');

export async function saveArticle(
  slug: string,
  content: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdminUser();
  } catch {
    return { ok: false, error: 'Unauthorized' };
  }

  if (!SAFE_SLUG_RE.test(slug)) {
    return { ok: false, error: 'Invalid slug' };
  }

  const filepath = path.join(CONTENT_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filepath)) {
    return { ok: false, error: 'Article not found' };
  }

  fs.writeFileSync(filepath, content, 'utf8');
  return { ok: true };
}

export async function saveArticleStructured(
  slug: string,
  fm: Partial<ArticleFrontmatter>,
  body: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdminUser();
  } catch {
    return { ok: false, error: 'Unauthorized' };
  }

  if (!SAFE_SLUG_RE.test(slug)) {
    return { ok: false, error: 'Invalid slug' };
  }

  const filepath = path.join(CONTENT_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filepath)) {
    return { ok: false, error: 'Article not found' };
  }

  // matter.stringify(content, data) → "---\nkey: value\n---\ncontent"
  // Leading newline in body so the first heading has a blank line after the closing ---
  const full = matter.stringify(body.startsWith('\n') ? body : '\n' + body, fm as Record<string, unknown>);
  fs.writeFileSync(filepath, full, 'utf8');
  return { ok: true };
}
