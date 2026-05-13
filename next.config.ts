import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Phase 14 D-17: lint runs as a separate CI gate, not during build.
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Tell Next.js file-tracing to bundle the MDX content files so that
  // fs.readFileSync calls in the journal admin pages work on Vercel.
  outputFileTracingIncludes: {
    "/admin/journal": ["./src/content/journal/**/*.mdx"],
    "/admin/journal/[slug]": ["./src/content/journal/**/*.mdx"],
  },
};

// Phase 13 D-09: bundle analyzer for human investigation when budget fails.
// Triggered via `npm run analyze` (ANALYZE=true next build). NOT in CI by default.
const enableAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// Phase 15: Sentry error monitoring — wraps enableAnalyzer so Sentry's webpack plugin
// runs outermost, injecting source map upload + tunnel route at build time.
export default withSentryConfig(enableAnalyzer(nextConfig), {
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
