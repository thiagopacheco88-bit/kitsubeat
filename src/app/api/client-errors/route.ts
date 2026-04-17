import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Receives uncaught client errors from error.tsx / global-error.tsx and logs
 * them to stdout so they show up in `vercel logs`. No retention, no DB write —
 * just a tee so we can debug crashes that only happen in the field.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      message?: string;
      stack?: string;
      digest?: string;
      url?: string;
      userAgent?: string;
      at?: string;
    };
    console.error(
      "[client-error]",
      JSON.stringify({
        at: body.at ?? new Date().toISOString(),
        url: body.url,
        ua: body.userAgent,
        digest: body.digest,
        message: body.message,
        stack: body.stack,
      }),
    );
  } catch (err) {
    console.error("[client-error] failed to parse body:", err);
  }
  return NextResponse.json({ ok: true });
}
