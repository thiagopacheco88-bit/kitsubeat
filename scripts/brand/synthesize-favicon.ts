/**
 * synthesize-favicon.ts — Build favicon.ico from public/logo.png.
 *
 * Reads public/logo.png (must be exactly 512×512px — the user-generated Wave 2 asset),
 * resizes to 16×16 and 32×32 PNG frames via sharp, then constructs a valid ICO binary
 * (6-byte header + 2×16-byte directory entries + PNG frame data) and writes it to
 * public/favicon.ico.
 *
 * sharp v0.34.5 does NOT have a .ico() method — manual binary construction is required.
 *
 * Run via: npx tsx --tsconfig tsconfig.scripts.json scripts/brand/synthesize-favicon.ts
 */
import sharp from "sharp";
import { writeFileSync } from "fs";
import { resolve } from "path";

async function main(): Promise<void> {
  const logoPath = resolve("public/logo.png");

  // Guard: must be the Wave 2 512×512 user-generated asset, not the placeholder (616×625)
  const meta = await sharp(logoPath).metadata();
  if (meta.width !== 512 || meta.height !== 512) {
    throw new Error(
      `public/logo.png is ${meta.width}×${meta.height} — expected 512×512. ` +
      `Place the Wave 2 generated logo.png before running this script.`
    );
  }

  // Resize to 16×16 and 32×32 PNG frames
  const [buf16, buf32] = await Promise.all([
    sharp(logoPath).resize(16, 16).png().toBuffer(),
    sharp(logoPath).resize(32, 32).png().toBuffer(),
  ]);

  // ICO binary structure:
  //   6 bytes header
  //   2 × 16 bytes directory entries
  //   buf16 data
  //   buf32 data
  const headerSize = 6;
  const dirEntrySize = 16;
  const numImages = 2;
  const offset16 = headerSize + dirEntrySize * numImages;  // = 38
  const offset32 = offset16 + buf16.length;
  const ico = Buffer.alloc(offset32 + buf32.length);

  // ICO header (6 bytes at offset 0)
  ico.writeUInt16LE(0, 0);          // reserved = 0
  ico.writeUInt16LE(1, 2);          // type = 1 (icon, not cursor)
  ico.writeUInt16LE(numImages, 4);  // count = 2

  // Directory entry 1 — 16×16 (16 bytes at offset 6)
  ico.writeUInt8(16, 6);            // width
  ico.writeUInt8(16, 7);            // height
  ico.writeUInt8(0, 8);             // colorCount (0 = more than 256 colors)
  ico.writeUInt8(0, 9);             // reserved
  ico.writeUInt16LE(0, 10);         // planes
  ico.writeUInt16LE(32, 12);        // bitCount
  ico.writeUInt32LE(buf16.length, 14); // sizeInBytes
  ico.writeUInt32LE(offset16, 18);  // fileOffset

  // Directory entry 2 — 32×32 (16 bytes at offset 22)
  ico.writeUInt8(32, 22);           // width
  ico.writeUInt8(32, 23);           // height
  ico.writeUInt8(0, 24);            // colorCount
  ico.writeUInt8(0, 25);            // reserved
  ico.writeUInt16LE(0, 26);         // planes
  ico.writeUInt16LE(32, 28);        // bitCount
  ico.writeUInt32LE(buf32.length, 30); // sizeInBytes
  ico.writeUInt32LE(offset32, 34);  // fileOffset

  // Copy PNG frame data
  buf16.copy(ico, offset16);
  buf32.copy(ico, offset32);

  const outputPath = resolve("public/favicon.ico");
  writeFileSync(outputPath, ico);
  console.log(`OK: public/favicon.ico written (${ico.length} bytes, magic: 0x${ico.readUInt32LE(0).toString(16).padStart(8,"0")})`);
}

main().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
