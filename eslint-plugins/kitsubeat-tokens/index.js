/**
 * Phase 14 — kitsubeat-tokens ESLint plugin.
 *
 * Custom rule: no-raw-tokens
 *
 * Blocks raw color hex (`bg-[#abc123]`), Tailwind palette utilities
 * (`bg-gray-950`), arbitrary px (`p-[14px]`), and bare white/black
 * (`bg-white`) in component code outside the design-system surface.
 *
 * Allowlist (per CONTEXT D-18): src/components/ui/, src/app/admin/,
 * src/app/__dev/, src/app/error.tsx, src/app/global-error.tsx, globals.css.
 * Allowlist enforcement lives in eslint.config.mjs `ignores` list, NOT here.
 *
 * Visitors:
 *   - JSXAttribute (className) — handles Literal, Template, JSXExpressionContainer
 *   - CallExpression (clsx/cn/twMerge/cva) — walks Literal + TemplateLiteral args
 */

const RAW_HEX = /\b(bg|text|border|fill|stroke|ring|shadow|outline|decoration|caret|accent|divide|placeholder)-\[#[0-9a-fA-F]{3,8}\]/;
const ARBITRARY_PX = /\b(text|p[xytrbl]?|m[xytrbl]?|gap|w|h|min-w|min-h|max-w|max-h|top|right|bottom|left|inset|space-[xy]|leading|tracking|rounded[a-z-]*|border|shadow|translate-[xy])-\[\d+(\.\d+)?px\]/;
const PALETTE_UTILITIES = /\b(bg|text|border|fill|stroke|ring|outline|decoration|divide|placeholder|caret|accent|shadow|from|via|to)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)\b/;
const BARE_WHITE_BLACK = /\b(bg|text|border|fill|stroke|ring|outline|decoration|divide|placeholder|caret|accent)-(white|black)\b(?!\/)/;

const MESSAGES = {
  rawHex: "Raw hex utility found. Use a token from globals.css @theme block.",
  arbitraryPx: "Arbitrary px utility found. Use a Tailwind size utility (text-sm, p-4) or a CSS var token.",
  palette: "Tailwind palette utility found. Use a token from globals.css @theme block.",
  bareWhiteBlack: "Bare white/black utility found. Use a token (bg-[var(--color-card)] etc.) or add an alpha modifier (bg-white/10).",
};

/**
 * Check a string against all 4 patterns; report first match (one violation per node).
 * Each call returns the message key or null.
 */
function checkString(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  if (RAW_HEX.test(value)) return MESSAGES.rawHex;
  if (ARBITRARY_PX.test(value)) return MESSAGES.arbitraryPx;
  if (PALETTE_UTILITIES.test(value)) return MESSAGES.palette;
  if (BARE_WHITE_BLACK.test(value)) return MESSAGES.bareWhiteBlack;
  return null;
}

const noRawTokens = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow raw hex colors, palette utilities, arbitrary px, and bare white/black in className strings (use design tokens from globals.css @theme).",
    },
    schema: [],
    messages: {
      rawHex: MESSAGES.rawHex,
      arbitraryPx: MESSAGES.arbitraryPx,
      palette: MESSAGES.palette,
      bareWhiteBlack: MESSAGES.bareWhiteBlack,
    },
  },
  create(context) {
    function reportIfViolation(node, value) {
      const message = checkString(value);
      if (message) {
        context.report({ node, message });
      }
    }

    function checkExpressionRecursive(node) {
      if (!node) return;
      if (node.type === "Literal") {
        reportIfViolation(node, node.value);
      } else if (node.type === "TemplateLiteral") {
        for (const q of node.quasis || []) {
          reportIfViolation(node, q.value && (q.value.cooked ?? q.value.raw));
        }
      } else if (node.type === "JSXExpressionContainer") {
        checkExpressionRecursive(node.expression);
      } else if (node.type === "ConditionalExpression") {
        checkExpressionRecursive(node.consequent);
        checkExpressionRecursive(node.alternate);
      } else if (node.type === "LogicalExpression") {
        checkExpressionRecursive(node.left);
        checkExpressionRecursive(node.right);
      } else if (node.type === "BinaryExpression" && node.operator === "+") {
        checkExpressionRecursive(node.left);
        checkExpressionRecursive(node.right);
      }
    }

    return {
      JSXAttribute(node) {
        if (!node.name || node.name.name !== "className") return;
        if (!node.value) return;
        if (node.value.type === "Literal") {
          reportIfViolation(node.value, node.value.value);
        } else if (node.value.type === "JSXExpressionContainer") {
          checkExpressionRecursive(node.value.expression);
        }
      },
      CallExpression(node) {
        const callee = node.callee;
        let name = null;
        if (callee.type === "Identifier") name = callee.name;
        else if (callee.type === "MemberExpression" && callee.property && callee.property.type === "Identifier") {
          name = callee.property.name;
        }
        if (!name) return;
        if (!["clsx", "cn", "twMerge", "cva"].includes(name)) return;
        for (const arg of node.arguments) {
          checkExpressionRecursive(arg);
        }
      },
    };
  },
};

const plugin = {
  meta: { name: "kitsubeat-tokens", version: "1.0.0" },
  rules: {
    "no-raw-tokens": noRawTokens,
  },
};

export default plugin;
