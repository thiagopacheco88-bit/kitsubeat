"""
push-lesson-timing-to-db.py — Update song_versions.lesson in Neon for a slug.

Reads data/lessons-cache/{slug}.json and updates the lesson JSONB column
for version_type='full' in song_versions.

Usage:
  python push-lesson-timing-to-db.py <slug>
"""
import json, sys, os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
slug = next((a for a in sys.argv[1:] if not a.startswith("--")), None)
if not slug:
    print("usage: push-lesson-timing-to-db.py <slug>", file=sys.stderr)
    sys.exit(1)

lesson_path = ROOT / "data" / "lessons-cache" / f"{slug}.json"
if not lesson_path.exists():
    print(f"lesson not found: {lesson_path}", file=sys.stderr)
    sys.exit(1)

lesson = json.loads(lesson_path.read_text(encoding="utf-8"))

# Load DATABASE_URL from .env.local
env_path = ROOT / ".env.local"
db_url = None
if env_path.exists():
    for line in env_path.read_text().splitlines():
        if line.startswith("DATABASE_URL="):
            db_url = line.split("=", 1)[1].strip().strip('"').strip("'")
            break

if not db_url:
    db_url = os.environ.get("DATABASE_URL")
if not db_url:
    print("DATABASE_URL not found in .env.local", file=sys.stderr)
    sys.exit(1)

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    print("psycopg2 not found — install with: pip install psycopg2-binary", file=sys.stderr)
    sys.exit(1)

conn = psycopg2.connect(db_url)
conn.autocommit = False
cur = conn.cursor()

# Get song_id for the slug
cur.execute("SELECT id FROM songs WHERE slug = %s", (slug,))
row = cur.fetchone()
if not row:
    print(f"song not found in DB: {slug}", file=sys.stderr)
    cur.close(); conn.close(); sys.exit(1)
song_id = row[0]

# Check version exists
cur.execute(
    "SELECT id FROM song_versions WHERE song_id = %s AND version_type = 'full'",
    (song_id,)
)
ver_row = cur.fetchone()
if not ver_row:
    print(f"no 'full' version found for {slug}", file=sys.stderr)
    cur.close(); conn.close(); sys.exit(1)

# Peek at current verse 1 timing
cur.execute(
    "SELECT lesson->'verses'->0->>'start_time_ms' AS v1_start "
    "FROM song_versions WHERE song_id = %s AND version_type = 'full'",
    (song_id,)
)
old_v1 = cur.fetchone()[0]
print(f"[push] current verse 1 start_time_ms in DB: {old_v1}ms")
print(f"[push] new verse 1 start_time_ms from cache: {lesson['verses'][0]['start_time_ms']}ms")

# Update lesson JSONB
cur.execute(
    "UPDATE song_versions SET lesson = %s, updated_at = NOW() "
    "WHERE song_id = %s AND version_type = 'full'",
    (psycopg2.extras.Json(lesson), song_id)
)
conn.commit()
print(f"[push] updated song_versions for {slug} (full) — {cur.rowcount} row(s)")

cur.close()
conn.close()
