import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import readingTime from 'reading-time';

const CONTENT_DIR = path.join(process.cwd(), 'src/content/journal');

export type ArticleCategory = 'lore' | 'language' | 'translation';

export interface ArticleFaq {
  question: string;
  answer: string;
}

export interface ArticleEntity {
  name: string;
  sameAs?: string; // Wikipedia or authoritative URL for knowledge graph linking
}

export interface ArticleFrontmatter {
  title: string;
  slug: string;
  date: string;           // ISO date string e.g. "2026-05-10"
  coverImage: string;
  category: ArticleCategory;
  summary: string;
  tags?: string[];
  keywords?: string[];
  author?: string;
  readingTime?: string;   // optional override in frontmatter
  faq?: ArticleFaq[];
  about?: ArticleEntity[];    // primary topics — used in Article JSON-LD `about`
  mentions?: ArticleEntity[]; // franchises, works, people cited — used in `mentions`
}

export interface ArticleMeta extends ArticleFrontmatter {
  readingTimeComputed: string; // always populated — from frontmatter.readingTime if present, else calculated
}

export function getAllArticles(): ArticleMeta[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.mdx'));
  return files
    .map((filename) => {
      const raw = fs.readFileSync(path.join(CONTENT_DIR, filename), 'utf8');
      const { data, content } = matter(raw);
      const rt = readingTime(content);
      return {
        ...(data as ArticleFrontmatter),
        readingTimeComputed: (data as ArticleFrontmatter).readingTime ?? rt.text,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Slug guard: prevents path traversal. Only lowercase letters, digits, and hyphens.
const SAFE_SLUG_RE = /^[a-z0-9-]+$/;

export function getArticleSource(slug: string): string | null {
  if (!SAFE_SLUG_RE.test(slug)) return null;
  const filepath = path.join(CONTENT_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filepath)) return null;
  return fs.readFileSync(filepath, 'utf8');
}
