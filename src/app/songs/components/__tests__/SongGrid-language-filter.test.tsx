// @vitest-environment jsdom
// React 19 requires this flag to enable act() support outside of Testing Library.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SongGrid from '../SongGrid';

// Mock next-intl so useTranslations works in test environment
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

// Mock SongCard
vi.mock('../SongCard', () => ({
  default: ({ song }: { song: { title: string } }) => <div data-testid="song-card">{song.title}</div>,
}));

// Mock EmptyState
vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ heading }: { heading: string }) => <div data-testid="empty-state">{heading}</div>,
}));

import type { SongListItem } from '@/lib/db/queries';

const makeSong = (id: string, language: string): SongListItem => ({
  id,
  slug: `song-${id}`,
  title: `Song ${id}`,
  artist: 'Artist',
  anime: 'Anime',
  season_info: null,
  youtube_id: null,
  year_launched: null,
  jlpt_level: 'N4' as const,
  difficulty_tier: 'basic' as const,
  genre_tags: [],
  mood_tags: [],
  language,
  ex1_2_3_best_accuracy: null,
  ex4_best_accuracy: null,
  ex5_best_accuracy: null,
  ex6_best_accuracy: null,
  ex7_best_accuracy: null,
  grammar_best_accuracy: null,
  has_grammar: false,
  completion_pct: null,
  avg_track_pct: null,
  verses_dominated_pct: null,
  learner_count: 0,
});

const SONGS = [
  makeSong('1', 'ja'),
  makeSong('2', 'en'),
  makeSong('3', 'ja'),
  makeSong('4', 'pt'),
  makeSong('5', 'es'),
];

describe('SongGrid language filter', () => {
  it('renders JA, EN, PT, ES filter chips', () => {
    render(<SongGrid songs={SONGS} view="all" />);
    expect(screen.getByRole('button', { name: 'JA' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'EN' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'PT' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'ES' })).toBeDefined();
  });

  it('clicking JA chip sets languageFilter to "ja" and filters songs', () => {
    render(<SongGrid songs={SONGS} view="all" />);
    fireEvent.click(screen.getByRole('button', { name: 'JA' }));
    // Only ja songs remain
    const cards = screen.getAllByTestId('song-card');
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain('Song 1');
    expect(cards[1].textContent).toContain('Song 3');
  });

  it('clicking active chip again deselects it (shows all songs)', () => {
    render(<SongGrid songs={SONGS} view="all" />);
    fireEvent.click(screen.getByRole('button', { name: 'JA' }));
    fireEvent.click(screen.getByRole('button', { name: 'JA' }));
    // All songs visible again
    const cards = screen.getAllByTestId('song-card');
    expect(cards).toHaveLength(5);
  });

  it('Clear button resets languageFilter alongside JLPT and difficulty', () => {
    render(<SongGrid songs={SONGS} view="all" />);
    fireEvent.click(screen.getByRole('button', { name: 'JA' }));
    // Clear button should appear
    const clearBtn = screen.getByRole('button', { name: 'Clear' });
    fireEvent.click(clearBtn);
    // All songs visible again
    const cards = screen.getAllByTestId('song-card');
    expect(cards).toHaveLength(5);
  });

  it('filtering to JA shows only songs with language === "ja"', () => {
    render(<SongGrid songs={SONGS} view="all" />);
    fireEvent.click(screen.getByRole('button', { name: 'JA' }));
    const cards = screen.getAllByTestId('song-card');
    expect(cards).toHaveLength(2);
    cards.forEach((card) => {
      // songs 1 and 3 are ja
      expect(['Song 1', 'Song 3'].some((t) => card.textContent?.includes(t))).toBe(true);
    });
  });

  it('filtering to EN shows only songs with language === "en"', () => {
    render(<SongGrid songs={SONGS} view="all" />);
    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    const cards = screen.getAllByTestId('song-card');
    expect(cards).toHaveLength(1);
    expect(cards[0].textContent).toContain('Song 2');
  });

  it('each chip has aria-pressed matching its active state', () => {
    render(<SongGrid songs={SONGS} view="all" />);
    const jaBtn = screen.getByRole('button', { name: 'JA' });
    expect(jaBtn.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(jaBtn);
    expect(jaBtn.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(jaBtn);
    expect(jaBtn.getAttribute('aria-pressed')).toBe('false');
  });
});
