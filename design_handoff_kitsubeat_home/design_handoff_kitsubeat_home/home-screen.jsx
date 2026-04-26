// KitsuBeat Home Screen — dark, iOS-style mobile home
// Grammar colors: noun #3b82f6, verb #ef4444, adj #22c55e
// JLPT colors:    N5 #22c55e, N4 #3b82f6, N3 #f59e0b, N2 #f97316, N1 #ef4444

const KB_BG = '#111111';
const KB_CARD = '#191919';
const KB_CARD_2 = '#1E1E1E';
const KB_BORDER = 'rgba(255,255,255,0.06)';
const KB_BORDER_STRONG = 'rgba(255,255,255,0.10)';
const KB_TEXT = '#F5F5F4';
const KB_MUTED = 'rgba(245,245,244,0.56)';
const KB_DIM = 'rgba(245,245,244,0.40)';
const KB_RED = '#ef4444';

const GRAMMAR = {
  noun: '#3b82f6',
  verb: '#ef4444',
  adj:  '#22c55e',
};
const JLPT = {
  N5: '#22c55e',
  N4: '#3b82f6',
  N3: '#f59e0b',
  N2: '#f97316',
  N1: '#ef4444',
};

// ─── iconography (minimal line) ───────────────────────────────
const Icon = {
  flame: (s=18, c=KB_RED) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M12 3c.4 3.1 2.8 4.4 4.4 6.2A6.5 6.5 0 0 1 18 13.5 6.5 6.5 0 1 1 6 13.5c0-1.8.7-3.5 1.9-4.7.3 1.4 1.3 2.2 2.2 2.2C11.5 11 11.5 7.8 12 3Z"
        fill={c} stroke={c} strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  ),
  play: (s=14, c='#fff') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={c}>
      <path d="M7 4.5v15l13-7.5z"/>
    </svg>
  ),
  pause: (s=14, c='#fff') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={c}>
      <rect x="6" y="4" width="4" height="16" rx="1"/>
      <rect x="14" y="4" width="4" height="16" rx="1"/>
    </svg>
  ),
  book: (s=18, c=KB_MUTED) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M4 5a2 2 0 0 1 2-2h12v15H6a2 2 0 0 0-2 2V5Z" stroke={c} strokeWidth="1.6"/>
      <path d="M4 20a2 2 0 0 1 2-2h12v3H6a2 2 0 0 1-2-1Z" stroke={c} strokeWidth="1.6"/>
    </svg>
  ),
  zap: (s=18, c=KB_MUTED) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" stroke={c} strokeWidth="1.6" strokeLinejoin="round"/>
    </svg>
  ),
  home: (s=22, c=KB_MUTED, active=false) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={active?c:'none'}>
      <path d="M3 11 12 3l9 8v10a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V11Z"
        stroke={c} strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  ),
  disc: (s=22, c=KB_MUTED, active=false) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.8"/>
      <circle cx="12" cy="12" r="3" stroke={c} strokeWidth="1.8" fill={active?c:'none'}/>
    </svg>
  ),
  cards: (s=22, c=KB_MUTED, active=false) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="14" height="14" rx="2" stroke={c} strokeWidth="1.8" fill={active?c:'none'}/>
      <path d="M7 3h12a2 2 0 0 1 2 2v12" stroke={c} strokeWidth="1.8"/>
    </svg>
  ),
  user: (s=22, c=KB_MUTED, active=false) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke={c} strokeWidth="1.8" fill={active?c:'none'}/>
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  chevR: (s=14, c=KB_DIM) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="m9 6 6 6-6 6" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  sparkle: (s=12, c='#fff') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={c}>
      <path d="M12 2 13.8 9 21 12l-7.2 3L12 22l-1.8-7L3 12l7.2-3L12 2Z"/>
    </svg>
  ),
};

// ─── Placeholder album art (no fake imagery, no SVG slop) ─────
function AlbumArt({ hue = 8, size = 64, label = '' }) {
  // Diagonal stripe placeholder that still reads as "album cover"
  return (
    <div style={{
      width: size, height: size, borderRadius: size >= 120 ? 18 : 10,
      position: 'relative', overflow: 'hidden', flexShrink: 0,
      background: `linear-gradient(135deg, oklch(0.34 0.08 ${hue}) 0%, oklch(0.22 0.06 ${hue}) 100%)`,
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `repeating-linear-gradient(135deg,
          rgba(255,255,255,0.04) 0 2px,
          transparent 2px 14px)`,
      }}/>
      {label && (
        <div style={{
          position: 'absolute', left: 10, bottom: 8,
          fontFamily: 'ui-monospace, "SF Mono", monospace',
          fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.45)',
        }}>{label}</div>
      )}
    </div>
  );
}

// ─── JLPT badge ───────────────────────────────────────────────
function JlptBadge({ level = 'N4', small = false }) {
  const c = JLPT[level];
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      height: small ? 20 : 24, padding: small ? '0 7px' : '0 9px',
      borderRadius: 999,
      fontSize: small ? 10 : 11, fontWeight: 700, letterSpacing: 0.6,
      color: c, background: `${c}1F`,
      boxShadow: `inset 0 0 0 1px ${c}40`,
      fontFamily: '-apple-system, system-ui',
    }}>{level}</div>
  );
}

// ─── Grammar dot chip ─────────────────────────────────────────
function GrammarDot({ type }) {
  const c = GRAMMAR[type];
  return <span style={{
    display: 'inline-block', width: 6, height: 6, borderRadius: 3,
    background: c, marginRight: 6, verticalAlign: 'middle',
  }}/>;
}

// ─── Header ───────────────────────────────────────────────────
function Header({ streak }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 20px 18px',
    }}>
      <img src="assets/logo-horizontal.png" alt="KitsuBeat"
        style={{ height: 44, width: 'auto', objectFit: 'contain',
                 filter: 'drop-shadow(0 0 14px rgba(239,68,68,0.32))' }}/>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        height: 34, padding: '0 12px 0 10px', borderRadius: 999,
        background: 'rgba(239,68,68,0.10)',
        boxShadow: `inset 0 0 0 1px rgba(239,68,68,0.25)`,
      }}>
        {Icon.flame(16, KB_RED)}
        <span style={{ color: '#fff', fontWeight: 650, fontSize: 14, letterSpacing: -0.1 }}>
          {streak}
        </span>
      </div>
    </div>
  );
}

// ─── Today's featured song (hero) ─────────────────────────────
function HeroCard({ variant = 'standard', accent = 'warm' }) {
  const glow = accent === 'bold'
    ? 'radial-gradient(120% 80% at 20% 0%, rgba(239,68,68,0.35) 0%, transparent 60%)'
    : 'radial-gradient(120% 80% at 20% 0%, rgba(239,68,68,0.18) 0%, transparent 60%)';

  if (variant === 'fullbleed') {
    return (
      <div style={{ margin: '0 20px 22px', borderRadius: 22, overflow: 'hidden',
                    position: 'relative', height: 260,
                    boxShadow: `inset 0 0 0 1px rgba(239,68,68,0.35), 0 12px 32px rgba(239,68,68,0.18)`,
                    background: KB_CARD }}>
        {/* album art fills the whole card — brighter at top */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(160deg, oklch(0.52 0.18 20) 0%, oklch(0.38 0.14 18) 45%, oklch(0.22 0.08 18) 100%)`,
        }}/>
        <div style={{
          position: 'absolute', inset: 0,
          background: `repeating-linear-gradient(135deg,
            rgba(255,255,255,0.06) 0 2px, transparent 2px 18px)`,
        }}/>
        {/* darker gradient overlay — only the bottom 40% */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%',
          background: 'linear-gradient(180deg, transparent 0%, rgba(10,10,10,0.55) 45%, rgba(10,10,10,0.88) 100%)',
        }}/>
        {/* subtle red inner glow */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          boxShadow: 'inset 0 0 60px rgba(239,68,68,0.18)',
        }}/>
        <div style={{
          position: 'absolute', top: 14, left: 14,
          fontFamily: 'ui-monospace, "SF Mono", monospace',
          fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.72)',
        }}>今日の一曲 · TODAY'S TRACK</div>
        <div style={{
          position: 'absolute', left: 18, right: 18, bottom: 16,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <JlptBadge level="N3" small/>
              <div style={{
                fontFamily: 'ui-monospace, monospace', fontSize: 10, color: KB_DIM,
                letterSpacing: 1, padding: '3px 7px', borderRadius: 999,
                boxShadow: `inset 0 0 0 1px ${KB_BORDER_STRONG}`,
              }}>42 WORDS</div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff',
                          letterSpacing: -0.3, lineHeight: 1.15 }}>
              夜に駆ける
            </div>
            <div style={{ fontSize: 13, color: KB_MUTED, marginTop: 2 }}>
              Yoru ni Kakeru · by artist name
            </div>
          </div>
          <button style={{
            width: 52, height: 52, borderRadius: 26, border: 0,
            background: KB_RED, color: '#fff', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(239,68,68,0.45)', cursor: 'pointer',
          }}>{Icon.play(18)}</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      margin: '0 20px 22px', padding: 16, borderRadius: 22,
      background: KB_CARD, position: 'relative', overflow: 'hidden',
      boxShadow: `inset 0 0 0 1px ${KB_BORDER_STRONG}`,
    }}>
      <div style={{ position: 'absolute', inset: 0, background: glow, pointerEvents: 'none' }}/>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{
          fontFamily: 'ui-monospace, "SF Mono", monospace',
          fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase',
          color: KB_DIM,
        }}>今日の一曲 · TODAY'S TRACK</div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontFamily: 'ui-monospace, monospace', fontSize: 10,
          color: KB_RED, letterSpacing: 0.8,
        }}>
          {Icon.sparkle(9, KB_RED)} NEW
        </div>
      </div>

      <div style={{ position: 'relative', display: 'flex', gap: 14, alignItems: 'center' }}>
        <AlbumArt hue={20} size={84} label="J-POP" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
            <JlptBadge level="N3" small/>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: KB_TEXT,
                        letterSpacing: -0.3, lineHeight: 1.2,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            夜に駆ける
          </div>
          <div style={{ fontSize: 12.5, color: KB_MUTED, marginTop: 2,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Yoru ni Kakeru · YOASOBI
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 10,
                        fontSize: 11, color: KB_MUTED,
                        fontFamily: 'ui-monospace, monospace', letterSpacing: 0.4 }}>
            <span>42 WORDS</span>
            <span style={{ color: KB_BORDER_STRONG }}>·</span>
            <span>4:21</span>
          </div>
        </div>
        <button style={{
          width: 48, height: 48, borderRadius: 24, border: 0,
          background: KB_RED, color: '#fff', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 16px rgba(239,68,68,0.40)', cursor: 'pointer',
        }}>{Icon.play(16)}</button>
      </div>
    </div>
  );
}

// ─── Stats row ────────────────────────────────────────────────
function StatTile({ icon, value, label, accent = false }) {
  return (
    <div style={{
      flex: 1, padding: '14px 12px', borderRadius: 16,
      background: KB_CARD, boxShadow: `inset 0 0 0 1px ${KB_BORDER}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        {icon}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent ? KB_RED : KB_TEXT,
                    letterSpacing: -0.5, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: KB_MUTED, marginTop: 4,
                    fontFamily: 'ui-monospace, monospace', letterSpacing: 0.3,
                    textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  );
}

function StatsRow({ streak, wordsToday, xp }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '0 20px 18px' }}>
      <StatTile icon={Icon.flame(16, KB_RED)} value={streak} label="Day streak" accent />
      <StatTile icon={Icon.book(16, KB_MUTED)} value={wordsToday} label="Words today" />
      <StatTile icon={Icon.zap(16, KB_MUTED)} value={xp} label="XP" />
    </div>
  );
}

// ─── Continue Learning CTA ────────────────────────────────────
function ContinueCTA({ accent = 'warm' }) {
  return (
    <div style={{ padding: '0 20px 26px' }}>
      <button style={{
        width: '100%', height: 60, borderRadius: 18, border: 0, cursor: 'pointer',
        background: accent === 'bold'
          ? 'linear-gradient(180deg, #f87171 0%, #ef4444 100%)'
          : KB_RED,
        color: '#fff', display: 'flex', alignItems: 'center',
        padding: '0 16px 0 18px', gap: 12,
        boxShadow: accent === 'bold'
          ? '0 8px 24px rgba(239,68,68,0.40), inset 0 1px 0 rgba(255,255,255,0.2)'
          : '0 4px 16px rgba(239,68,68,0.30)',
        fontFamily: '-apple-system, system-ui',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 18,
          background: 'rgba(255,255,255,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{Icon.play(14)}</div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontSize: 15, fontWeight: 650, letterSpacing: -0.2 }}>
            Continue learning
          </div>
          <div style={{ fontSize: 12, opacity: 0.82, marginTop: 1 }}>
            Pretender · 5 words remaining
          </div>
        </div>
        {Icon.chevR(14, 'rgba(255,255,255,0.9)')}
      </button>
    </div>
  );
}

// ─── Recently played — horizontal scroll ──────────────────────
function SongCard({ title, romaji, artist, level, progress, hue, tag }) {
  const c = JLPT[level];
  return (
    <div style={{
      width: 168, flexShrink: 0,
      background: KB_CARD, borderRadius: 18, padding: 10,
      boxShadow: `inset 0 0 0 1px ${KB_BORDER}`,
    }}>
      <div style={{ position: 'relative' }}>
        <AlbumArt hue={hue} size={148} label={tag} />
        <div style={{
          position: 'absolute', top: 8, right: 8,
        }}>
          <JlptBadge level={level} small/>
        </div>
        <button style={{
          position: 'absolute', right: 8, bottom: 8,
          width: 32, height: 32, borderRadius: 16, border: 0,
          background: 'rgba(17,17,17,0.7)', backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)',
        }}>{Icon.play(11)}</button>
      </div>
      <div style={{ padding: '10px 4px 2px' }}>
        <div style={{ fontSize: 14, fontWeight: 650, color: KB_TEXT, letterSpacing: -0.2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </div>
        <div style={{ fontSize: 11, color: KB_MUTED, marginTop: 1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {artist}
        </div>
        {/* progress */}
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 3, borderRadius: 2,
                        background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%',
                          background: c, borderRadius: 2 }}/>
          </div>
          <div style={{ fontSize: 10, color: KB_DIM,
                        fontFamily: 'ui-monospace, monospace' }}>
            {progress}%
          </div>
        </div>
      </div>
    </div>
  );
}

function RecentlyPlayed() {
  const songs = [
    { title: 'Pretender',  romaji: 'Pretender', artist: 'Official HIGE DANdism', level: 'N4', progress: 68, hue: 40, tag: 'J-POP' },
    { title: '夜に駆ける',  romaji: 'Yoru ni Kakeru', artist: 'YOASOBI',        level: 'N3', progress: 42, hue: 20, tag: 'J-POP' },
    { title: '紅蓮華',      romaji: 'Gurenge',        artist: 'LiSA',           level: 'N2', progress: 24, hue: 28, tag: 'ANIME' },
    { title: 'KICK BACK',   romaji: 'Kick Back',      artist: '米津玄師',       level: 'N3', progress: 91, hue: 60, tag: 'ROCK' },
    { title: '春よ、来い',  romaji: 'Haru yo, Koi',   artist: '松任谷由実',     level: 'N5', progress: 100, hue: 140, tag: 'CLASSIC' },
  ];
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline',
                    justifyContent: 'space-between', padding: '0 20px 12px' }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: KB_TEXT, letterSpacing: -0.3 }}>
            Recently played
          </div>
          <div style={{ fontSize: 11, color: KB_DIM, marginTop: 2,
                        fontFamily: 'ui-monospace, monospace', letterSpacing: 0.4 }}>
            最近聴いた曲
          </div>
        </div>
        <div style={{ fontSize: 13, color: KB_MUTED }}>See all</div>
      </div>
      <div style={{
        display: 'flex', gap: 12, padding: '0 20px 4px',
        overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        {songs.map((s, i) => <SongCard key={i} {...s}/>)}
      </div>
    </div>
  );
}

// ─── Word of the day preview (small extra card, earns its place) ─
function WordOfDay() {
  return (
    <div style={{ margin: '0 20px 28px', padding: 16, borderRadius: 18,
                  background: KB_CARD, boxShadow: `inset 0 0 0 1px ${KB_BORDER}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10,
                      letterSpacing: 1.2, color: KB_DIM, textTransform: 'uppercase' }}>
          今日の単語 · Word of the day
        </div>
        <JlptBadge level="N4" small/>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div style={{ fontSize: 34, fontWeight: 600, color: KB_TEXT, letterSpacing: -1,
                      fontFamily: '"Noto Sans JP", -apple-system, system-ui' }}>
          駆ける
        </div>
        <div style={{ fontSize: 13, color: KB_MUTED }}>kakeru</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center',
                       fontSize: 11, color: GRAMMAR.verb,
                       fontFamily: 'ui-monospace, monospace', letterSpacing: 0.6 }}>
          <GrammarDot type="verb"/>VERB
        </span>
        <span style={{ fontSize: 13, color: KB_MUTED }}>· to dash, to run</span>
      </div>
    </div>
  );
}

// ─── Bottom nav ───────────────────────────────────────────────
function BottomNav({ active = 'home', onChange }) {
  const items = [
    { id: 'home',   label: 'Home',   icon: Icon.home   },
    { id: 'songs',  label: 'Songs',  icon: Icon.disc   },
    { id: 'review', label: 'Review', icon: Icon.cards  },
    { id: 'profile',label: 'Profile',icon: Icon.user   },
  ];
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 30,
      paddingBottom: 34, paddingTop: 12,
      background: 'linear-gradient(180deg, rgba(17,17,17,0) 0%, #111 28%)',
    }}>
      <div style={{
        margin: '0 16px', height: 68, borderRadius: 24,
        background: 'rgba(22,22,22,0.92)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        boxShadow: `inset 0 0 0 1px ${KB_BORDER_STRONG}, 0 10px 28px rgba(0,0,0,0.5)`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        padding: '0 6px',
      }}>
        {items.map(it => {
          const isActive = it.id === active;
          return (
            <button key={it.id} onClick={() => onChange?.(it.id)}
              style={{
                flex: 1, height: '100%', background: 'transparent', border: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 3, cursor: 'pointer', position: 'relative',
              }}>
              {/* active red top indicator */}
              {isActive && (
                <div style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  width: 26, height: 3, borderRadius: 2, background: KB_RED,
                  boxShadow: '0 0 10px rgba(239,68,68,0.7)',
                }}/>
              )}
              <div style={{
                width: 44, height: 28, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isActive ? 'rgba(239,68,68,0.14)' : 'transparent',
              }}>
                {it.icon(22, isActive ? KB_RED : KB_MUTED, isActive)}
              </div>
              <div style={{
                fontSize: 10, fontWeight: isActive ? 700 : 500,
                color: isActive ? KB_RED : KB_MUTED,
                letterSpacing: 0.2,
                fontFamily: '-apple-system, system-ui',
              }}>{it.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Greeting (top of scroll content) ─────────────────────────
function Greeting() {
  return (
    <div style={{ padding: '8px 20px 18px' }}>
      <div style={{
        fontSize: 26, fontWeight: 600, color: KB_RED,
        letterSpacing: -0.3, lineHeight: 1.1,
        fontFamily: '"Noto Sans JP", -apple-system, system-ui',
        textShadow: '0 0 24px rgba(239,68,68,0.35)',
      }}>
        おかえり、
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: KB_TEXT,
                    letterSpacing: -0.6, marginTop: 4, lineHeight: 1.1 }}>
        Welcome back, Aiko
      </div>
    </div>
  );
}

// ─── Composed Home ────────────────────────────────────────────
function KitsuHome({ tweaks }) {
  const [tab, setTab] = React.useState('home');
  return (
    <div style={{ background: KB_BG, minHeight: '100%', color: KB_TEXT,
                  fontFamily: '-apple-system, "SF Pro Text", system-ui',
                  paddingTop: 54, paddingBottom: 120, position: 'relative' }}>
      <Header streak={47}/>
      <Greeting/>
      <HeroCard variant={tweaks.hero} accent={tweaks.accent}/>
      <StatsRow streak={47} wordsToday={23} xp={'1,240'}/>
      <ContinueCTA accent={tweaks.accent}/>
      <RecentlyPlayed/>
      <WordOfDay/>
      <BottomNav active={tab} onChange={setTab}/>
    </div>
  );
}

Object.assign(window, { KitsuHome });
