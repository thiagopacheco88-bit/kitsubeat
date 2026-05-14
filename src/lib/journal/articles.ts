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
  sameAs?: string;  // Wikipedia or authoritative URL for knowledge graph linking
  type?: string;    // schema.org type — e.g. "Person", "Manga", "TVSeries", "VideoGame", "Movie"
}

export interface ArticleFrontmatter {
  title: string;
  subtitle?: string;       // hook sub-headline rendered below the main title in ArticleHero
  slug: string;
  date: string;           // ISO date string e.g. "2026-05-10"
  dateModified?: string;  // ISO date string — set when article is updated after first publish
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

/**
 * Returns articles from the locale-specific content directory.
 * For 'en', reads from the root CONTENT_DIR.
 * For 'pt-BR'/'es', reads from CONTENT_DIR/locale subdir.
 * Returns [] if the locale directory does not exist yet.
 */
export function getArticlesByLocale(locale: 'en' | 'pt-BR' | 'es'): ArticleMeta[] {
  const dir = locale === 'en' ? CONTENT_DIR : path.join(CONTENT_DIR, locale);
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.mdx'));
  return files
    .map((filename) => {
      const raw = fs.readFileSync(path.join(dir, filename), 'utf8');
      const { data, content } = matter(raw);
      const rt = readingTime(content);
      return {
        ...(data as ArticleFrontmatter),
        readingTimeComputed: (data as ArticleFrontmatter).readingTime ?? rt.text,
      } as ArticleMeta;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Returns the raw MDX source for a specific article in the given locale.
 * Falls back to EN content if the locale file doesn't exist yet.
 * Returns null if slug is invalid (SAFE_SLUG_RE guard).
 */
export function getArticleSourceByLocale(slug: string, locale: 'en' | 'pt-BR' | 'es'): string | null {
  if (!SAFE_SLUG_RE.test(slug)) return null;
  const dir = locale === 'en' ? CONTENT_DIR : path.join(CONTENT_DIR, locale);
  const filepath = path.join(dir, `${slug}.mdx`);
  if (!fs.existsSync(filepath)) {
    // Fallback to EN content when locale translation doesn't exist yet
    if (locale !== 'en') return getArticleSource(slug);
    return null;
  }
  return fs.readFileSync(filepath, 'utf8');
}
