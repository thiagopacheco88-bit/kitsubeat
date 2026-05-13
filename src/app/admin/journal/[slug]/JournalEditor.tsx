'use client';

import { useState, useTransition } from 'react';
import { saveArticleStructured } from '../actions';
import type { ArticleFrontmatter } from '@/lib/journal/articles';

interface Props {
  slug: string;
  frontmatter: ArticleFrontmatter;
  body: string;
}

// ─── Unsplash image picker (inline, no modal) ────────────────────────────────

interface UnsplashResult {
  id: string;
  thumb: string;
  regular: string;
  alt: string;
  credit: string;
}

function ImageSection({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UnsplashResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState('');

  async function search(q: string) {
    if (!q.trim()) return;
    setSearching(true);
    setSearchErr('');
    try {
      const res = await fetch(`/api/admin/exercises/unsplash?q=${encodeURIComponent(q)}`);
      const data = await res.json() as { results: UnsplashResult[] };
      setResults(data.results);
    } catch {
      setSearchErr('Search failed');
    } finally {
      setSearching(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Current image */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        {value ? (
          <img
            src={value}
            alt="cover"
            style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--color-border)', flexShrink: 0 }}
          />
        ) : (
          <div style={{ width: '120px', height: '80px', borderRadius: '6px', border: '1px dashed var(--color-border)', background: 'var(--color-card-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'var(--color-text-dim)', flexShrink: 0 }}>
            No image
          </div>
        )}
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Cover image URL</label>
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://..."
            style={inputStyle}
          />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            style={{ marginTop: '6px', fontSize: '12px', color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {open ? '▲ Hide Unsplash search' : '▼ Search Unsplash'}
          </button>
        </div>
      </div>

      {/* Unsplash search panel */}
      {open && (
        <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-card-2)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search(query)}
              placeholder="Search photos…"
              style={{ ...inputStyle, flex: 1 }}
              autoFocus
            />
            <button type="button" onClick={() => search(query)} disabled={searching} style={secondaryBtnStyle}>
              {searching ? '…' : 'Search'}
            </button>
          </div>
          {searchErr && <p style={{ fontSize: '12px', color: '#ef4444' }}>{searchErr}</p>}
          {results.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => { onChange(r.regular); setOpen(false); }}
                  title={r.alt || r.credit}
                  style={{ padding: 0, border: value === r.regular ? '2px solid var(--color-accent)' : '2px solid transparent', borderRadius: '4px', overflow: 'hidden', cursor: 'pointer', aspectRatio: '1', background: 'none' }}
                >
                  <img src={r.thumb} alt={r.alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--color-text-dim)',
  marginBottom: '4px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  fontSize: '13px',
  borderRadius: '6px',
  border: '1px solid var(--color-border)',
  background: 'var(--color-card-2)',
  color: 'var(--color-text)',
  outline: 'none',
  boxSizing: 'border-box',
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: '7px 14px',
  fontSize: '12px',
  fontWeight: 600,
  borderRadius: '6px',
  border: '1px solid var(--color-border)',
  background: 'none',
  color: 'var(--color-text-muted)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

// ─── Main editor ──────────────────────────────────────────────────────────────

export function JournalEditor({ slug, frontmatter: initialFm, body: initialBody }: Props) {
  const [fm, setFm] = useState({ ...initialFm });
  const [body, setBody] = useState(initialBody);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [isPending, startTransition] = useTransition();
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced fields (about / mentions / faq) as raw JSON strings
  const [advancedJson, setAdvancedJson] = useState(() => {
    const adv: Record<string, unknown> = {};
    if (initialFm.about) adv.about = initialFm.about;
    if (initialFm.mentions) adv.mentions = initialFm.mentions;
    if (initialFm.faq) adv.faq = initialFm.faq;
    return Object.keys(adv).length ? JSON.stringify(adv, null, 2) : '';
  });
  const [advancedErr, setAdvancedErr] = useState('');

  function set<K extends keyof ArticleFrontmatter>(key: K, value: ArticleFrontmatter[K]) {
    setFm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    // Merge advanced JSON fields back into fm
    let merged = { ...fm };
    if (advancedJson.trim()) {
      try {
        const parsed = JSON.parse(advancedJson) as Record<string, unknown>;
        merged = { ...merged, ...parsed };
        setAdvancedErr('');
      } catch {
        setAdvancedErr('Invalid JSON in advanced fields — fix before saving.');
        return;
      }
    } else {
      // Remove advanced fields if cleared
      delete (merged as Record<string, unknown>).about;
      delete (merged as Record<string, unknown>).mentions;
      delete (merged as Record<string, unknown>).faq;
    }

    setStatus('saving');
    startTransition(async () => {
      const result = await saveArticleStructured(slug, merged, body);
      if (result.ok) {
        setStatus('saved');
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setStatus('error');
        setErrorMsg(result.error ?? 'Unknown error');
      }
    });
  }

  const saving = status === 'saving' || isPending;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-dim)', margin: 0 }}>Admin · Journal</p>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)', margin: '2px 0 0' }}>
            {fm.title || slug}
          </h1>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          {status === 'saved' && <span style={{ fontSize: '13px', color: '#4ade80', fontWeight: 600 }}>Saved ✓</span>}
          {status === 'error' && <span style={{ fontSize: '13px', color: '#f87171' }}>{errorMsg}</span>}
          <a href={`/journal/${slug}`} target="_blank" rel="noreferrer" style={{ ...secondaryBtnStyle, textDecoration: 'none', display: 'inline-block' }}>
            View ↗
          </a>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '7px 22px',
              fontSize: '13px',
              fontWeight: 700,
              borderRadius: '6px',
              border: 'none',
              background: saving ? 'var(--color-border)' : 'var(--color-accent)',
              color: saving ? 'var(--color-text-dim)' : '#fff',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Metadata card */}
      <div style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--color-border)', background: 'var(--color-card)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-dim)', margin: 0 }}>Metadata</p>

        {/* Cover image */}
        <ImageSection value={fm.coverImage ?? ''} onChange={(url) => set('coverImage', url)} />

        {/* Title + Subtitle */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Field label="Title">
            <input value={fm.title ?? ''} onChange={(e) => set('title', e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Subtitle">
            <input value={fm.subtitle ?? ''} onChange={(e) => set('subtitle', e.target.value)} placeholder="Optional hook line" style={inputStyle} />
          </Field>
        </div>

        {/* Date / dateModified / category / author */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <Field label="Date">
            <input type="date" value={fm.date ?? ''} onChange={(e) => set('date', e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Date Modified">
            <input type="date" value={fm.dateModified ?? ''} onChange={(e) => set('dateModified', e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Category">
            <select value={fm.category ?? 'lore'} onChange={(e) => set('category', e.target.value as ArticleFrontmatter['category'])} style={inputStyle}>
              <option value="lore">Lore</option>
              <option value="language">Language</option>
              <option value="translation">Translation</option>
            </select>
          </Field>
          <Field label="Author">
            <input value={fm.author ?? ''} onChange={(e) => set('author', e.target.value)} placeholder="KitsuBeat" style={inputStyle} />
          </Field>
        </div>

        {/* Summary */}
        <Field label="Summary">
          <textarea
            value={fm.summary ?? ''}
            onChange={(e) => set('summary', e.target.value)}
            rows={2}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.5' }}
          />
        </Field>

        {/* Tags + Keywords */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Field label="Tags (comma-separated)">
            <input
              value={(fm.tags ?? []).join(', ')}
              onChange={(e) => set('tags', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))}
              placeholder="pokemon, japanese-culture"
              style={inputStyle}
            />
          </Field>
          <Field label="Keywords (comma-separated)">
            <input
              value={(fm.keywords ?? []).join(', ')}
              onChange={(e) => set('keywords', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))}
              placeholder="magikarp gyarados legend, …"
              style={inputStyle}
            />
          </Field>
        </div>

        {/* Advanced fields */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            style={{ fontSize: '12px', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <span style={{ transition: 'transform 0.15s', display: 'inline-block', transform: showAdvanced ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
            Advanced fields (about, mentions, faq)
          </button>
          {showAdvanced && (
            <div style={{ marginTop: '10px' }}>
              <p style={{ fontSize: '11px', color: 'var(--color-text-dim)', marginBottom: '6px' }}>
                JSON — edit the about / mentions / faq arrays directly.
              </p>
              <textarea
                value={advancedJson}
                onChange={(e) => setAdvancedJson(e.target.value)}
                rows={10}
                spellCheck={false}
                style={{ ...inputStyle, fontFamily: 'ui-monospace, monospace', fontSize: '12px', resize: 'vertical' }}
              />
              {advancedErr && <p style={{ fontSize: '12px', color: '#f87171', marginTop: '4px' }}>{advancedErr}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Body content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={labelStyle}>Article body (MDX)</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          spellCheck={false}
          style={{
            minHeight: '60vh',
            width: '100%',
            padding: '16px',
            fontFamily: 'ui-monospace, monospace',
            fontSize: '13px',
            lineHeight: 1.65,
            background: 'var(--color-card)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

    </div>
  );
}
