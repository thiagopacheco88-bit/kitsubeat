/**
 * Phase 14 — RuleTester for kitsubeat-tokens/no-raw-tokens.
 *
 * Per Plan 14-00 Task 2 behavior block: 8 cases (3 valid + 5 invalid).
 * Catches RAW_HEX, ARBITRARY_PX, PALETTE_UTILITIES, BARE_WHITE_BLACK in:
 *   - JSXAttribute className=""
 *   - clsx()/cn()/twMerge()/cva() string args
 *   - TemplateLiteral quasis
 */

import { RuleTester } from "eslint";
import plugin from "../index.js";

const rule = plugin.rules["no-raw-tokens"];

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

tester.run("no-raw-tokens", rule, {
  valid: [
    // CSS var arbitrary is OK
    { code: '<div className="bg-[var(--color-card)]" />' },
    // Size utilities are fine
    { code: '<div className="text-sm p-4" />' },
    // clsx with token-only utilities is fine
    { code: 'clsx("text-sm", "p-4")' },
  ],
  invalid: [
    // RAW_HEX
    { code: '<div className="bg-[#abc123]" />', errors: 1 },
    // PALETTE_UTILITIES
    { code: '<div className="bg-gray-950" />', errors: 1 },
    // ARBITRARY_PX
    { code: '<div className="p-[14px]" />', errors: 1 },
    // BARE_WHITE_BLACK
    { code: '<div className="bg-white" />', errors: 1 },
    // CallExpression (clsx)
    { code: 'clsx("bg-red-500")', errors: 1 },
  ],
});

console.log("RuleTester PASS — no-raw-tokens rule covers all 8 cases");
