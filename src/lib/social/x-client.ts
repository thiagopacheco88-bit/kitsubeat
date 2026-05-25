/**
 * X (Twitter) API v2 — OAuth 1.0a posting client.
 * Uses process env: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET
 */
import crypto from "crypto";

const TWEET_URL = "https://api.twitter.com/2/tweets";

function pct(s: string): string {
  return encodeURIComponent(s);
}

function buildOAuthHeader(method: string, url: string): string {
  const params: Record<string, string> = {
    oauth_consumer_key: process.env.X_API_KEY!,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: process.env.X_ACCESS_TOKEN!,
    oauth_version: "1.0",
  };

  // For JSON-body requests, only OAuth params go into the signature base string
  const paramString = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${pct(k)}=${pct(v)}`)
    .join("&");

  const sigBase = `${method.toUpperCase()}&${pct(url)}&${pct(paramString)}`;
  const sigKey = `${pct(process.env.X_API_SECRET!)}&${pct(process.env.X_ACCESS_TOKEN_SECRET!)}`;
  const signature = crypto
    .createHmac("sha1", sigKey)
    .update(sigBase)
    .digest("base64");

  return (
    "OAuth " +
    [...Object.entries(params), ["oauth_signature", signature]]
      .map(([k, v]) => `${pct(k)}="${pct(v)}"`)
      .join(", ")
  );
}

export async function postTweet(text: string): Promise<{ id: string }> {
  const res = await fetch(TWEET_URL, {
    method: "POST",
    headers: {
      Authorization: buildOAuthHeader("POST", TWEET_URL),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`X API ${res.status}: ${err}`);
  }

  const json = await res.json();
  return json.data as { id: string };
}

/** Posts a chain of tweets as a thread. Returns IDs in order. */
export async function postTweetThread(tweets: string[]): Promise<string[]> {
  const ids: string[] = [];

  for (const text of tweets) {
    const body: Record<string, unknown> = { text };
    if (ids.length > 0) {
      body.reply = { in_reply_to_tweet_id: ids[ids.length - 1] };
    }

    const res = await fetch(TWEET_URL, {
      method: "POST",
      headers: {
        Authorization: buildOAuthHeader("POST", TWEET_URL),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`X API ${res.status} (tweet ${ids.length + 1}/${tweets.length}): ${err}`);
    }

    const json = await res.json();
    ids.push((json.data as { id: string }).id);
  }

  return ids;
}
