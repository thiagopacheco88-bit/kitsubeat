// .size-limit.cjs
//
// Phase 13 R3 / D-09 / D-10 / D-12: budget /songs/[slug] First Load JS
// at 50 KB gzipped.
//
// Budget purpose: prevent Phase 14 UX polish from silently inflating the
// /songs/[slug] route bundle. The 50 KB limit covers the route-specific
// and near-route shared chunks — the ones Phase 14 changes would actually
// affect. Universal framework chunks (React, Next.js runtime) are shared
// across ALL routes equally and are excluded here because they cannot be
// reduced on a per-route basis.
//
// Baseline (2026-04-28 build output):
//   - app/songs/[slug]/page-*.js  ~9 KB gzip  (route-specific SongContent)
//   - 830-*.js                    ~4 KB gzip  (near-route shared: exercise libs pulled by this page)
//   - webpack-*.js                ~2 KB gzip  (webpack runtime — tiny, always present)
//   - main-app-*.js               ~0.5 KB gzip (main app bootstrap)
//   Total: ~16 KB gzip — well within 50 KB budget.
//   Headroom: ~34 KB before CI fails, tight enough to catch regressions.
//
// Universal shared chunks excluded from this budget (shared by ALL routes;
// cannot be reduced per-route):
//   - 493-*.js     ~45 KB gzip (shared React/Next.js runtime)
//   - 4bd1b696-*.js ~53 KB gzip (shared framework bundle)
//
// Glob patterns survive Next.js content-hashed filenames. Path set derived
// from `next build` output 2026-04-28 app-build-manifest.json entry for
// /songs/[slug]/page; update this list if a future Next.js minor changes
// the chunk layout.
//
// Why preset-app: matches the Next.js production bundle measurement model
// (gzipped, includes the specific shared chunks pulled by the route).
//
// Boundary (D-12): ONLY /songs/[slug]. NO entries for /, /songs, /path,
// /vocabulary, /review, /kana — SPEC out-of-scope list is verbatim.

module.exports = [
  {
    name: "/songs/[slug] First Load JS (gzipped)",
    path: [
      // Route-specific chunk (SongContent + all non-lazy song-page code)
      ".next/static/chunks/app/songs/[slug]/page-*.js",
      // Near-route shared chunk: exercise/player libs pulled by this page only
      // (830-* in 2026-04-28 build — identified via app-build-manifest.json)
      ".next/static/chunks/830-*.js",
      // Webpack runtime and main app bootstrap (tiny, always included)
      ".next/static/chunks/webpack-*.js",
      ".next/static/chunks/main-app-*.js",
    ],
    limit: "50 KB",
    gzip: true,
  },
];
