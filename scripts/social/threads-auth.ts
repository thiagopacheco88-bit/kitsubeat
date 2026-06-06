/**
 * Threads OAuth — one-time setup to get a long-lived access token.
 *
 * Prerequisites (one manual step in Meta Developer Portal):
 *   1. Go to: https://developers.facebook.com/apps/819713077615861/use_cases/customize/
 *      → Click "Settings" (left panel)
 *      → In "Redirect Callback URLs" type: http://localhost:3777  then press Enter
 *      → Click Save
 *
 * Usage: npx tsx --tsconfig tsconfig.scripts.json scripts/social/threads-auth.ts
 *   → Opens browser, you authorize, token is saved to .env.local
 */
import http from "http";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const REDIRECT = "http://localhost:3777";
const SCOPE = "threads_basic,threads_content_publish,threads_delete";
const ENV_PATH = join(process.cwd(), ".env.local");
const BASE = "https://graph.threads.net";

// Load .env.local
const envContent = readFileSync(ENV_PATH, "utf8");
const getEnv = (key: string) => envContent.split("\n").find(l => l.startsWith(key + "="))?.split("=")[1]?.trim() ?? "";

const APP_ID = getEnv("THREADS_APP_ID_V2");
const APP_SECRET = getEnv("THREADS_APP_SECRET_NEW");

if (!APP_ID) {
  console.error("\n⚠️  THREADS_APP_ID_V2 not found in .env.local");
  console.error("   Add: THREADS_APP_ID_V2=27302992889336529\n");
  process.exit(1);
}
if (!APP_SECRET) {
  console.error("\n⚠️  THREADS_APP_SECRET_NEW not found in .env.local");
  console.error("   Add: THREADS_APP_SECRET_NEW=<value from portal Settings page → Show>\n");
  process.exit(1);
}

// Build authorization URL
const authUrl = `https://threads.net/oauth/authorize?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT)}&scope=${encodeURIComponent(SCOPE)}&response_type=code`;

console.log("\n📋 Opening browser for Threads authorization...");
console.log("   URL:", authUrl);
console.log("\n   If the browser doesn't open automatically, paste the URL manually.\n");

// Open the URL in the default browser
const { exec } = await import("child_process");
exec(`start "" "${authUrl}"`);

// Start a local HTTP server to capture the callback
const code = await new Promise<string>((resolve, reject) => {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url!, `http://localhost:3777`);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error_message") ?? url.searchParams.get("error");

    res.writeHead(200, { "Content-Type": "text/html" });
    if (code) {
      res.end("<h1>✅ Authorization successful! You can close this tab.</h1>");
      server.close();
      resolve(code);
    } else {
      res.end(`<h1>❌ Authorization failed: ${error}</h1>`);
      server.close();
      reject(new Error(`OAuth error: ${error}`));
    }
  });
  server.listen(3777, () => console.log("   Waiting for authorization at http://localhost:3777 ..."));
  server.on("error", reject);
});

console.log("\n✓ Got authorization code:", code.slice(0, 20) + "...");

// Exchange code for short-lived token
console.log("Exchanging code for access token...");
const tokenRes = await fetch(`${BASE}/oauth/access_token`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: APP_ID,
    client_secret: APP_SECRET,
    grant_type: "authorization_code",
    redirect_uri: REDIRECT,
    code,
  }),
});
if (!tokenRes.ok) throw new Error(`Token exchange failed: ${await tokenRes.text()}`);
const { access_token: shortToken, user_id } = await tokenRes.json() as { access_token: string; user_id: string };
console.log("✓ Got short-lived token for user:", user_id);

// Exchange for long-lived token (60 days)
console.log("Exchanging for long-lived token...");
const longRes = await fetch(
  `${BASE}/access_token?grant_type=th_exchange_token&client_secret=${APP_SECRET}&access_token=${shortToken}`
);
if (!longRes.ok) throw new Error(`Long-lived token exchange failed: ${await longRes.text()}`);
const { access_token: longToken, expires_in } = await longRes.json() as { access_token: string; expires_in: number };
const expiresInDays = Math.floor(expires_in / 86400);
console.log(`✓ Got long-lived token (expires in ${expiresInDays} days)`);

// Save to .env.local
let updated = envContent;
const addOrReplace = (key: string, val: string) => {
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(updated)) {
    updated = updated.replace(regex, `${key}=${val}`);
  } else {
    updated += `\n${key}=${val}`;
  }
};
addOrReplace("THREADS_ACCESS_TOKEN", longToken);
addOrReplace("THREADS_USER_ID", user_id);
addOrReplace("THREADS_APP_ID_V2", APP_ID);

writeFileSync(ENV_PATH, updated);
console.log("\n✅ Saved to .env.local:");
console.log("   THREADS_ACCESS_TOKEN=***");
console.log(`   THREADS_USER_ID=${user_id}`);
console.log(`   Token expires in ~${expiresInDays} days`);
