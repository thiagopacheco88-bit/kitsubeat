"use client";

import Image from "next/image";
import Link from "next/link";

// ─── Mock data ────────────────────────────────────────────────────────────────

const USER = { name: "Aiko", streakDays: 47, wordsToday: 23, xp: 1240 };

const TODAY = {
  title: "夜に駆ける",
  romaji: "Yoru ni Kakeru",
  artist: "YOASOBI",
  level: "N3",
  wordCount: 42,
  duration: "4:21",
  hue: 20,
  slug: "yoru-ni-kakeru",
};

const CONTINUE = {
  songTitle: "Pretender",
  wordsRemaining: 5,
  minutesRemaining: 3,
  slug: "pretender",
};

const SONGS = [
  { title: "Pretender", artist: "Official HIGE DANdism", level: "N4", progress: 68, hue: 40, tag: "J-POP", slug: "pretender" },
  { title: "夜に駆ける", artist: "YOASOBI", level: "N3", progress: 42, hue: 20, tag: "J-POP", slug: "yoru-ni-kakeru" },
  { title: "紅蓮華", artist: "LiSA", level: "N2", progress: 24, hue: 28, tag: "ANIME", slug: "gurenge" },
  { title: "KICK BACK", artist: "米津玄師", level: "N3", progress: 91, hue: 60, tag: "ROCK", slug: "kick-back" },
  { title: "春よ、来い", artist: "松任谷由実", level: "N5", progress: 100, hue: 140, tag: "CLASSIC", slug: "haru-yo-koi" },
  { title: "Lemon", artist: "米津玄師", level: "N4", progress: 55, hue: 95, tag: "J-POP", slug: "lemon" },
];

const WOD = {
  word: "駆ける",
  reading: "kakeru",
  pos: "VERB",
  subPos: "GODAN",
  level: "N4",
  glosses: ["to dash", "to run", "to gallop"],
  example: {
    jp: "夜の街を",
    highlight: "駆け",
    jpEnd: "ていく。",
    en: "I'm dashing through the night-time streets.",
  },
  source: { song: "夜に駆ける", artist: "YOASOBI" },
};

const STREAK_WEEK = [true, true, true, true, true, false, false];
const TODAY_IDX = 4;
const DAILY_GOAL = { done: 23, goal: 40 };
const WEEK_STATS = { wordsToday: 23, songs: 7, accuracy: 87 };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const JLPT_COLORS: Record<string, string> = {
  N5: "#22c55e",
  N4: "#3b82f6",
  N3: "#f59e0b",
  N2: "#f97316",
  N1: "#ef4444",
};

function jlptColor(level: string) {
  return JLPT_COLORS[level] ?? "#6b7280";
}

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function FlameIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2s-5 5.5-5 10a5 5 0 0 0 10 0c0-3-1.5-5-2-8-1 2-2 3.5-2 6-1-2-1-8-1-8z" />
    </svg>
  );
}

function PlayIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}

function BookIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function ZapIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function HomeIcon({ size, active }: { size: number; active: boolean }) {
  const c = active ? "#ef4444" : "rgba(245,245,244,0.56)";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? c : "none"} stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9,22 9,12 15,12 15,22" stroke={active ? "white" : c} />
    </svg>
  );
}

function SongsIcon({ size, active }: { size: number; active: boolean }) {
  const c = active ? "#ef4444" : "rgba(245,245,244,0.56)";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" fill={active ? c : "none"} />
    </svg>
  );
}

function ReviewIcon({ size, active }: { size: number; active: boolean }) {
  const c = active ? "#ef4444" : "rgba(245,245,244,0.56)";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function ProfileIcon({ size, active }: { size: number; active: boolean }) {
  const c = active ? "#ef4444" : "rgba(245,245,244,0.56)";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function SearchIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function BellIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

function JLPTBadge({ level, small = false }: { level: string; small?: boolean }) {
  const c = jlptColor(level);
  return (
    <span
      className="inline-flex items-center rounded-full font-mono font-medium uppercase"
      style={{
        fontSize: small ? 10 : 11,
        padding: small ? "1px 6px" : "2px 8px",
        color: c,
        background: hexToRgba(c, 0.12),
        boxShadow: `inset 0 0 0 1px ${hexToRgba(c, 0.25)}`,
      }}
    >
      {level}
    </span>
  );
}

function AlbumArt({ hue, className = "" }: { hue: number; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(135deg, oklch(0.34 0.08 ${hue}) 0%, oklch(0.22 0.06 ${hue}) 100%)`,
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0 2px, transparent 2px 14px)",
        }}
      />
    </div>
  );
}

// ─── Nav items config ─────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", Icon: HomeIcon },
  { href: "/songs", label: "Songs", Icon: SongsIcon },
  { href: "/review", label: "Review", Icon: ReviewIcon },
  { href: "/profile", label: "Profile", Icon: ProfileIcon },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar() {
  return (
    <aside
      className="hidden lg:flex w-[240px] shrink-0 flex-col"
      style={{
        background: "#111111",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        padding: "28px 20px 24px",
        minHeight: "100vh",
      }}
    >
      <div className="px-2 pb-5">
        <Image
          src="/logo-horizontal.png"
          alt="KitsuBeat"
          width={180}
          height={36}
          className="h-9 w-auto"
          style={{ filter: "drop-shadow(0 0 14px rgba(239,68,68,0.32))" }}
          unoptimized
        />
      </div>

      <p
        className="px-3 pb-2 pt-1 font-mono text-[10px] uppercase tracking-[1.2px]"
        style={{ color: "rgba(245,245,244,0.40)" }}
      >
        Menu
      </p>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = label === "Home";
          return (
            <Link
              key={href}
              href={href}
              className="relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors"
              style={
                active
                  ? {
                      background: "rgba(239,68,68,0.12)",
                      boxShadow: "inset 0 0 0 1px rgba(239,68,68,0.22)",
                      color: "#ef4444",
                      fontWeight: 650,
                    }
                  : { color: "rgba(245,245,244,0.56)", fontWeight: 500 }
              }
            >
              {active && (
                <span
                  className="absolute rounded-sm"
                  style={{
                    width: 3,
                    top: 10,
                    bottom: 10,
                    left: -20,
                    background: "#ef4444",
                    boxShadow: "0 0 12px rgba(239,68,68,0.7)",
                  }}
                />
              )}
              <Icon size={20} active={active} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div
        className="rounded-2xl"
        style={{
          background: "#191919",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
          padding: 14,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: "rgba(239,68,68,0.14)",
              boxShadow: "inset 0 0 0 1px rgba(239,68,68,0.25)",
            }}
          >
            <FlameIcon size={18} color="#ef4444" />
          </div>
          <div>
            <p className="text-lg font-bold leading-none tracking-tight text-white" style={{ letterSpacing: "-0.3px" }}>
              {USER.streakDays}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.4px]" style={{ color: "rgba(245,245,244,0.56)" }}>
              Day Streak
            </p>
          </div>
        </div>
        <div className="my-3" style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: "rgba(255,255,255,0.04)",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
            }}
          >
            <ZapIcon size={18} color="rgba(245,245,244,0.56)" />
          </div>
          <div>
            <p className="text-lg font-bold leading-none tracking-tight text-white" style={{ letterSpacing: "-0.3px" }}>
              {USER.xp.toLocaleString("en-US")}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.4px]" style={{ color: "rgba(245,245,244,0.56)" }}>
              Total XP
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────

function TopBar() {
  return (
    <div className="mb-7 flex items-center justify-between gap-5">
      <div>
        <p
          className="mb-1 font-[family-name:var(--font-noto-jp)] text-[15px] font-medium"
          style={{
            color: "#ef4444",
            textShadow: "0 0 18px rgba(239,68,68,0.3)",
            letterSpacing: "0.2px",
          }}
        >
          おかえり、{USER.name}
        </p>
        <h1
          className="text-[28px] font-bold leading-[1.1] text-[#F5F5F4]"
          style={{ letterSpacing: "-0.6px" }}
        >
          Welcome back, {USER.name}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div
          className="flex h-[42px] w-[300px] items-center gap-2 rounded-xl px-3.5"
          style={{
            background: "#191919",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
          }}
        >
          <SearchIcon size={16} color="rgba(245,245,244,0.40)" />
          <span className="flex-1 text-[13px]" style={{ color: "rgba(245,245,244,0.40)" }}>
            Search songs, words, artists…
          </span>
          <kbd
            className="rounded font-mono text-[10px] px-1.5 py-0.5"
            style={{
              color: "rgba(245,245,244,0.40)",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.10)",
            }}
          >
            ⌘K
          </kbd>
        </div>
        <div
          className="relative flex h-[42px] w-[42px] items-center justify-center rounded-xl"
          style={{
            background: "#191919",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
          }}
        >
          <BellIcon size={18} color="rgba(245,245,244,0.56)" />
          <span
            className="absolute rounded-full"
            style={{
              width: 7,
              height: 7,
              top: 10,
              right: 11,
              background: "#ef4444",
              boxShadow: "0 0 6px rgba(239,68,68,0.7)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Hero Card ────────────────────────────────────────────────────────────────

function HeroCard({ mobile = false }: { mobile?: boolean }) {
  return (
    <div
      className="relative overflow-hidden"
      style={{
        height: mobile ? 260 : 280,
        borderRadius: mobile ? 22 : 24,
        margin: mobile ? "0 20px 22px" : "0 0 22px",
        background:
          "linear-gradient(110deg, oklch(0.52 0.18 20) 0%, oklch(0.38 0.14 18) 50%, oklch(0.22 0.08 18) 100%)",
        boxShadow:
          "inset 0 0 0 1px rgba(239,68,68,0.32), 0 16px 40px rgba(239,68,68,0.14)",
      }}
    >
      {/* Texture */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.06) 0 2px, transparent 2px 20px)",
        }}
      />
      {/* Vignette */}
      {mobile ? (
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: "55%",
            background:
              "linear-gradient(180deg, transparent 0%, rgba(10,10,10,0.55) 45%, rgba(10,10,10,0.88) 100%)",
          }}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(10,10,10,0.75) 0%, rgba(10,10,10,0.45) 40%, transparent 70%)",
          }}
        />
      )}
      {/* Inner glow */}
      <div
        className="absolute inset-0"
        style={{ boxShadow: "inset 0 0 80px rgba(239,68,68,0.18)" }}
      />

      {/* Content */}
      <div
        className="relative flex h-full flex-col justify-between"
        style={{ padding: mobile ? "14px 14px 0" : "26px 32px" }}
      >
        {/* Top */}
        <div className="flex items-start justify-between">
          <span
            className="font-mono text-[11px] uppercase"
            style={{ letterSpacing: "1.4px", color: "rgba(255,255,255,0.75)" }}
          >
            今日の一曲 · TODAY&apos;S TRACK
          </span>
          {!mobile && (
            <span
              className="flex items-center gap-1.5 rounded-full font-mono text-[10px] uppercase text-white"
              style={{
                letterSpacing: "1px",
                padding: "6px 10px",
                background: "rgba(239,68,68,0.22)",
                boxShadow: "inset 0 0 0 1px rgba(239,68,68,0.5)",
              }}
            >
              ✦ NEW FOR YOU
            </span>
          )}
        </div>

        {/* Bottom */}
        <div
          className="flex items-end justify-between gap-6"
          style={
            mobile
              ? { position: "absolute", left: 18, right: 18, bottom: 16 }
              : {}
          }
        >
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <JLPTBadge level={TODAY.level} />
              <span
                className="rounded-full font-mono text-[10px]"
                style={{
                  padding: "3px 8px",
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)",
                  color: "rgba(245,245,244,0.56)",
                }}
              >
                {TODAY.wordCount} WORDS
              </span>
              {!mobile && (
                <span
                  className="rounded-full font-mono text-[10px]"
                  style={{
                    padding: "3px 8px",
                    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)",
                    color: "rgba(245,245,244,0.56)",
                  }}
                >
                  {TODAY.duration}
                </span>
              )}
            </div>
            <h2
              className="font-[family-name:var(--font-noto-jp)] font-bold text-white"
              style={{
                fontSize: mobile ? 22 : 44,
                letterSpacing: mobile ? "-0.3px" : "-1.2px",
                lineHeight: 1.05,
              }}
            >
              {TODAY.title}
            </h2>
            <p
              className="mt-1"
              style={{
                fontSize: mobile ? 13 : 16,
                color: "rgba(255,255,255,0.72)",
              }}
            >
              {TODAY.romaji} · {TODAY.artist}
            </p>
          </div>

          <div className="flex shrink-0 gap-2.5">
            {mobile ? (
              <Link
                href={`/songs/${TODAY.slug}`}
                className="flex h-[52px] w-[52px] items-center justify-center rounded-full"
                style={{
                  background: "#ef4444",
                  boxShadow: "0 6px 20px rgba(239,68,68,0.45)",
                }}
              >
                <PlayIcon size={18} color="white" />
              </Link>
            ) : (
              <>
                <Link
                  href={`/songs/${TODAY.slug}`}
                  className="flex items-center gap-2 whitespace-nowrap rounded-[26px] text-sm font-semibold text-white"
                  style={{
                    height: 52,
                    padding: "0 22px 0 18px",
                    background: "#ef4444",
                    boxShadow: "0 8px 22px rgba(239,68,68,0.45)",
                  }}
                >
                  <PlayIcon size={16} color="white" />
                  Start session
                </Link>
                <button
                  className="whitespace-nowrap rounded-[26px] text-sm font-semibold text-white"
                  style={{
                    height: 52,
                    padding: "0 18px",
                    background: "rgba(255,255,255,0.08)",
                    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)",
                    backdropFilter: "blur(6px)",
                  }}
                >
                  Preview
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stats Row (mobile) ───────────────────────────────────────────────────────

function StatsRow() {
  return (
    <div
      className="grid grid-cols-3 gap-2.5"
      style={{ margin: "0 20px 18px" }}
    >
      {[
        {
          icon: <FlameIcon size={16} color="#ef4444" />,
          value: USER.streakDays,
          label: "DAY STREAK",
          accent: true,
        },
        {
          icon: <BookIcon size={16} color="rgba(245,245,244,0.56)" />,
          value: USER.wordsToday,
          label: "WORDS TODAY",
          accent: false,
        },
        {
          icon: <ZapIcon size={16} color="rgba(245,245,244,0.56)" />,
          value: USER.xp.toLocaleString("en-US"),
          label: "XP",
          accent: false,
        },
      ].map(({ icon, value, label, accent }) => (
        <div
          key={label}
          className="flex flex-col items-center gap-1 rounded-2xl py-3.5"
          style={{
            background: "#191919",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
          }}
        >
          {icon}
          <span
            className="text-[22px] font-bold leading-none tracking-tight"
            style={{ color: accent ? "#ef4444" : "#F5F5F4", letterSpacing: "-0.5px" }}
          >
            {value}
          </span>
          <span
            className="font-mono text-[11px] uppercase"
            style={{ color: "rgba(245,245,244,0.56)", letterSpacing: "0.3px" }}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Continue CTA ─────────────────────────────────────────────────────────────

function ContinueCTA({ mobile = false }: { mobile?: boolean }) {
  return (
    <Link
      href={`/songs/${CONTINUE.slug}`}
      className="flex items-center gap-4"
      style={{
        display: "flex",
        height: mobile ? 60 : 72,
        borderRadius: 18,
        margin: mobile ? "0 20px 26px" : "0 0 34px",
        background: "#ef4444",
        padding: "0 20px",
        boxShadow:
          "0 8px 24px rgba(239,68,68,0.28), inset 0 1px 0 rgba(255,255,255,0.15)",
      }}
    >
      <div
        className="flex shrink-0 items-center justify-center rounded-full"
        style={{
          width: mobile ? 36 : 44,
          height: mobile ? 36 : 44,
          background: "rgba(255,255,255,0.18)",
        }}
      >
        <PlayIcon size={14} color="white" />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="font-bold leading-none text-white"
          style={{ fontSize: mobile ? 15 : 16, letterSpacing: "-0.2px" }}
        >
          Continue learning
        </p>
        <p className="mt-0.5 text-[13px]" style={{ color: "rgba(255,255,255,0.85)" }}>
          {CONTINUE.songTitle} — {CONTINUE.wordsRemaining} words remaining · ~{CONTINUE.minutesRemaining} min to finish
        </p>
      </div>
      <span
        className="shrink-0 font-mono text-[11px]"
        style={{ color: "rgba(255,255,255,0.9)", letterSpacing: "0.6px" }}
      >
        RESUME ›
      </span>
    </Link>
  );
}

// ─── Song Card ────────────────────────────────────────────────────────────────

function SongCard({
  song,
  compact = false,
}: {
  song: (typeof SONGS)[number];
  compact?: boolean;
}) {
  const c = jlptColor(song.level);
  const artSize = compact ? 148 : undefined;

  return (
    <Link
      href={`/songs/${song.slug}`}
      className="group block rounded-[18px] transition-transform hover:-translate-y-0.5"
      style={{
        width: compact ? 168 : undefined,
        flexShrink: compact ? 0 : undefined,
        background: "#191919",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
        padding: compact ? 10 : 12,
      }}
    >
      <div
        className="relative overflow-hidden"
        style={{
          width: artSize,
          height: artSize,
          aspectRatio: compact ? undefined : "1 / 1",
          borderRadius: 14,
          marginBottom: compact ? 8 : 14,
        }}
      >
        <AlbumArt hue={song.hue} className="h-full w-full" />
        <div className="absolute right-2 top-2">
          <JLPTBadge level={song.level} small />
        </div>
        <span
          className="absolute bottom-2 left-2 font-mono text-[10px] uppercase"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          {song.tag}
        </span>
        <button
          className="absolute bottom-2 right-2 flex items-center justify-center rounded-full"
          style={{
            width: 38,
            height: 38,
            background: "rgba(17,17,17,0.72)",
            backdropFilter: "blur(10px)",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15)",
          }}
          onClick={(e) => e.preventDefault()}
        >
          <PlayIcon size={13} color="white" />
        </button>
      </div>

      <p
        className="truncate font-[family-name:var(--font-noto-jp)] font-semibold text-[#F5F5F4]"
        style={{ fontSize: compact ? 14 : 15, letterSpacing: "-0.2px" }}
      >
        {song.title}
      </p>
      <p
        className="truncate"
        style={{ fontSize: compact ? 11 : 12, color: "rgba(245,245,244,0.56)" }}
      >
        {song.artist}
      </p>

      <div className="mt-3 flex items-center gap-2">
        <div
          className="relative h-[3px] flex-1 overflow-hidden rounded-full"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${song.progress}%`, background: c }}
          />
        </div>
        <span
          className="shrink-0 font-mono text-[10px]"
          style={{ color: "rgba(245,245,244,0.40)" }}
        >
          {song.progress}%
        </span>
      </div>
    </Link>
  );
}

// ─── Recently Played ──────────────────────────────────────────────────────────

function RecentlyPlayedGrid() {
  return (
    <section className="mb-8">
      <SectionHeader title="Recently played" jp="最近聴いた曲" action={{ label: "See all ›", href: "/songs" }} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {SONGS.map((song) => (
          <SongCard key={song.slug} song={song} />
        ))}
      </div>
    </section>
  );
}

function RecentlyPlayedScroll() {
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-baseline justify-between px-5">
        <div>
          <h2 className="text-[17px] font-bold text-[#F5F5F4]" style={{ letterSpacing: "-0.3px" }}>
            Recently played
          </h2>
          <p className="font-mono text-[11px]" style={{ color: "rgba(245,245,244,0.40)", letterSpacing: "0.4px" }}>
            最近聴いた曲
          </p>
        </div>
        <Link href="/songs" className="text-[13px]" style={{ color: "rgba(245,245,244,0.56)" }}>
          See all
        </Link>
      </div>
      <div
        className="flex gap-3 px-5 pb-1"
        style={{ overflowX: "auto", scrollbarWidth: "none" }}
      >
        {SONGS.slice(0, 5).map((song) => (
          <SongCard key={song.slug} song={song} compact />
        ))}
      </div>
    </section>
  );
}

// ─── Word of the Day ──────────────────────────────────────────────────────────

function WordOfDay({ mobile = false }: { mobile?: boolean }) {
  if (mobile) {
    return (
      <section style={{ margin: "0 20px" }}>
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <h2 className="text-[17px] font-bold text-[#F5F5F4]" style={{ letterSpacing: "-0.3px" }}>
              Word of the day
            </h2>
            <p className="font-mono text-[11px]" style={{ color: "rgba(245,245,244,0.40)", letterSpacing: "0.4px" }}>
              今日の単語
            </p>
          </div>
          <JLPTBadge level={WOD.level} small />
        </div>
        <div
          className="rounded-[18px] p-4"
          style={{
            background: "#191919",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
          }}
        >
          <p
            className="font-[family-name:var(--font-noto-jp)] font-semibold text-[#F5F5F4]"
            style={{ fontSize: 34, letterSpacing: "-1px" }}
          >
            {WOD.word}{" "}
            <span
              className="font-mono font-normal"
              style={{ fontSize: 13, color: "rgba(245,245,244,0.56)" }}
            >
              {WOD.reading}
            </span>
          </p>
          <div className="mt-2 flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "#ef4444" }}
            />
            <span
              className="font-mono text-[11px] uppercase"
              style={{ color: "#ef4444", letterSpacing: "0.6px" }}
            >
              {WOD.pos}
            </span>
            <span className="text-[13px]" style={{ color: "rgba(245,245,244,0.56)" }}>
              · {WOD.glosses.join(", ")}
            </span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <SectionHeader title="Word of the day" jp="今日の単語" action={{ label: "More words ›" }} />
      <div
        className="overflow-hidden rounded-[20px]"
        style={{
          background: "#191919",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
          display: "grid",
          gridTemplateColumns: "1fr 1px 1fr",
          gap: 0,
        }}
      >
        {/* Left: word */}
        <div className="p-6">
          <div className="mb-3 flex items-center gap-2.5">
            <JLPTBadge level={WOD.level} small />
            <span
              className="rounded-full font-mono text-[10px] uppercase"
              style={{
                padding: "3px 8px",
                letterSpacing: "0.6px",
                color: "#ef4444",
                background: "rgba(239,68,68,0.08)",
                boxShadow: "inset 0 0 0 1px rgba(239,68,68,0.20)",
              }}
            >
              {WOD.pos} · {WOD.subPos}
            </span>
          </div>
          <p
            className="font-[family-name:var(--font-noto-jp)] font-semibold text-[#F5F5F4]"
            style={{ fontSize: 72, letterSpacing: "-2px", lineHeight: 0.95 }}
          >
            {WOD.word}
          </p>
          <p className="mt-2 font-mono text-lg" style={{ color: "rgba(245,245,244,0.56)" }}>
            {WOD.reading}
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-[#F5F5F4]">
            {WOD.glosses.join(" · ")}
          </p>
        </div>

        {/* Divider */}
        <div style={{ background: "rgba(255,255,255,0.06)" }} />

        {/* Right: example */}
        <div className="flex flex-col justify-between p-6">
          <div>
            <p
              className="mb-3 font-mono text-[10px] uppercase"
              style={{ letterSpacing: "1.2px", color: "rgba(245,245,244,0.40)" }}
            >
              EXAMPLE · 例文
            </p>
            <p
              className="font-[family-name:var(--font-noto-jp)] text-[20px] leading-relaxed text-[#F5F5F4]"
              style={{ letterSpacing: "-0.2px" }}
            >
              {WOD.example.jp}
              <strong style={{ color: "#ef4444", fontWeight: 600 }}>
                {WOD.example.highlight}
              </strong>
              {WOD.example.jpEnd}
            </p>
            <p className="mt-2 text-[13px]" style={{ color: "rgba(245,245,244,0.56)" }}>
              {WOD.example.en}
            </p>
            <p className="mt-1 font-mono text-[11px]" style={{ color: "rgba(245,245,244,0.40)" }}>
              from · {WOD.source.song} · {WOD.source.artist}
            </p>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              className="rounded-[10px] text-[12.5px] font-semibold"
              style={{
                height: 38,
                padding: "0 16px",
                color: "#ef4444",
                background: "rgba(239,68,68,0.14)",
                boxShadow: "inset 0 0 0 1px rgba(239,68,68,0.28)",
              }}
            >
              + Add to review
            </button>
            <button
              className="rounded-[10px] text-[12.5px] font-semibold text-[#F5F5F4]"
              style={{
                height: 38,
                padding: "0 16px",
                background: "rgba(255,255,255,0.04)",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
              }}
            >
              Hear it
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  jp,
  action,
}: {
  title: string;
  jp: string;
  action?: { label: string; href?: string };
}) {
  return (
    <div className="mb-3.5 flex items-end justify-between">
      <div>
        <h2 className="text-lg font-bold text-[#F5F5F4]" style={{ letterSpacing: "-0.3px" }}>
          {title}
        </h2>
        <p
          className="font-mono text-[11px]"
          style={{ color: "rgba(245,245,244,0.40)", letterSpacing: "0.5px" }}
        >
          {jp}
        </p>
      </div>
      {action &&
        (action.href ? (
          <Link href={action.href} className="text-[13px]" style={{ color: "rgba(245,245,244,0.56)" }}>
            {action.label}
          </Link>
        ) : (
          <button className="text-[13px]" style={{ color: "rgba(245,245,244,0.56)" }}>
            {action.label}
          </button>
        ))}
    </div>
  );
}

// ─── Right Rail ───────────────────────────────────────────────────────────────

function RightRail() {
  const r = 60;
  const circumference = 2 * Math.PI * r;
  const progress = DAILY_GOAL.done / DAILY_GOAL.goal;
  const offset = circumference * (1 - progress);
  const days = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <aside
      className="hidden xl:flex w-[280px] shrink-0 flex-col gap-3.5"
      style={{ padding: "28px 24px 24px 0" }}
    >
      {/* Daily goal */}
      <div
        className="rounded-[18px]"
        style={{
          background: "#191919",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
          padding: 18,
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[13px] font-bold text-[#F5F5F4]">Daily goal</span>
          <span className="font-mono text-[10px]" style={{ color: "rgba(245,245,244,0.40)" }}>
            今日
          </span>
        </div>
        <div className="flex justify-center">
          <div className="relative" style={{ width: 140, height: 140 }}>
            <svg
              width="140"
              height="140"
              style={{
                transform: "rotate(-90deg)",
                filter: "drop-shadow(0 0 8px rgba(239,68,68,0.5))",
              }}
            >
              <defs>
                <linearGradient id="goalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f87171" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
              <circle
                cx="70" cy="70" r={r}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="10"
              />
              <circle
                cx="70" cy="70" r={r}
                fill="none"
                stroke="url(#goalGrad)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className="font-bold leading-none text-white"
                style={{ fontSize: 30, letterSpacing: "-0.8px" }}
              >
                {DAILY_GOAL.done}
              </span>
              <span className="font-mono text-[11px]" style={{ color: "rgba(245,245,244,0.56)" }}>
                / {DAILY_GOAL.goal} words
              </span>
            </div>
          </div>
        </div>
        <p className="mt-3 text-center text-[12px]" style={{ color: "rgba(245,245,244,0.56)" }}>
          <strong className="text-[#F5F5F4]">{DAILY_GOAL.goal - DAILY_GOAL.done} more</strong> to hit today&apos;s goal
        </p>
      </div>

      {/* Streak week */}
      <div
        className="rounded-[18px] p-4"
        style={{
          background: "#191919",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
        }}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[13px] font-bold text-[#F5F5F4]">Streak</span>
          <div className="flex items-center gap-1">
            <FlameIcon size={14} color="#ef4444" />
            <span className="text-[13px] font-bold" style={{ color: "#ef4444" }}>
              {USER.streakDays}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, i) => {
            const done = STREAK_WEEK[i];
            const today = i === TODAY_IDX;
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className="flex h-[26px] w-[26px] items-center justify-center rounded-full"
                  style={
                    done
                      ? {
                          background: "rgba(239,68,68,0.18)",
                          boxShadow: "inset 0 0 0 1px rgba(239,68,68,0.35)",
                        }
                      : { boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }
                  }
                >
                  {done && (
                    <span
                      className="rounded-full"
                      style={{
                        width: 8,
                        height: 8,
                        background: "#ef4444",
                        boxShadow: today
                          ? "0 0 10px rgba(239,68,68,0.9)"
                          : undefined,
                      }}
                    />
                  )}
                </div>
                <span
                  className="font-mono text-[10px]"
                  style={{
                    color: today ? "#ef4444" : "rgba(245,245,244,0.40)",
                    fontWeight: today ? 700 : 400,
                  }}
                >
                  {day}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* This week stats */}
      <div
        className="rounded-[18px]"
        style={{
          background: "#191919",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
        }}
      >
        <div className="px-[18px] pb-1.5 pt-3.5">
          <span className="text-[13px] font-bold text-[#F5F5F4]">This week</span>
        </div>
        {[
          { label: "Words today", jp: "今日の単語", value: WEEK_STATS.wordsToday, accent: true },
          { label: "Songs this week", jp: "今週の曲", value: WEEK_STATS.songs, accent: false },
          { label: "Review accuracy", jp: "復習の正確さ", value: `${WEEK_STATS.accuracy}%`, accent: false },
        ].map(({ label, jp, value, accent }, i, arr) => (
          <div
            key={label}
            className="flex items-center justify-between px-[18px] py-3"
            style={
              i < arr.length - 1
                ? { borderBottom: "1px solid rgba(255,255,255,0.06)" }
                : {}
            }
          >
            <div>
              <p className="text-[13px] font-semibold text-[#F5F5F4]">{label}</p>
              <p className="font-mono text-[10px]" style={{ color: "rgba(245,245,244,0.40)" }}>
                {jp}
              </p>
            </div>
            <span
              className="text-lg font-bold"
              style={{
                color: accent ? "#ef4444" : "#F5F5F4",
                letterSpacing: "-0.4px",
              }}
            >
              {value}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between px-[18px] py-3">
          <div>
            <p className="text-[13px] font-semibold text-[#F5F5F4]">JLPT target</p>
            <p className="font-mono text-[10px]" style={{ color: "rgba(245,245,244,0.40)" }}>
              目標
            </p>
          </div>
          <JLPTBadge level="N3" />
        </div>
      </div>
    </aside>
  );
}

// ─── Mobile Bottom Nav ────────────────────────────────────────────────────────

function MobileBottomNav() {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 lg:hidden"
      style={{
        background: "linear-gradient(180deg, rgba(17,17,17,0) 0%, #111 28%)",
        padding: "12px 0 34px",
        zIndex: 50,
      }}
    >
      <div
        className="mx-4 flex h-[68px] items-center rounded-3xl"
        style={{
          background: "rgba(22,22,22,0.92)",
          backdropFilter: "blur(20px) saturate(160%)",
          boxShadow:
            "inset 0 0 0 1px rgba(255,255,255,0.10), 0 10px 28px rgba(0,0,0,0.5)",
        }}
      >
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = label === "Home";
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-1 flex-col items-center gap-1"
            >
              {active && (
                <span
                  className="absolute top-0 rounded-full"
                  style={{
                    width: 26,
                    height: 3,
                    background: "#ef4444",
                    boxShadow: "0 0 10px rgba(239,68,68,0.7)",
                  }}
                />
              )}
              <div
                className="flex items-center justify-center rounded-[10px]"
                style={
                  active
                    ? { width: 44, height: 28, background: "rgba(239,68,68,0.14)" }
                    : { width: 44, height: 28 }
                }
              >
                <Icon size={20} active={active} />
              </div>
              <span
                className="text-[10px]"
                style={{
                  color: active ? "#ef4444" : "rgba(245,245,244,0.56)",
                  fontWeight: active ? 700 : 500,
                  letterSpacing: "0.2px",
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Mobile Layout ────────────────────────────────────────────────────────────

function MobileHome() {
  return (
    <div
      className="lg:hidden"
      style={{ background: "#111111", minHeight: "100vh", paddingBottom: 120 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <Image
          src="/logo-horizontal.png"
          alt="KitsuBeat"
          width={160}
          height={44}
          className="h-11 w-auto"
          style={{ filter: "drop-shadow(0 0 14px rgba(239,68,68,0.32))" }}
          unoptimized
        />
        <div
          className="flex items-center gap-1.5 rounded-full"
          style={{
            height: 34,
            padding: "0 12px",
            background: "rgba(239,68,68,0.10)",
            boxShadow: "inset 0 0 0 1px rgba(239,68,68,0.25)",
          }}
        >
          <FlameIcon size={16} color="#ef4444" />
          <span className="text-sm font-semibold text-white">{USER.streakDays}</span>
        </div>
      </div>

      {/* Greeting */}
      <div className="px-5 pb-4">
        <p
          className="font-[family-name:var(--font-noto-jp)] font-semibold text-[#ef4444]"
          style={{ fontSize: 26, letterSpacing: "-0.3px", lineHeight: 1.1, textShadow: "0 0 24px rgba(239,68,68,0.35)" }}
        >
          おかえり、
        </p>
        <p
          className="font-bold text-[#F5F5F4]"
          style={{ fontSize: 26, letterSpacing: "-0.6px", lineHeight: 1.1, marginTop: 4 }}
        >
          Welcome back, {USER.name}
        </p>
      </div>

      <HeroCard mobile />
      <StatsRow />
      <ContinueCTA mobile />
      <RecentlyPlayedScroll />
      <WordOfDay mobile />
    </div>
  );
}

// ─── Desktop Layout ───────────────────────────────────────────────────────────

function DesktopHome() {
  return (
    <div
      className="hidden lg:flex"
      style={{
        background: "#0E0E0E",
        minHeight: "100vh",
        position: "relative",
      }}
    >
      {/* Ambient gradients */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1400px 800px at 10% -10%, rgba(239,68,68,0.06), transparent 60%), radial-gradient(1100px 700px at 90% 110%, rgba(59,130,246,0.04), transparent 60%)",
        }}
      />

      <Sidebar />

      <main
        className="relative min-w-0 flex-1 overflow-y-auto"
        style={{ padding: "28px 24px 40px" }}
      >
        <TopBar />
        <HeroCard />
        <ContinueCTA />
        <RecentlyPlayedGrid />
        <WordOfDay />
      </main>

      <RightRail />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <>
      <MobileHome />
      <DesktopHome />
      <MobileBottomNav />
    </>
  );
}
