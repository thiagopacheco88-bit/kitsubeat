import { type NextRequest } from "next/server";

// One-time OAuth callback for TikTok developer auth.
// After authorizing, TikTok redirects here with ?code=...
// Run scripts/tiktok-auth.ts — it will print the tokens once exchanged.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return new Response(
      `<html><body><h2>TikTok auth error: ${error}</h2></body></html>`,
      { headers: { "content-type": "text/html" } }
    );
  }

  if (!code) {
    return new Response(
      `<html><body><h2>No code received.</h2></body></html>`,
      { headers: { "content-type": "text/html" } }
    );
  }

  return new Response(
    `<html><body style="font-family:monospace;padding:2rem">
      <h2>✅ TikTok auth code received</h2>
      <p>Copy this code and paste it into your terminal running <code>tiktok-auth.ts</code>:</p>
      <pre style="background:#f0f0f0;padding:1rem;border-radius:4px;word-break:break-all">${code}</pre>
    </body></html>`,
    { headers: { "content-type": "text/html" } }
  );
}
