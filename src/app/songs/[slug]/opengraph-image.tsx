import { ImageResponse } from 'next/og';
import { getSongBySlug } from '@/lib/db/queries';

export const runtime = 'nodejs';
export const contentType = 'image/png';
export const size = { width: 1200, height: 630 };

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const song = await getSongBySlug(slug);

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0505 100%)',
          padding: '64px 72px',
          justifyContent: 'flex-end',
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: '#dc2626',
            display: 'flex',
          }}
        />
        {/* Subtle grid pattern overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.04,
            backgroundImage: 'repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px)',
            display: 'flex',
          }}
        />
        {song ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {song.anime && (
              <div
                style={{
                  fontSize: 22,
                  color: '#dc2626',
                  fontWeight: 600,
                  marginBottom: 16,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  display: 'flex',
                }}
              >
                {song.anime}
              </div>
            )}
            <div
              style={{
                fontSize: song.title.length > 24 ? 52 : 64,
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.1,
                marginBottom: 20,
                display: 'flex',
              }}
            >
              {song.title}
            </div>
            <div style={{ fontSize: 30, color: '#9ca3af', fontWeight: 400, display: 'flex' }}>
              {song.artist}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 56, fontWeight: 700, color: '#ffffff', display: 'flex' }}>
            KitsuBeat
          </div>
        )}
        {/* Branding — bottom right */}
        <div
          style={{
            position: 'absolute',
            bottom: 44,
            right: 72,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 22, display: 'flex' }}>
            <span style={{ color: '#ffffff', fontWeight: 700 }}>Kitsu</span>
            <span style={{ color: '#dc2626', fontWeight: 700 }}>Beat</span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
