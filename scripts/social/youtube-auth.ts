/**
 * One-time script to get a YouTube OAuth2 refresh token for kitsubeat@gmail.com.
 * Run once: npx tsx scripts/youtube-auth.ts
 * Then paste YOUTUBE_REFRESH_TOKEN into .env.local
 */
import http from "http";
import { exec } from "child_process";
import { config } from "dotenv";
config({ path: ".env.local" });

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID!;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET!;
const REDIRECT_URI = "http://localhost:3001/oauth2callback";
const SCOPE = "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube";

const authUrl =
  `https://accounts.google.com/o/oauth2/v2/auth?` +
  new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
  });

console.log("\nOpening browser for Google auth...");
console.log("If it doesn't open, visit:\n", authUrl, "\n");

exec(`start "" "${authUrl}"`);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url!, `http://localhost:3001`);
  const code = url.searchParams.get("code");
  if (!code) { res.end("No code"); return; }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenRes.json() as { refresh_token?: string; error?: string };

  if (tokens.refresh_token) {
    console.log("\n✅ Success! Add this to .env.local:");
    console.log(`YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}`);
    res.end("Done! Check your terminal for the refresh token.");
  } else {
    console.error("Error:", tokens);
    res.end("Error — check terminal.");
  }

  server.close();
});

server.listen(3001, () => console.log("Waiting on http://localhost:3001 ..."));
