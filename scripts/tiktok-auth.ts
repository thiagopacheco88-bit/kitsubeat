/**
 * One-time script to get TikTok tokens for @kitsubeat.
 * Run: npx tsx scripts/tiktok-auth.ts
 *
 * Flow:
 * 1. Opens browser to TikTok OAuth
 * 2. After you approve, TikTok redirects to kitsubeat.com/api/tiktok-callback
 * 3. The page shows the auth code — copy it and paste here
 * 4. Script exchanges code for access_token + refresh_token
 * 5. Add both to .env.local
 */
import readline from "readline";
import crypto from "crypto";
import { config } from "dotenv";
import { exec } from "child_process";
config({ path: ".env.local" });

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY!;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET!;
const REDIRECT_URI = "https://kitsubeat.com/api/tiktok-callback";
const SCOPE = "user.info.basic,video.upload";
const STATE = crypto.randomBytes(8).toString("hex");

const authUrl =
  `https://www.tiktok.com/v2/auth/authorize/?` +
  new URLSearchParams({
    client_key: CLIENT_KEY,
    scope: SCOPE,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    state: STATE,
  });

console.log("\nOpening browser for TikTok auth...");
console.log("Sign in as @kitsubeat when prompted.");
console.log(
  "\nAfter approving, you'll be redirected to kitsubeat.com — copy the code shown on the page.\n"
);
console.log("Auth URL:", authUrl, "\n");

exec(`start "" "${authUrl}"`);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question("Paste the code from the page: ", async (code) => {
  rl.close();
  code = code.trim();
  if (!code) { console.error("No code provided."); process.exit(1); }

  console.log("\nExchanging code for tokens...");

  const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: CLIENT_KEY,
      client_secret: CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI,
    }),
  });

  const data = await tokenRes.json() as any;

  if (data.access_token) {
    console.log("\n✅ Success! Add these to .env.local:\n");
    console.log(`TIKTOK_ACCESS_TOKEN=${data.access_token}`);
    console.log(`TIKTOK_OPEN_ID=${data.open_id}`);
    if (data.refresh_token) {
      console.log(`TIKTOK_REFRESH_TOKEN=${data.refresh_token}`);
      const expiry = new Date(Date.now() + data.refresh_expires_in * 1000).toISOString().split("T")[0];
      console.log(`# Refresh token expires: ${expiry}`);
    }
  } else {
    console.error("\nError:", JSON.stringify(data, null, 2));
    process.exit(1);
  }
});
