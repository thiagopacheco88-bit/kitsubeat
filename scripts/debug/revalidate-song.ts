/**
 * Revalidate song cache tags so the Next.js page picks up lesson changes.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

// Hit the local dev server's revalidate endpoint
const slug = process.argv[2] ?? "the-1-muque";
const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:7000";

const res = await fetch(`${baseUrl}/api/admin/revalidate?slug=${slug}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
}).catch(() => null);

if (res?.ok) {
  console.log(`✓ Revalidated cache for: ${slug}`);
} else {
  // Fallback: the song page uses router.refresh() on the client, so just tell user to refresh
  console.log(`Cache revalidate endpoint not available — hard-refresh ${baseUrl}/pt-BR/songs/${slug} in the browser.`);
}
