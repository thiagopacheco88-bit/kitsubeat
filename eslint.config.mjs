// eslint.config.mjs (Phase 14 wave 0)
//
// ESLint 9 flat config. eslint-config-next@16 ships flat config natively
// — direct array spread (no FlatCompat needed for v16). FlatCompat was
// in the original plan but is incompatible with eslint-config-next 16's
// internal plugin shape (circular reference in JSON.stringify).
//
// Custom rule: kitsubeat-tokens/no-raw-tokens — see eslint-plugins/kitsubeat-tokens/index.js
// Allowlist (per CONTEXT D-18): src/components/ui/, src/app/admin/,
// src/app/__dev/, src/app/error.tsx, src/app/global-error.tsx, globals.css.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import kitsubeatTokens from "./eslint-plugins/kitsubeat-tokens/index.js";

export default [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "kitsubeat-tokens": kitsubeatTokens },
    rules: {
      "kitsubeat-tokens/no-raw-tokens": "error",
    },
  },
  {
    ignores: [
      "src/components/ui/**",         // primitives may use raw values inside CVA maps (D-18)
      "src/app/admin/**",             // operator-facing per D-18
      "src/app/__dev/**",             // dev catalog per D-18
      "src/app/error.tsx",            // framework fallback per D-18
      "src/app/global-error.tsx",     // framework fallback per D-18
      ".next/**",
      "node_modules/**",
      "tests/**",                     // tests may import raw values from components under test
      "scripts/**",                   // operator scripts out of D-22 scope
      "drizzle/**",                   // SQL migrations
      "eslint-plugins/**",            // plugin code itself uses regex string literals
    ],
  },
];
