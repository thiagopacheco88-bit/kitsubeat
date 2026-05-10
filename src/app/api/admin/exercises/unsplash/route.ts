import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "Missing q" }, { status: 400 });

  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return NextResponse.json({ error: "UNSPLASH_ACCESS_KEY not configured" }, { status: 500 });

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", q);
  url.searchParams.set("per_page", "12");
  url.searchParams.set("content_filter", "high");
  url.searchParams.set("orientation", "squarish");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Client-ID ${key}` },
  });

  if (!res.ok) {
    return NextResponse.json({ error: `Unsplash error ${res.status}` }, { status: 502 });
  }

  const data = await res.json() as {
    results: Array<{
      id: string;
      urls: { small: string; regular: string; thumb: string };
      alt_description: string | null;
      user: { name: string };
    }>;
  };

  const results = data.results.map((r) => ({
    id: r.id,
    thumb: r.urls.thumb,
    regular: r.urls.regular,
    alt: r.alt_description ?? "",
    credit: r.user.name,
  }));

  return NextResponse.json({ results });
}
