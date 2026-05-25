/**
 * Threads API — text post client.
 * Two-step: create container → publish.
 * Env: THREADS_USER_ID, THREADS_ACCESS_TOKEN
 */

const BASE = "https://graph.threads.net/v1.0";

function userId(): string {
  const id = process.env.THREADS_USER_ID;
  if (!id) throw new Error("THREADS_USER_ID not set");
  return id;
}

function token(): string {
  const t = process.env.THREADS_ACCESS_TOKEN;
  if (!t) throw new Error("THREADS_ACCESS_TOKEN not set");
  return t;
}

export async function postThread(text: string): Promise<{ id: string }> {
  const uid = userId();
  const tok = token();

  // Step 1 — create container
  const createRes = await fetch(`${BASE}/${uid}/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "TEXT",
      text,
      access_token: tok,
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Threads create ${createRes.status}: ${err}`);
  }

  const { id: creationId } = await createRes.json();

  // Step 2 — publish
  const publishRes = await fetch(`${BASE}/${uid}/threads_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: creationId, access_token: tok }),
  });

  if (!publishRes.ok) {
    const err = await publishRes.text();
    throw new Error(`Threads publish ${publishRes.status}: ${err}`);
  }

  return publishRes.json();
}
