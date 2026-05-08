/**
 * verify-brand-assets.ts — Validate Wave 2 raster asset dimensions and formats.
 *
 * Checks all 5 public/ brand assets against spec requirements:
 *   - public/logo.png: 512×512, transparent bg allowed
 *   - public/apple-touch-icon.png: 180×180, must be OPAQUE (no alpha)
 *   - public/og-image.png: 1200×630
 *   - public/twitter-image.png: 1200×630
 *   - public/favicon.ico: valid ICO (magic bytes 0x00010000)
 *
 * Run via: npx tsx --tsconfig tsconfig.scripts.json scripts/brand/verify-brand-assets.ts
 *
 * Exit codes:
 *   0 — all checks pass
 *   1 — one or more checks fail (errors printed to stderr)
 */
import sharp from "sharp";
import { readFileSync } from "fs";
import { resolve } from "path";

const EXPECTED = [
  { path: "public/logo.png",             width: 512,  height: 512,  allowAlpha: true  },
  { path: "public/apple-touch-icon.png", width: 180,  height: 180,  allowAlpha: false },
  { path: "public/og-image.png",         width: 1200, height: 630,  allowAlpha: true  },
  { path: "public/twitter-image.png",    width: 1200, height: 630,  allowAlpha: true  },
];

async function main(): Promise<void> {
  let failures = 0;

  for (const spec of EXPECTED) {
    const meta = await sharp(resolve(spec.path)).metadata();
    if (meta.width !== spec.width || meta.height !== spec.height) {
      console.error(`FAIL: ${spec.path}: expected ${spec.width}×${spec.height}, got ${meta.width}×${meta.height}`);
      failures++;
    } else if (!spec.allowAlpha && meta.hasAlpha) {
      console.error(`FAIL: ${spec.path} has alpha channel — apple-touch-icon MUST have opaque background (iOS renders black square otherwise)`);
      failures++;
    } else {
      console.log(`OK: ${spec.path} — ${meta.width}×${meta.height}${meta.hasAlpha ? " (alpha)" : " (opaque)"}`);
    }
  }

  // favicon.ico: check magic bytes (ICO = 00 00 01 00, little-endian UInt32 = 0x00010000)
  const icoPath = resolve("public/favicon.ico");
  const icoBuf = readFileSync(icoPath);
  const icoMagic = icoBuf.readUInt32LE(0);
  if (icoMagic !== 0x00010000) {
    console.error(`FAIL: public/favicon.ico — invalid magic bytes (expected 0x00010000, got 0x${icoMagic.toString(16).padStart(8, "0")})`);
    failures++;
  } else {
    console.log(`OK: public/favicon.ico — valid ICO magic bytes`);
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll brand asset checks passed.");
}

main().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
