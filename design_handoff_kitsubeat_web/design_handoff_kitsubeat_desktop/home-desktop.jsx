// KitsuBeat Home — Desktop (1280px)
// Reuses the mobile design system: same tokens, icons, atoms.

const KB_BG         = '#0E0E0E';
const KB_BG_2       = '#111111';
const KB_CARD       = '#191919';
const KB_CARD_2     = '#1E1E1E';
const KB_BORDER     = 'rgba(255,255,255,0.06)';
const KB_BORDER_ST  = 'rgba(255,255,255,0.10)';
const KB_TEXT       = '#F5F5F4';
const KB_MUTED      = 'rgba(245,245,244,0.56)';
const KB_DIM        = 'rgba(245,245,244,0.40)';
const KB_RED        = '#ef4444';

const GRAMMAR = { noun: '#3b82f6', verb: '#ef4444', adj: '#22c55e' };
const JLPT    = { N5: '#22c55e', N4: '#3b82f6', N3: '#f59e0b', N2: '#f97316', N1: '#ef4444' };

const MONO = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, monospace';
const SANS = '-apple-system, "SF Pro Text", "Inter", system-ui, sans-serif';
const JP   = '"Noto Sans JP", -apple-system, system-ui';

// ─── Icons (kept identical to mobile) ─────────────────────────
const DIcon = {
  flame: (s=18, c=KB_RED) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M12 3c.4 3.1 2.8 4.4 4.4 6.2A6.5 6.5 0 0 1 18 13.5 6.5 6.5 0 1 1 6 13.5c0-1.8.7-3.5 1.9-4.7.3 1.4 1.3 2.2 2.2 2.2C11.5 11 11.5 7.8 12 3Z"
        fill={c} stroke={c} strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  ),
  play: (s=14, c='#fff') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M7 4.5v15l13-7.5z"/></svg>
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
  home: (s=20, c=KB_MUTED, active=false) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={active?c:'none'}>
      <path d="M3 11 12 3l9 8v10a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V11Z"
        stroke={c} strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  ),
  disc: (s=20, c=KB_MUTED, active=false) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.8"/>
      <circle cx="12" cy="12" r="3" stroke={c} strokeWidth="1.8" fill={active?c:'none'}/>
    </svg>
  ),
  cards: (s=20, c=KB_MUTED, active=false) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="14" height="14" rx="2" stroke={c} strokeWidth="1.8" fill={active?c:'none'}/>
      <path d="M7 3h12a2 2 0 0 1 2 2v12" stroke={c} strokeWidth="1.8"/>
    </svg>
  ),
  user: (s=20, c=KB_MUTED, active=false) => (
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
  search: (s=16, c=KB_DIM) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke={c} strokeWidth="1.8"/>
      <path d="m20 20-3.5-3.5" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  bell: (s=18, c=KB_MUTED) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M6 9a6 6 0 1 1 12 0c0 4 2 6 2 6H4s2-2 2-6Z" stroke={c} strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M10 19a2 2 0 0 0 4 0" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
};

// ─── Atoms (same as mobile) ───────────────────────────────────
function AlbumArt({ hue = 8, size = 64, radius, label = '' }) {
  const r = radius ?? (size >= 120 ? 18 : 10);
  return (
    <div style={{
      width: size, height: size, borderRadius: r,
      position: 'relative', overflow: 'hidden', flexShrink: 0,
      background: `linear-gradient(135deg, oklch(0.34 0.08 ${hue}) 0%, oklch(0.22 0.06 ${hue}) 100%)`,
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `repeating-linear-gradient(135deg,
          rgba(255,255,255,0.04) 0 2px, transparent 2px 14px)`,
      }}/>
      {label && (
        <div style={{
          position: 'absolute', left: 10, bottom: 8,
          fontFamily: MONO, fontSize: 9, letterSpacing: 0.8,
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)',
        }}>{label}</div>
      )}
    </div>
  );
}

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
      fontFamily: SANS,
    }}>{level}</div>
  );
}

function GrammarDot({ type }) {
  return <span style={{
    display: 'inline-block', width: 6, height: 6, borderRadius: 3,
    background: GRAMMAR[type], marginRight: 6, verticalAlign: 'middle',
  }}/>;
}

// ─── Sidebar ──────────────────────────────────────────────────
function SideNavItem({ id, label, icon, active, onClick }) {
  return (
    <button onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', height: 44, padding: '0 12px',
        border: 0, borderRadius: 12, cursor: 'pointer',
        background: active ? 'rgba(239,68,68,0.12)' : 'transparent',
        boxShadow: active ? 'inset 0 0 0 1px rgba(239,68,68,0.22)' : 'none',
        color: active ? KB_RED : KB_MUTED,
        fontFamily: SANS, fontSize: 14,
        fontWeight: active ? 650 : 500, letterSpacing: -0.1,
        textAlign: 'left', position: 'relative',
      }}>
      <div style={{ width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon(20, active ? KB_RED : KB_MUTED, active)}
      </div>
      <span>{label}</span>
      {active && (
        <div style={{
          position: 'absolute', left: -16, top: 10, bottom: 10, width: 3,
          borderRadius: 2, background: KB_RED,
          boxShadow: '0 0 12px rgba(239,68,68,0.7)',
        }}/>
      )}
    </button>
  );
}

function Sidebar({ tab, onTab, streak, xp }) {
  const items = [
    { id: 'home',    label: 'Home',    icon: DIcon.home  },
    { id: 'songs',   label: 'Songs',   icon: DIcon.disc  },
    { id: 'review',  label: 'Review',  icon: DIcon.cards },
    { id: 'profile', label: 'Profile', icon: DIcon.user  },
  ];
  return (
    <aside style={{
      width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column',
      padding: '28px 20px 24px', borderRight: `1px solid ${KB_BORDER}`,
      background: KB_BG_2, position: 'sticky', top: 0, height: '100vh',
    }}>
      <div style={{ padding: '0 8px 20px' }}>
        <img src="assets/logo-horizontal.png" alt="KitsuBeat"
          style={{ height: 36, width: 'auto', objectFit: 'contain',
                   filter: 'drop-shadow(0 0 14px rgba(239,68,68,0.32))' }}/>
      </div>

      <div style={{
        fontFamily: MONO, fontSize: 10, letterSpacing: 1.2,
        color: KB_DIM, textTransform: 'uppercase',
        padding: '4px 12px 8px',
      }}>Menu</div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map(it => (
          <SideNavItem key={it.id} {...it}
            active={tab === it.id}
            onClick={() => onTab(it.id)}/>
        ))}
      </nav>

      <div style={{ flex: 1 }}/>

      {/* Streak + XP pinned at bottom */}
      <div style={{
        padding: 14, borderRadius: 16, background: KB_CARD,
        boxShadow: `inset 0 0 0 1px ${KB_BORDER}`,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 12,
            background: 'rgba(239,68,68,0.14)',
            boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{DIcon.flame(18, KB_RED)}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: KB_TEXT,
                          letterSpacing: -0.3, lineHeight: 1 }}>
              {streak}
            </div>
            <div style={{ fontSize: 10, color: KB_MUTED, marginTop: 3,
                          fontFamily: MONO, letterSpacing: 0.4, textTransform: 'uppercase' }}>
              Day streak
            </div>
          </div>
        </div>
        <div style={{ height: 1, background: KB_BORDER }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 12,
            background: 'rgba(255,255,255,0.04)',
            boxShadow: `inset 0 0 0 1px ${KB_BORDER}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{DIcon.zap(18, KB_MUTED)}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: KB_TEXT,
                          letterSpacing: -0.3, lineHeight: 1 }}>
              {xp}
            </div>
            <div style={{ fontSize: 10, color: KB_MUTED, marginTop: 3,
                          fontFamily: MONO, letterSpacing: 0.4, textTransform: 'uppercase' }}>
              Total XP
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── Top bar (greeting + search, inside main) ─────────────────
function TopBar() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 20, marginBottom: 28,
    }}>
      <div>
        <div style={{
          fontFamily: JP, fontSize: 15, color: KB_RED, fontWeight: 500,
          letterSpacing: 0.2, marginBottom: 4,
          textShadow: '0 0 18px rgba(239,68,68,0.3)',
        }}>
          おかえり、Aiko
        </div>
        <div style={{
          fontSize: 28, fontWeight: 700, color: KB_TEXT,
          letterSpacing: -0.6, lineHeight: 1.1,
        }}>
          Welcome back, Aiko
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          height: 42, padding: '0 14px', width: 300,
          borderRadius: 12, background: KB_CARD,
          boxShadow: `inset 0 0 0 1px ${KB_BORDER}`,
        }}>
          {DIcon.search(16, KB_DIM)}
          <div style={{ color: KB_DIM, fontSize: 13, fontFamily: SANS }}>
            Search songs, words, artists…
          </div>
          <div style={{ flex: 1 }}/>
          <div style={{
            fontFamily: MONO, fontSize: 10, color: KB_DIM,
            padding: '2px 6px', borderRadius: 4,
            boxShadow: `inset 0 0 0 1px ${KB_BORDER_ST}`,
          }}>⌘K</div>
        </div>
        <button style={{
          width: 42, height: 42, borderRadius: 12, border: 0, cursor: 'pointer',
          background: KB_CARD, boxShadow: `inset 0 0 0 1px ${KB_BORDER}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          {DIcon.bell(18, KB_MUTED)}
          <div style={{
            position: 'absolute', top: 10, right: 11,
            width: 7, height: 7, borderRadius: 4, background: KB_RED,
            boxShadow: '0 0 6px rgba(239,68,68,0.7)',
          }}/>
        </button>
      </div>
    </div>
  );
}

// ─── Hero (adapted for wide desktop) ──────────────────────────
function HeroCard({ accent = 'warm' }) {
  return (
    <div style={{
      position: 'relative', borderRadius: 24, overflow: 'hidden',
      height: 280, marginBottom: 22,
      boxShadow: `inset 0 0 0 1px rgba(239,68,68,0.32), 0 16px 40px rgba(239,68,68,0.14)`,
      background: KB_CARD,
    }}>
      {/* album art fill */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(110deg, oklch(0.52 0.18 20) 0%, oklch(0.38 0.14 18) 50%, oklch(0.22 0.08 18) 100%)`,
      }}/>
      <div style={{
        position: 'absolute', inset: 0,
        background: `repeating-linear-gradient(135deg,
          rgba(255,255,255,0.06) 0 2px, transparent 2px 20px)`,
      }}/>
      {/* vignette from right so text has contrast */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg, rgba(10,10,10,0.75) 0%, rgba(10,10,10,0.45) 40%, transparent 70%)',
      }}/>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        boxShadow: 'inset 0 0 80px rgba(239,68,68,0.18)',
      }}/>

      {/* Content */}
      <div style={{
        position: 'absolute', inset: 0, padding: '26px 32px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{
            fontFamily: MONO, fontSize: 11, letterSpacing: 1.4,
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)',
          }}>今日の一曲 · TODAY'S TRACK</div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: MONO, fontSize: 10, color: '#fff',
            letterSpacing: 1, padding: '6px 10px', borderRadius: 999,
            background: 'rgba(239,68,68,0.22)',
            boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.5)',
          }}>
            {DIcon.sparkle(10, '#fff')} NEW FOR YOU
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end',
                      justifyContent: 'space-between', gap: 24 }}>
          <div style={{ minWidth: 0, flex: 1, maxWidth: 560 }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
              <JlptBadge level="N3"/>
              <div style={{
                fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.7)',
                letterSpacing: 1, padding: '4px 10px', borderRadius: 999,
                boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.18)`,
              }}>42 WORDS</div>
              <div style={{
                fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.7)',
                letterSpacing: 1, padding: '4px 10px', borderRadius: 999,
                boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.18)`,
              }}>4:21</div>
            </div>
            <div style={{
              fontSize: 44, fontWeight: 700, color: '#fff',
              letterSpacing: -1.2, lineHeight: 1.05,
              fontFamily: JP,
            }}>
              夜に駆ける
            </div>
            <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.72)',
                          marginTop: 8, fontFamily: SANS }}>
              Yoru ni Kakeru · YOASOBI
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button style={{
              height: 52, padding: '0 22px 0 18px', borderRadius: 26, border: 0,
              background: KB_RED, color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 14, fontWeight: 650, fontFamily: SANS, letterSpacing: -0.1,
              boxShadow: '0 8px 22px rgba(239,68,68,0.45)',
            }}>
              {DIcon.play(16)}
              Start session
            </button>
            <button style={{
              height: 52, padding: '0 18px', borderRadius: 26, border: 0,
              background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 14, fontWeight: 600, fontFamily: SANS,
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)',
              backdropFilter: 'blur(6px)',
            }}>
              Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Continue CTA row (full-width band) ───────────────────────
function ContinueCTA() {
  return (
    <button style={{
      width: '100%', height: 72, borderRadius: 18, border: 0, cursor: 'pointer',
      background: KB_RED, color: '#fff',
      display: 'flex', alignItems: 'center', padding: '0 20px',
      gap: 16, marginBottom: 34,
      boxShadow: '0 8px 24px rgba(239,68,68,0.28), inset 0 1px 0 rgba(255,255,255,0.15)',
      fontFamily: SANS, textAlign: 'left',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 22,
        background: 'rgba(255,255,255,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{DIcon.play(16)}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.2 }}>
          Continue learning
        </div>
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>
          Pretender — 5 words remaining · ~3 min to finish
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8,
                    fontFamily: MONO, fontSize: 11, letterSpacing: 0.6,
                    opacity: 0.9 }}>
        RESUME {DIcon.chevR(14, 'rgba(255,255,255,0.95)')}
      </div>
    </button>
  );
}

// ─── Section header ───────────────────────────────────────────
function SectionHeader({ en, jp, action = 'See all' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline',
                  justifyContent: 'space-between', marginBottom: 14 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: KB_TEXT, letterSpacing: -0.3 }}>
          {en}
        </div>
        <div style={{ fontSize: 11, color: KB_DIM, marginTop: 3,
                      fontFamily: MONO, letterSpacing: 0.5 }}>
          {jp}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: 13, color: KB_MUTED, cursor: 'pointer' }}>
        {action} {DIcon.chevR(12, KB_MUTED)}
      </div>
    </div>
  );
}

// ─── Recently played grid (3 cols) ────────────────────────────
function SongCard({ title, romaji, artist, level, progress, hue, tag, plays }) {
  const c = JLPT[level];
  return (
    <div style={{
      background: KB_CARD, borderRadius: 18, padding: 12,
      boxShadow: `inset 0 0 0 1px ${KB_BORDER}`,
      cursor: 'pointer', transition: 'transform 120ms',
    }}>
      <div style={{ position: 'relative' }}>
        <div style={{ width: '100%', aspectRatio: '1 / 1',
                      borderRadius: 14, overflow: 'hidden', position: 'relative',
                      background: `linear-gradient(135deg, oklch(0.34 0.08 ${hue}) 0%, oklch(0.22 0.06 ${hue}) 100%)`,
                      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: `repeating-linear-gradient(135deg,
              rgba(255,255,255,0.04) 0 2px, transparent 2px 14px)`,
          }}/>
          {tag && (
            <div style={{
              position: 'absolute', left: 12, bottom: 10,
              fontFamily: MONO, fontSize: 10, letterSpacing: 0.8,
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)',
            }}>{tag}</div>
          )}
          <div style={{ position: 'absolute', top: 10, right: 10 }}>
            <JlptBadge level={level} small/>
          </div>
          <button style={{
            position: 'absolute', right: 10, bottom: 10,
            width: 38, height: 38, borderRadius: 19, border: 0,
            background: 'rgba(17,17,17,0.72)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)',
          }}>{DIcon.play(13)}</button>
        </div>
      </div>
      <div style={{ padding: '14px 4px 4px' }}>
        <div style={{
          fontSize: 15, fontWeight: 650, color: KB_TEXT, letterSpacing: -0.2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontFamily: JP,
        }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: KB_MUTED, marginTop: 2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {artist}
        </div>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 3, borderRadius: 2,
                        background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%',
                          background: c, borderRadius: 2 }}/>
          </div>
          <div style={{ fontSize: 10, color: KB_DIM, fontFamily: MONO }}>
            {progress}%
          </div>
        </div>
      </div>
    </div>
  );
}

function RecentlyPlayedGrid() {
  const songs = [
    { title: 'Pretender',  romaji: 'Pretender',      artist: 'Official HIGE DANdism', level: 'N4', progress: 68, hue: 40,  tag: 'J-POP' },
    { title: '夜に駆ける',  romaji: 'Yoru ni Kakeru', artist: 'YOASOBI',              level: 'N3', progress: 42, hue: 20,  tag: 'J-POP' },
    { title: '紅蓮華',      romaji: 'Gurenge',        artist: 'LiSA',                 level: 'N2', progress: 24, hue: 28,  tag: 'ANIME' },
    { title: 'KICK BACK',   romaji: 'Kick Back',      artist: '米津玄師',             level: 'N3', progress: 91, hue: 60,  tag: 'ROCK' },
    { title: '春よ、来い',  romaji: 'Haru yo, Koi',   artist: '松任谷由実',           level: 'N5', progress: 100,hue: 140, tag: 'CLASSIC' },
    { title: 'Lemon',       romaji: 'Lemon',          artist: '米津玄師',             level: 'N4', progress: 55, hue: 95,  tag: 'J-POP' },
  ];
  return (
    <section style={{ marginBottom: 34 }}>
      <SectionHeader en="Recently played" jp="最近聴いた曲"/>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {songs.slice(0, 6).map((s, i) => <SongCard key={i} {...s}/>)}
      </div>
    </section>
  );
}

// ─── Word of the day (wide desktop version) ───────────────────
function WordOfDay() {
  return (
    <section style={{ marginBottom: 40 }}>
      <SectionHeader en="Word of the day" jp="今日の単語" action="More words"/>
      <div style={{
        padding: 24, borderRadius: 20, background: KB_CARD,
        boxShadow: `inset 0 0 0 1px ${KB_BORDER}`,
        display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 24,
        alignItems: 'stretch',
      }}>
        {/* Left: the word */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <JlptBadge level="N4" small/>
            <span style={{ display: 'inline-flex', alignItems: 'center',
                           fontSize: 10, color: GRAMMAR.verb,
                           fontFamily: MONO, letterSpacing: 0.8,
                           padding: '3px 8px', borderRadius: 999,
                           background: `${GRAMMAR.verb}14`,
                           boxShadow: `inset 0 0 0 1px ${GRAMMAR.verb}33`,
                           textTransform: 'uppercase' }}>
              <GrammarDot type="verb"/>Verb · godan
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
            <div style={{
              fontSize: 72, fontWeight: 600, color: KB_TEXT, letterSpacing: -2,
              lineHeight: 0.95, fontFamily: JP,
            }}>
              駆ける
            </div>
            <div style={{ fontSize: 18, color: KB_MUTED, fontFamily: MONO }}>
              kakeru
            </div>
          </div>
          <div style={{ fontSize: 15, color: KB_TEXT, marginTop: 16, lineHeight: 1.45 }}>
            to dash · to run · to gallop
          </div>
        </div>

        {/* Divider */}
        <div style={{ background: KB_BORDER, width: 1 }}/>

        {/* Right: example + action */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{
              fontFamily: MONO, fontSize: 10, letterSpacing: 1.2,
              color: KB_DIM, textTransform: 'uppercase', marginBottom: 10,
            }}>Example · 例文</div>
            <div style={{ fontSize: 20, color: KB_TEXT, fontFamily: JP,
                          letterSpacing: -0.2, lineHeight: 1.4 }}>
              夜の街を<span style={{ color: KB_RED, fontWeight: 600 }}>駆け</span>ていく。
            </div>
            <div style={{ fontSize: 13, color: KB_MUTED, marginTop: 8, lineHeight: 1.5 }}>
              I'm dashing through the night-time streets.
            </div>
            <div style={{ fontSize: 11, color: KB_DIM, marginTop: 6, fontFamily: MONO }}>
              from · 夜に駆ける · YOASOBI
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <button style={{
              height: 38, padding: '0 16px', borderRadius: 10, border: 0, cursor: 'pointer',
              background: 'rgba(239,68,68,0.14)', color: KB_RED,
              boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.28)',
              fontSize: 12.5, fontWeight: 650, fontFamily: SANS, letterSpacing: -0.1,
            }}>+ Add to review</button>
            <button style={{
              height: 38, padding: '0 16px', borderRadius: 10, border: 0, cursor: 'pointer',
              background: 'rgba(255,255,255,0.04)', color: KB_TEXT,
              boxShadow: `inset 0 0 0 1px ${KB_BORDER}`,
              fontSize: 12.5, fontWeight: 600, fontFamily: SANS,
            }}>Hear it</button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Right rail: daily progress & quick stats ─────────────────
function RingProgress({ value = 0.62, size = 140, stroke = 10 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - value);
  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f87171"/>
          <stop offset="100%" stopColor="#ef4444"/>
        </linearGradient>
      </defs>
      <circle cx={size/2} cy={size/2} r={r}
        stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none"/>
      <circle cx={size/2} cy={size/2} r={r}
        stroke="url(#ringGrad)" strokeWidth={stroke} fill="none"
        strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={off}
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.5))' }}/>
    </svg>
  );
}

function DailyGoal() {
  const done = 23, goal = 40;
  const pct = done / goal;
  return (
    <div style={{
      padding: 18, borderRadius: 18, background: KB_CARD,
      boxShadow: `inset 0 0 0 1px ${KB_BORDER}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: KB_TEXT, letterSpacing: -0.1 }}>
          Daily goal
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: KB_DIM, letterSpacing: 0.6 }}>
          今日
        </div>
      </div>
      <div style={{ position: 'relative', width: 140, height: 140, margin: '8px auto 10px' }}>
        <RingProgress value={pct} size={140} stroke={10}/>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: KB_TEXT,
                        letterSpacing: -0.8, lineHeight: 1 }}>
            {done}
          </div>
          <div style={{ fontSize: 11, color: KB_MUTED, marginTop: 4,
                        fontFamily: MONO, letterSpacing: 0.4 }}>
            / {goal} words
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: KB_MUTED, textAlign: 'center', lineHeight: 1.5 }}>
        <span style={{ color: KB_TEXT, fontWeight: 600 }}>{goal - done} more</span> to hit today's goal
      </div>
    </div>
  );
}

function QuickStatRow({ label, jp, value, accent }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 0', borderBottom: `1px solid ${KB_BORDER}`,
    }}>
      <div>
        <div style={{ fontSize: 13, color: KB_TEXT, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 10, color: KB_DIM, marginTop: 2,
                      fontFamily: MONO, letterSpacing: 0.4 }}>
          {jp}
        </div>
      </div>
      <div style={{
        fontSize: 18, fontWeight: 700,
        color: accent ? KB_RED : KB_TEXT,
        letterSpacing: -0.4, fontFamily: SANS,
      }}>
        {value}
      </div>
    </div>
  );
}

function QuickStats() {
  return (
    <div style={{
      padding: '4px 18px 14px', borderRadius: 18, background: KB_CARD,
      boxShadow: `inset 0 0 0 1px ${KB_BORDER}`,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: KB_TEXT,
                    letterSpacing: -0.1, padding: '14px 0 6px' }}>
        This week
      </div>
      <QuickStatRow label="Words today"   jp="今日の単語"  value="23" accent/>
      <QuickStatRow label="Songs this week" jp="今週の曲" value="7"/>
      <QuickStatRow label="Review accuracy" jp="復習の正確さ" value="87%"/>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 0 2px' }}>
        <div>
          <div style={{ fontSize: 13, color: KB_TEXT, fontWeight: 600 }}>JLPT target</div>
          <div style={{ fontSize: 10, color: KB_DIM, marginTop: 2,
                        fontFamily: MONO, letterSpacing: 0.4 }}>
            目標
          </div>
        </div>
        <JlptBadge level="N3"/>
      </div>
    </div>
  );
}

function WeekDots() {
  const days = ['M','T','W','T','F','S','S'];
  const status = [true, true, true, true, true, false, false]; // up through today (Fri)
  const today = 4;
  return (
    <div style={{
      padding: 16, borderRadius: 18, background: KB_CARD,
      boxShadow: `inset 0 0 0 1px ${KB_BORDER}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: KB_TEXT, letterSpacing: -0.1 }}>
          Streak
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6,
                      color: KB_RED, fontSize: 13, fontWeight: 700 }}>
          {DIcon.flame(14, KB_RED)} 47
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
        {days.map((d, i) => {
          const done = status[i];
          const isToday = i === today;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column',
                                  alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 13,
                background: done ? 'rgba(239,68,68,0.18)' : 'transparent',
                boxShadow: done
                  ? 'inset 0 0 0 1px rgba(239,68,68,0.35)'
                  : `inset 0 0 0 1px ${KB_BORDER}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}>
                {done && (
                  <div style={{ width: 8, height: 8, borderRadius: 4,
                                background: KB_RED,
                                boxShadow: isToday ? '0 0 10px rgba(239,68,68,0.9)' : 'none' }}/>
                )}
              </div>
              <div style={{
                fontSize: 10, color: isToday ? KB_RED : KB_DIM,
                fontFamily: MONO, letterSpacing: 0.6, fontWeight: isToday ? 700 : 500,
              }}>{d}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RightRail() {
  return (
    <aside style={{
      width: 280, flexShrink: 0, padding: '28px 24px 24px 0',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <DailyGoal/>
      <WeekDots/>
      <QuickStats/>
    </aside>
  );
}

// ─── Composed desktop home ────────────────────────────────────
function KitsuHomeDesktop({ tweaks }) {
  const [tab, setTab] = React.useState('home');
  return (
    <div style={{
      display: 'flex', width: 1280, minHeight: 900,
      background: KB_BG, color: KB_TEXT, fontFamily: SANS,
      position: 'relative', overflow: 'hidden',
      boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
      borderRadius: 14,
    }}>
      {/* ambient glows */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(900px 500px at 12% -10%, rgba(239,68,68,0.08), transparent 60%),
          radial-gradient(700px 500px at 105% 20%, rgba(59,130,246,0.04), transparent 60%)`,
      }}/>

      <Sidebar tab={tab} onTab={setTab} streak={47} xp="1,240"/>

      <main style={{ flex: 1, padding: '28px 24px 40px', minWidth: 0, position: 'relative' }}>
        <TopBar/>
        <HeroCard/>
        <ContinueCTA/>
        <RecentlyPlayedGrid/>
        <WordOfDay/>
      </main>

      <RightRail/>
    </div>
  );
}

Object.assign(window, { KitsuHomeDesktop });
