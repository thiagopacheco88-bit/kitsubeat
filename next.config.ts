import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const nextConfig: NextConfig = {
  /* config options here */
};

// Phase 13 D-09: bundle analyzer for human investigation when budget fails.
// Triggered via `npm run analyze` (ANALYZE=true next build). NOT in CI by default.
const enableAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default enableAnalyzer(nextConfig);
