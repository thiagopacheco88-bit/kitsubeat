// @vitest-environment jsdom
// React 19 requires this flag to enable act() support outside of Testing Library.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SongGrid from '../SongGrid';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/songs'),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
}));

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

const makeSong = (id: string, jlpt: string = 'N4'): SongListItem => ({
  id,
  slug: `song-${id}`,
  title: `Song ${id}`,
  artist: 'Artist',
  anime: 'Anime',
  season_info: null,
  youtube_id: null,
  year_launched: null,
  jlpt_level: jlpt as 'N5' | 'N4' | 'N3' | 'N2' | 'N1',
  difficulty_tier: 'basic' as const,
  genre_tags: [],
  mood_tags: [],
  language: 'ja',
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
  makeSong('1', 'N5'),
  makeSong('2', 'N4'),
  makeSong('3', 'N5'),
  makeSong('4', 'N3'),
  makeSong('5', 'N2'),
];

describe('SongGrid JLPT filter', () => {
  it('renders N5, N4, N3, N2, N1 filter chips', () => {
    render(<SongGrid songs={SONGS} view="all" />);
    expect(screen.getByRole('button', { name: 'N5' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'N4' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'N3' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'N2' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'N1' })).toBeDefined();
  });

  it('clicking N5 chip filters songs to N5 only', () => {
    render(<SongGrid songs={SONGS} view="all" />);
    fireEvent.click(screen.getByRole('button', { name: 'N5' }));
    const cards = screen.getAllByTestId('song-card');
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain('Song 1');
    expect(cards[1].textContent).toContain('Song 3');
  });

  it('clicking active chip again deselects it (shows all songs)', () => {
    render(<SongGrid songs={SONGS} view="all" />);
    fireEvent.click(screen.getByRole('button', { name: 'N5' }));
    fireEvent.click(screen.getByRole('button', { name: 'N5' }));
    const cards = screen.getAllByTestId('song-card');
    expect(cards).toHaveLength(5);
  });

  it('Clear button resets JLPT filter', () => {
    render(<SongGrid songs={SONGS} view="all" />);
    fireEvent.click(screen.getByRole('button', { name: 'N5' }));
    const clearBtn = screen.getByRole('button', { name: 'filter.clear' });
    fireEvent.click(clearBtn);
    const cards = screen.getAllByTestId('song-card');
    expect(cards).toHaveLength(5);
  });

  it('filtering to N5 shows only N5 songs', () => {
    render(<SongGrid songs={SONGS} view="all" />);
    fireEvent.click(screen.getByRole('button', { name: 'N5' }));
    const cards = screen.getAllByTestId('song-card');
    expect(cards).toHaveLength(2);
    cards.forEach((card) => {
      expect(['Song 1', 'Song 3'].some((t) => card.textContent?.includes(t))).toBe(true);
    });
  });

  it('filtering to N4 shows only N4 songs', () => {
    render(<SongGrid songs={SONGS} view="all" />);
    fireEvent.click(screen.getByRole('button', { name: 'N4' }));
    const cards = screen.getAllByTestId('song-card');
    expect(cards).toHaveLength(1);
    expect(cards[0].textContent).toContain('Song 2');
  });

  it('renders all songs when no filter is active', () => {
    render(<SongGrid songs={SONGS} view="all" />);
    const cards = screen.getAllByTestId('song-card');
    expect(cards).toHaveLength(5);
  });
});
