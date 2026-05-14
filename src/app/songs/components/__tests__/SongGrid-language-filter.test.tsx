import { describe, it, expect } from 'vitest';

// I18N-05: Language filter chip renders and filters songs
// These tests require SongGrid extended with languageFilter (Wave 3b).
// Wave 0 stubs.

describe('SongGrid language filter', () => {
  it.todo('renders JA, EN, PT, ES filter chips');
  it.todo('clicking JA chip sets languageFilter to "ja" and filters songs');
  it.todo('clicking active chip again deselects it (shows all songs)');
  it.todo('Clear button resets languageFilter alongside JLPT and difficulty');
  it.todo('filtering to JA shows only songs with language === "ja"');
  it.todo('filtering to EN shows only songs with language === "en"');
  it.todo('each chip has aria-pressed matching its active state');
});
