import type { NextConfig } from "next";
import path from "path";
import withBundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

// @clerk/nextjs@7.4.3 ESM packaging bug: dist/esm/utils.js (barrel file) is missing;
// only dist/esm/utils/ (directory) exists. Webpack strict-ESM resolution requires the
// exact .js file and won't auto-fall-back to index.js. This alias redirects the broken
// import to the correct barrel so the build succeeds.
// Note: require.resolve('@clerk/nextjs/package.json') is blocked by the exports field on
// Node 24; resolve the main entry (dist/cjs/index.js) and go up 3 levels instead.
const clerkRoot = path.dirname(path.dirname(path.dirname(require.resolve("@clerk/nextjs"))));
const clerkEsmUtilsAlias = path.join(clerkRoot, "dist/esm/utils.js");
const clerkEsmUtilsTarget = path.join(clerkRoot, "dist/esm/utils/index.js");

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      [clerkEsmUtilsAlias]: clerkEsmUtilsTarget,
    };
    return config;
  },
  // Phase 14 D-17: lint runs as a separate CI gate, not during build.
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "s4.anilist.co" },
      { protocol: "https", hostname: "s1.anilist.co" },
      { protocol: "https", hostname: "anilist.co" },
    ],
  },
  // Tell Next.js file-tracing to bundle the MDX content files so that
  // fs.readFileSync calls in the journal admin pages work on Vercel.
  outputFileTracingIncludes: {
    "/admin/journal": ["./src/content/journal/**/*.mdx"],
    "/admin/journal/[slug]": ["./src/content/journal/**/*.mdx"],
    "/**": ["./src/messages/**/*.json"],
  },
};

// Phase 13 D-09: bundle analyzer for human investigation when budget fails.
// Triggered via `npm run analyze` (ANALYZE=true next build). NOT in CI by default.
const enableAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// Phase 15: Sentry error monitoring — wraps enableAnalyzer so Sentry's webpack plugin
// runs outermost, injecting source map upload + tunnel route at build time.
export default withSentryConfig(enableAnalyzer(withNextIntl(nextConfig)), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Bypass ad-blockers via a tunneled Next.js route
  tunnelRoute: "/sentry-tunnel",
  sourcemaps: {
    // Delete .map files from public bundle after upload — maps stay in Sentry, not served publicly
    deleteSourcemapsAfterUpload: true,
  },
  // Suppress output in local dev; show in CI for debugging
  silent: !process.env.CI,
});
