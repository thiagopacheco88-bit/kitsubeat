# /journal-post

Create or update a KitsuBeat journal article. Follows every convention established during the Magikarp/Gyarados post — tone, images, structure, MDX config, SEO/GEO, and Playwright verification.

---

## 1. Tone and voice

KitsuBeat's audience is otakus who are learning Japanese. Write like a knowledgeable fan, not an academic.

- Lead with a hook that assumes the reader knows the anime/game reference
- Use casual framing: "here's the thing", "okay but", "this is where it gets wild"
- Address the reader directly as a fellow fan who already cares
- No em dashes (—). Use a hyphen (-) instead. Run `sed -i 's/—/-/g' file.mdx` before finishing.
- No AI-slop phrases: "delve into", "it's worth noting", "in conclusion", "stands as a testament"
- Bold only the first mention of a key term or name, not for decoration
- *Italics* for Japanese romanization and emphasis, sparingly

---

## 2. MDX frontmatter

Every article needs this exact shape:

```yaml
---
title: "..."                        # Include both the topic AND the angle in the title
subtitle: "..."                     # Smaller hook line below title — rendered in ArticleHero
slug: "kebab-case-url"
date: "YYYY-MM-DD"                  # ISO publish date
dateModified: "YYYY-MM-DD"         # Set to date on first publish; update when article changes
coverImage: "https://..."           # External Wikimedia CDN URL — never a local path (see §4)
category: "lore" | "language" | "translation"
summary: "..."                      # 150-160 chars, keyword-rich, both proper nouns if relevant
tags: ["tag1", "tag2"]
keywords: ["keyword phrase 1", "keyword phrase 2"]   # 5-8 phrases, include one in Japanese if relevant
author: "KitsuBeat"
readingTime: "N min read"
about:                              # Primary topics — used in Article JSON-LD `about` with sameAs
  - name: "Topic name"
    sameAs: "https://en.wikipedia.org/wiki/..."
    type: "Thing"                   # Optional schema.org type — see entity type list below
  - name: "Topic without Wikipedia page"
mentions:                           # Franchises, works, people cited — used in JSON-LD `mentions`
  - name: "Dragon Ball"
    sameAs: "https://en.wikipedia.org/wiki/Dragon_Ball"
    type: "Manga"                   # Always set type for known entity classes (see list below)
  - name: "Eiichiro Oda"
    sameAs: "https://en.wikipedia.org/wiki/Eiichiro_Oda"
    type: "Person"
faq:
  - question: "...?"
    answer: "..."                   # Plain text only — no markdown. Goes into FAQPage JSON-LD.
  - question: "...?"
    answer: "..."
---
```

**Entity `type` values** (use these in `about` and `mentions` — omitting defaults to `Thing`):

| Entity class | `type` value |
|---|---|
| Anime / manga series | `"Manga"` |
| Live-action film | `"Movie"` |
| TV series (not anime) | `"TVSeries"` |
| Video game | `"VideoGame"` |
| Real person (author, actor, creator) | `"Person"` |
| Fictional character | `"Person"` |
| Mythology / religion concept | `"Thing"` |
| Organisation / studio | `"Organization"` |
| Song / musical work | `"MusicRecording"` |
| Book / chronicle | `"Book"` |

**faq rules:**
- Minimum 5 entries. Target the exact phrasing people search for.
- Include at least one "Is X from anime Y based on this?" question per pop-culture reference covered.
- Answers are plain text (no markdown) — they go into JSON-LD which doesn't render markdown.

**about / mentions rules:**
- `about` = the 2-4 core concepts the article explains (the legend, the proverb, the cultural practice)
- `mentions` = every franchise, character, work, or notable person cited in the body
- Always include `sameAs` with a Wikipedia URL when one exists — this is the highest-value GEO signal
- These feed into the Article JSON-LD and help AI search engines (Perplexity, ChatGPT, Google AI Overview) place the article in the knowledge graph

---

## 3. Article structure

```
## Hook heading — challenge an assumption the reader has

One to three punchy paragraphs. No meandering intro.

> **Key Takeaways**
>
> - Bullet 1: the core fact (what the legend is, what the word means)
> - Bullet 2: the dramatic detail (the demon variant, the surprising etymology)
> - Bullet 3: the anime/game connection
> - Bullet 4: a specific game mechanic or design detail
> - Bullet 5: the vocabulary payoff
> - Bullet 6: any other cross-franchise connection

## The Core Concept (historical/linguistic foundation)

Real sources, dates, where it comes from.

[IMAGE: see §4]

## The Dramatic Variant / The Part Everyone Forgets

The most compelling version of the story. This is usually the section that makes the article shareable.

## How It Spread / Cultural Legacy

Koinobori, proverbs, Children's Day, modern usage.

[IMAGE: see §4]

## The Anime/Game Connection

Direct encoding of the concept into specific works. One subsection (###) per major franchise.
Include specific mechanical details (stat spreads, move names, level triggers) — these are what
make the connection feel real rather than hand-wavy.

### Franchise One
### Franchise Two

## Vocabulary Callout

Markdown table: Kanji | Romaji | Meaning
Always include the possessive particle の if the phrase uses it.

## Why This Matters for Your Japanese

Connect vocabulary to emotional resonance. End with a CTA to /songs AND a link to /journal.

---

## FAQ

Bold question on its own line, answer paragraph below.
Minimum 5 Q&As matching the frontmatter faq array exactly (same questions, same answers).
```

**Key Takeaways box rules:**
- Place it immediately after the opening hook paragraphs, before the first `##` section
- Use `>` blockquote syntax — the MDX renderer styles it as a red-bordered callout
- 5-7 bullets. Each bullet is one complete, citable fact.
- This is the single highest-impact GEO element — AI engines extract these as page summaries.

**Heading style rules:**
- `##` = section headings — rendered with a red left border accent
- `###` = sub-headings within a section — rendered in red uppercase
- Never use `####` or deeper
- No em dashes in headings

---

## 4. Images

### Finding real images

Never guess Wikimedia filenames. Always query the API first:

```bash
# Step 1 — search by keyword to find real filenames
curl -s "https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=KEYWORD&srnamespace=6&format=json&srlimit=8" \
  | python3 -c "import json,sys,io; sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8'); d=json.load(sys.stdin); [print(r['title']) for r in d['query']['search']]"

# Step 2 — get CDN URL and dimensions for candidates (check W x H before committing)
curl -s "https://commons.wikimedia.org/w/api.php?action=query&titles=File:NAME.jpg&prop=imageinfo&iiprop=url|dimensions&format=json" \
  | python3 -c "import json,sys,io; sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8'); d=json.load(sys.stdin); [print(p['title'], p.get('imageinfo',[{}])[0].get('width'), 'x', p.get('imageinfo',[{}])[0].get('height'), '\n ', p.get('imageinfo',[{}])[0].get('url','')[:90]) for pid,p in d['query']['pages'].items()]"

# Step 3 — verify the CDN URL returns a real image (must be 200 + image/jpeg or image/png)
curl -sI "https://upload.wikimedia.org/wikipedia/commons/..." | grep "HTTP\|content-type"
```

Strip `?utm_source=...` query params from Wikimedia CDN URLs before pasting into MDX.

### Image placement rules

- **Hero (`coverImage` in frontmatter)**: landscape or square, minimum 800px wide. The hero uses `object-cover` — tall portrait images get cropped to an unrecognizable slice. Reject anything taller than it is wide unless it is very close to square.
- **Body images**: any aspect ratio — CSS renders `width: 100%; height: auto` so the full image shows without cropping. Prefer landscape for cleaner flow.
- **Alt text**: describe what is shown AND why it is relevant. "Hokusai — Carps, ukiyo-e woodblock print of koi swimming together (public domain)" is good. "Image of koi" is not.
- Place images after the paragraph that first references what they show, not at the top of a section.

### MDX image syntax

```md
![Descriptive alt text explaining content and relevance](https://upload.wikimedia.org/wikipedia/commons/x/xx/Filename.jpg)
```

---

## 5. MDX configuration (page.tsx)

The article page uses `compileMDX` from `next-mdx-remote/rsc` with these required options:

```tsx
import remarkGfm from 'remark-gfm';

// Both compileMDX calls (generateMetadata AND ArticlePage) need remarkPlugins:
const { content, frontmatter } = await compileMDX<ArticleFrontmatter>({
  source,
  options: { parseFrontmatter: true, mdxOptions: { remarkPlugins: [remarkGfm] } },
  components: {
    h2: ...,         // bold, 1.45rem, red left border accent
    h3: ...,         // red uppercase, letter-spacing
    p: ...,          // marginBottom: 1rem
    blockquote: ..., // red left border, subtle background fill — used for Key Takeaways
    table: ...,      // wrapped in overflow-x-auto div
    th: ...,         // bordered, padded
    td: ...,         // bordered, padded
    img: ...,        // width: 100%, height: auto (no maxHeight — no cropping)
    a: ...,          // accent color, underline; external links get target="_blank" rel="noopener noreferrer"
  },
});
```

**Critical:** `remarkGfm` is required for markdown tables to render as `<table>` elements. Without it, `| col |` syntax renders as raw pipe-separated text. Add it to **both** compileMDX calls in the file (generateMetadata and ArticlePage).

**If you add new MDX component overrides**, restart the dev server (`npm run dev`) after editing `page.tsx`. Next.js HMR sometimes gets stuck on Server Component changes and returns a 500 that clears on restart.

---

## 6. SEO and GEO

### What the page already outputs (do not duplicate)

- `BlogPosting` JSON-LD with `mainEntityOfPage`, `headline`, `description`, `datePublished`, `dateModified`, `inLanguage: "en"`, `articleSection`, `image`, `url`, `author` (Organization with `@id` + logo), `publisher`, `keywords`, `about`, `mentions`, `speakable`, `citation`
- `FAQPage` JSON-LD — auto-generated from the `faq` frontmatter array
- `BreadcrumbList` JSON-LD — auto-generated as Home > Journal > Article
- OpenGraph tags (title, description, url, image, type: article, publishedTime, **modifiedTime**)
- Twitter/X `summary_large_image` card with article `coverImage`
- Canonical URL
- `metadataBase` set globally — relative image paths resolve correctly

### Your job per article

Fill the frontmatter fields that feed these systems:

| Field | Why it matters |
|-------|---------------|
| `summary` (150-160 chars) | Becomes meta description AND og:description AND twitter:description |
| `coverImage` (external URL) | Becomes og:image AND twitter:image — must resolve to a real image |
| `faq` (5+ entries) | Drives FAQPage JSON-LD — eligible for Google FAQ rich results |
| `about` with `sameAs` | Connects article to Wikipedia knowledge graph — key for AI citation |
| `mentions` with `sameAs` | Same — tells Perplexity/ChatGPT what entities are discussed |
| `keywords` | Included in Article JSON-LD keywords field — target 5-8 phrases |
| `dateModified` | Drives `dateModified` in JSON-LD and OG `modifiedTime` — update on revision |
| `subtitle` | Rendered in ArticleHero below the `<h1>` — not in meta tags |

### Links required in every article

- Internal link to `/songs` — at least one, in the closing CTA paragraph
- Internal link to `/journal` — at least one, in the closing paragraph or a related-article mention
- Outbound links to Wikipedia or authoritative sources when citing historical texts, artworks, or specific anime/game entries
- `[anchor text](URL)` syntax in MDX — the `a` component override auto-adds `target="_blank"` for external URLs

### Internal linking targets

| Link text | Destination |
|-----------|-------------|
| song library / explore songs | `/songs` |
| Japanese vocabulary | `/vocabulary` |
| Kana basics | `/kana` |
| your learning path | `/path` |
| other Journal articles | `/journal/[slug]` |

### GEO-specific rules

1. **Key Takeaways blockquote** — mandatory. AI engines extract this as the page summary. Place it after the hook, before the first `##`.
2. **`about` + `mentions` with `sameAs`** — mandatory. Without Wikipedia `sameAs` links, the article is an island in the knowledge graph.
3. **FAQ in both places** — the `faq` frontmatter drives the JSON-LD machine-readable version; the `## FAQ` body section drives the human-readable and text-scraping version. Keep them in sync.
4. **Clear entity definitions** — introduce terms as "Dragon Gate (龍門, *Ryūmon*)" not just "Dragon Gate". The parenthetical kanji + romanization is picked up by AI engines as an entity alias.
5. **Citable factual claims** — every section should have at least one sentence that is a standalone, verifiable fact (a date, a name, a specific quote). These are what AI engines extract to cite the page.
6. **Specific entity types** — use `type: "Person"` / `"Manga"` / `"Movie"` etc. in `about` and `mentions`. Omitting `type` defaults to generic `Thing`, which carries less weight in AI knowledge graphs.
7. **OG image dimensions** — prefer landscape images at least 1200px wide. The `coverImage` becomes the `og:image` and Twitter card — portrait images get cropped in social previews.

---

## 7. Playwright verification

After writing the article, always run the test suite:

```bash
npx playwright test tests/e2e/journal-article.spec.ts --reporter=line
```

The test file at `tests/e2e/journal-article.spec.ts` checks:

1. **200 status + hero image loads** — page returns 200 and the cover image `naturalWidth > 0`
2. **Body images visible and loaded** — every `article img` is visible and `naturalWidth > 0`; all have non-empty alt text
3. **Table renders as HTML** — `article table` exists, no raw `|---|` pipes in article text
4. **FAQ body section** — key questions from the FAQ appear as visible text in the article
5. **Cross-reference content** — specific proper nouns (franchise names, characters) appear in the article body
6. **JSON-LD schemas** — at least two `<script type="application/ld+json">` blocks; second is `FAQPage` type

When writing a new article, update the test file to assert the new article's specific proper nouns and FAQ questions.

### Failure diagnosis

| Failure | Cause | Fix |
|---------|-------|-----|
| Timeout on `page.goto` | Fresh server compiling route for first time | The `beforeAll` warmup has a 90s timeout — wait it out. If still stuck, server is broken: kill and `npm run dev`. |
| 500 status | Stale HMR after `page.tsx` edit | Kill server, `npm run dev` |
| `naturalWidth = 0` on image | Broken image URL | Re-run Wikimedia API search, verify CDN URL returns `200 image/jpeg` |
| `article table` not found | Missing `remark-gfm` | Add to `mdxOptions.remarkPlugins` in both `compileMDX` calls |
| Table shows as `\| col \|` text | Same as above | Same fix |
| Hero is a cropped sliver | Portrait image used as `coverImage` | Find a landscape or square image (W >= H) |
| Heading looks like body text | Missing `h2`/`h3` component in `compileMDX` | Already configured in `page.tsx` — check the override is still there |
| Key Takeaways not styled | Blockquote not in `compileMDX` components | Already configured — check `blockquote` override is present |
| Twitter share shows wrong image | `coverImage` is a local `/images/...` path | Use the Wikimedia CDN URL directly in the frontmatter |
| Em dashes in content | AI-generated text | `sed -i 's/—/-/g' src/content/journal/slug.mdx` |

---

## 8. New article checklist

Run through this before marking the article done:

```
Content
[ ] Hook paragraph assumes reader familiarity with the reference
[ ] Key Takeaways blockquote placed after hook, before first ##
[ ] Every ## section has at least 2 paragraphs
[ ] No em dashes anywhere (run sed check)
[ ] No AI-slop phrases
[ ] Waterfall/mechanic detail included if article covers a Pokémon/game mechanic

Images
[ ] Hero image is landscape/square, verified 200 OK via curl
[ ] At least 2 body images, both verified 200 OK
[ ] Alt text describes content AND relevance
[ ] No maxHeight or objectFit:cover on body images

Frontmatter
[ ] summary is 150-160 chars
[ ] subtitle filled — rendered under the h1 in ArticleHero
[ ] date and dateModified both set (same value on first publish)
[ ] faq has 5+ entries, plain text answers
[ ] about array covers the 2-4 core topics with sameAs Wikipedia URLs
[ ] mentions array covers every franchise/character/work with sameAs URLs
[ ] type field set on every about/mentions entity (Person, Manga, Movie, etc.)
[ ] coverImage is an external URL, landscape, ≥1200px wide (never /images/journal/...)

Links
[ ] Internal link to /songs
[ ] Internal link to /journal
[ ] Outbound links to Wikipedia for any historical source cited

Playwright
[ ] npx playwright test tests/e2e/journal-article.spec.ts passes 6/6
[ ] Test updated with article-specific proper nouns and FAQ questions
```
