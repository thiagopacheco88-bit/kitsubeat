/**
 * Step 2 of Threads OAuth: exchange an authorization code for a long-lived token.
 * Run after visiting the OAuth URL and copying the code from kitsubeat.com/api/threads-callback
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/social/threads-auth-exchange.ts <code>
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: join(process.cwd(), ".env.local") });

const code = process.argv[2];
if (!code) {
  console.error("Usage: npx tsx ... threads-auth-exchange.ts <code>");
  process.exit(1);
}

const ENV_PATH = join(process.cwd(), ".env.local");
const envContent = readFileSync(ENV_PATH, "utf8");
const getEnv = (key: string) => envContent.split("\n").find(l => l.startsWith(key + "="))?.split("=")[1]?.trim() ?? "";

const APP_ID = getEnv("THREADS_APP_ID_V2");
const APP_SECRET = getEnv("THREADS_APP_SECRET_NEW");
const REDIRECT = "https://kitsubeat.com/api/threads-callback";
const BASE = "https://graph.threads.net";

if (!APP_ID || !APP_SECRET) {
  console.error("Missing THREADS_APP_ID_V2 or THREADS_APP_SECRET_NEW in .env.local");
  process.exit(1);
}

// Exchange code for short-lived token
console.log("Exchanging code for short-lived token...");
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
if (!tokenRes.ok) {
  const err = await tokenRes.text();
  console.error("Token exchange failed:", err);
  process.exit(1);
}
const { access_token: shortToken, user_id } = await tokenRes.json() as { access_token: string; user_id: string };
console.log("✓ Short-lived token received for user:", user_id);

// Exchange for long-lived token (60 days)
console.log("Exchanging for long-lived token...");
const longRes = await fetch(
  `${BASE}/access_token?grant_type=th_exchange_token&client_secret=${APP_SECRET}&access_token=${shortToken}`
);
if (!longRes.ok) {
  const err = await longRes.text();
  console.error("Long-lived token exchange failed:", err);
  process.exit(1);
}
const { access_token: longToken, expires_in } = await longRes.json() as { access_token: string; expires_in: number };
const days = Math.floor(expires_in / 86400);
console.log(`✓ Long-lived token received (expires in ~${days} days)`);

// Save to .env.local
let updated = envContent;
const addOrReplace = (key: string, val: string) => {
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(updated)) updated = updated.replace(regex, `${key}=${val}`);
  else updated += `\n${key}=${val}`;
};
addOrReplace("THREADS_ACCESS_TOKEN", longToken);
addOrReplace("THREADS_USER_ID", user_id);
writeFileSync(ENV_PATH, updated);

console.log("\n✅ Saved to .env.local:");
console.log(`   THREADS_USER_ID=${user_id}`);
console.log(`   THREADS_ACCESS_TOKEN=*** (expires in ~${days} days)`);
