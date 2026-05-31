import { type NextRequest, NextResponse } from "next/server";

// Temporary endpoint to capture Threads OAuth code.
// After running threads-auth-exchange.ts with the code shown here, this route can be deleted.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error_message") ?? req.nextUrl.searchParams.get("error");

  if (error) {
    return new NextResponse(`<h2>❌ OAuth error</h2><pre>${error}</pre>`, {
      headers: { "Content-Type": "text/html" },
    });
  }

  if (!code) {
    return new NextResponse("<h2>No code received</h2>", {
      headers: { "Content-Type": "text/html" },
    });
  }

  return new NextResponse(
    `<html><body style="font-family:monospace;padding:40px;max-width:800px;margin:0 auto">
<h2>✅ Threads OAuth code received</h2>
<p>Copy this code and run the exchange script:</p>
<code style="display:block;padding:16px;background:#f4f4f4;border-radius:8px;word-break:break-all;font-size:14px">${code}</code>
<br>
<p>Then run:</p>
<code style="display:block;padding:12px;background:#f4f4f4;border-radius:8px">npx tsx --tsconfig tsconfig.scripts.json scripts/social/threads-auth-exchange.ts ${code}</code>
</body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
