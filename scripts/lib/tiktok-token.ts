/**
 * Auto-refreshes TikTok access token using the stored refresh token.
 * Call getValidAccessToken() before any TikTok API call.
 */
import fs from "fs";
import path from "path";
import { config } from "dotenv";
config({ path: ".env.local" });

const ENV_FILE = path.resolve(".env.local");

export async function getValidAccessToken(): Promise<string> {
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;
  const refreshToken = process.env.TIKTOK_REFRESH_TOKEN;

  if (!refreshToken) throw new Error("TIKTOK_REFRESH_TOKEN not set — run scripts/tiktok-auth.ts");

  // Always refresh to be safe (tokens last 24h, refreshing is instant)
  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const data = await res.json() as any;
  if (!data.access_token) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);

  // Persist the new tokens back to .env.local
  let env = fs.readFileSync(ENV_FILE, "utf-8");
  env = env.replace(/^TIKTOK_ACCESS_TOKEN=.*/m, `TIKTOK_ACCESS_TOKEN=${data.access_token}`);
  if (data.refresh_token) {
    env = env.replace(/^TIKTOK_REFRESH_TOKEN=.*/m, `TIKTOK_REFRESH_TOKEN=${data.refresh_token}`);
  }
  fs.writeFileSync(ENV_FILE, env);

  return data.access_token;
}
