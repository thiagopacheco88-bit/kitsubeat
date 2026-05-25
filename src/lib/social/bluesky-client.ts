/**
 * Bluesky (AT Protocol) posting client.
 * Uses env vars: BLUESKY_HANDLE, BLUESKY_APP_PASSWORD
 *
 * No OAuth needed — Bluesky uses app passwords for server-to-server posting.
 * Generate one at: Settings → Privacy and Security → App Passwords
 */

const BASE = "https://bsky.social/xrpc";

type PostRef = { uri: string; cid: string };

async function createSession(): Promise<{ accessJwt: string; did: string }> {
  const res = await fetch(`${BASE}/com.atproto.server.createSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: process.env.BLUESKY_HANDLE!,
      password: process.env.BLUESKY_APP_PASSWORD!,
    }),
  });
  if (!res.ok) throw new Error(`Bluesky auth ${res.status}: ${await res.text()}`);
  return res.json();
}

async function createPost(
  accessJwt: string,
  did: string,
  text: string,
  reply?: { root: PostRef; parent: PostRef }
): Promise<PostRef> {
  const record: Record<string, unknown> = {
    $type: "app.bsky.feed.post",
    text,
    createdAt: new Date().toISOString(),
  };
  if (reply) record.reply = reply;

  const res = await fetch(`${BASE}/com.atproto.repo.createRecord`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessJwt}`,
    },
    body: JSON.stringify({ repo: did, collection: "app.bsky.feed.post", record }),
  });
  if (!res.ok) throw new Error(`Bluesky post ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return { uri: json.uri as string, cid: json.cid as string };
}

/** Post a single skeet. Returns the post reference. */
export async function postBluesky(text: string): Promise<PostRef> {
  const { accessJwt, did } = await createSession();
  return createPost(accessJwt, did, text);
}

/** Post a thread (chain of replies). Returns refs in order. */
export async function postBlueskyThread(texts: string[]): Promise<PostRef[]> {
  const { accessJwt, did } = await createSession();
  const refs: PostRef[] = [];

  for (const text of texts) {
    const reply =
      refs.length > 0
        ? { root: refs[0], parent: refs[refs.length - 1] }
        : undefined;
    const ref = await createPost(accessJwt, did, text, reply);
    refs.push(ref);
  }

  return refs;
}
