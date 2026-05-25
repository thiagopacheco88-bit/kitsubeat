/**
 * X (Twitter) API v2 — OAuth 1.0a posting client.
 * Uses process env: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET
 */
import crypto from "crypto";

const TWEET_URL = "https://api.twitter.com/2/tweets";

function pct(s: string): string {
  return encodeURIComponent(s);
}

/**
 * Builds OAuth 1.0a Authorization header.
 * For GET requests pass queryParams so they are included in the signature base string.
 * For JSON-body POST requests leave queryParams empty.
 */
function buildOAuthHeader(
  method: string,
  url: string,
  queryParams: Record<string, string> = {}
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: process.env.X_API_KEY!,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: process.env.X_ACCESS_TOKEN!,
    oauth_version: "1.0",
  };

  // Merge oauth + query params for signature; oauth params only go in the header
  const allParams = { ...oauthParams, ...queryParams };
  const paramString = Object.entries(allParams)
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
    [...Object.entries(oauthParams), ["oauth_signature", signature]]
      .map(([k, v]) => `${pct(k)}="${pct(v)}"`)
      .join(", ")
  );
}

export type TweetMetrics = {
  id: string;
  // public_metrics — always available
  like_count: number;
  retweet_count: number;
  reply_count: number;
  quote_count: number;
  bookmark_count: number;
  // non_public_metrics — available for own tweets with OAuth 1.0a
  impression_count?: number;
  url_link_clicks?: number;
  user_profile_clicks?: number;
};

/**
 * Fetch metrics for up to 100 tweet IDs owned by the authenticated user.
 * Requests both public_metrics and non_public_metrics (impressions, link clicks).
 */
export async function getTweetMetrics(ids: string[]): Promise<TweetMetrics[]> {
  if (ids.length === 0) return [];

  const queryParams: Record<string, string> = {
    ids: ids.slice(0, 100).join(","),
    "tweet.fields": "public_metrics,non_public_metrics",
  };

  const qs = new URLSearchParams(queryParams).toString();
  const res = await fetch(`${TWEET_URL}?${qs}`, {
    headers: {
      Authorization: buildOAuthHeader("GET", TWEET_URL, queryParams),
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`X API GET /tweets ${res.status}: ${err}`);
  }

  const json = await res.json() as {
    data: Array<{
      id: string;
      public_metrics: { like_count: number; retweet_count: number; reply_count: number; quote_count: number; bookmark_count: number };
      non_public_metrics?: { impression_count: number; url_link_clicks: number; user_profile_clicks: number };
    }>;
  };

  return (json.data ?? []).map((t) => ({
    id: t.id,
    ...t.public_metrics,
    impression_count: t.non_public_metrics?.impression_count,
    url_link_clicks: t.non_public_metrics?.url_link_clicks,
    user_profile_clicks: t.non_public_metrics?.user_profile_clicks,
  }));
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
