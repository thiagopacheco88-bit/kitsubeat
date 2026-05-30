"""Backfill added_at on every songs-manifest.json entry using lyrics-cache mtime."""
import json
import os
from datetime import datetime, timezone

MANIFEST = os.path.join(os.path.dirname(__file__), '../../data/songs-manifest.json')
LYRICS_CACHE_DIR = os.path.join(os.path.dirname(__file__), '../../data/lyrics-cache')


def main():
    with open(MANIFEST, encoding='utf-8') as f:
        songs = json.load(f)

    got_date = 0
    got_null = 0

    result = []
    for song in songs:
        slug = song['slug']
        cache_path = os.path.join(LYRICS_CACHE_DIR, f'{slug}.json')

        if os.path.exists(cache_path):
            mtime = os.path.getmtime(cache_path)
            added_at = datetime.fromtimestamp(mtime, tz=timezone.utc).strftime('%Y-%m-%d')
            got_date += 1
        else:
            added_at = None
            got_null += 1

        # Rebuild entry with added_at inserted right after slug
        new_entry = {}
        for key, value in song.items():
            new_entry[key] = value
            if key == 'slug':
                new_entry['added_at'] = added_at

        result.append(new_entry)

    with open(MANIFEST, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
        f.write('\n')

    total = len(result)
    print(f'Total: {total}')
    print(f'Got date: {got_date}')
    print(f'Got null: {got_null}')


if __name__ == '__main__':
    main()
