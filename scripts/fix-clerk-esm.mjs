/**
 * Postinstall: fix bare relative imports in @clerk/nextjs ESM build.
 *
 * Node.js 24 strict ESM requires explicit file extensions. Clerk 7.x ships
 * ESM files with bare "./routeMatcher" imports that resolve in bundlers but
 * fail under native Node.js. This script adds ".js" to every bare relative
 * import/export in dist/esm/.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

const ESM_DIR = new URL(
  "../node_modules/@clerk/nextjs/dist/esm",
  import.meta.url
).pathname.replace(/^\/([A-Z]:)/, "$1"); // fix Windows /C:/ → C:/

let fixedFiles = 0;
let fixedImports = 0;

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full);
    } else if (extname(full) === ".js") {
      fixFile(full);
    }
  }
}

function fixFile(filePath) {
  const src = readFileSync(filePath, "utf8");
  // Match: import/export ... from "./foo" or "../foo" where foo has no extension
  const fixed = src.replace(
    /((?:import|export)[^'"]*from\s+['"])(\.\.?\/[^'"]+)(['"'])/g,
    (match, prefix, path, quote) => {
      if (/\.[cm]?js$/.test(path) || /\.\w{2,4}$/.test(path)) return match;
      fixedImports++;
      return `${prefix}${path}.js${quote}`;
    }
  );
  if (fixed !== src) {
    writeFileSync(filePath, fixed, "utf8");
    fixedFiles++;
  }
}

try {
  walk(ESM_DIR);
  console.log(
    `fix-clerk-esm: patched ${fixedImports} imports across ${fixedFiles} files`
  );
} catch (err) {
  if (err.code === "ENOENT") {
    // @clerk/nextjs not installed yet — safe to skip during first install
    console.log("fix-clerk-esm: @clerk/nextjs not found, skipping");
  } else {
    throw err;
  }
}
