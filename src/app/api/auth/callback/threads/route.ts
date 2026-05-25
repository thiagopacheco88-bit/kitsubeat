/**
 * Temporary Threads OAuth callback — echoes the auth code in the response.
 * Remove after getting the long-lived token.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error_message");

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: "no_code" }, { status: 400 });
  }

  return NextResponse.json({
    code,
    next_step:
      "Exchange this code at POST https://graph.threads.net/oauth/access_token",
  });
}
