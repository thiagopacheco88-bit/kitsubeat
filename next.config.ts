import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const nextConfig: NextConfig = {
  /* config options here */
  // Phase 14 D-17: lint runs as a separate CI gate (`npm run lint`), not during build.
  // Avoids build-time false-positives from kitsubeat-tokens/no-raw-tokens flagging
  // pre-Wave-1 palette utilities that Wave 1+ migrations land fixes for.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

// Phase 13 D-09: bundle analyzer for human investigation when budget fails.
// Triggered via `npm run analyze` (ANALYZE=true next build). NOT in CI by default.
const enableAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default enableAnalyzer(nextConfig);
