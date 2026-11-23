import { fail, first, run, now } from "./core.js";
const enc = new TextEncoder();
const base64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const bytes = (str) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
async function vault(secret) {
  if (!secret)
    fail("The host has not configured encrypted payment connections.", 503);
  return crypto.subtle.importKey("raw", bytes(secret), "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}
export async function seal(secret, slug, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: enc.encode(slug) },
    await vault(secret),
    enc.encode(key),
  );
  return base64(iv) + "." + base64(data);
}
export async function unseal(secret, slug, sealed) {
  const [iv, data] = sealed.split(".");
  return new TextDecoder().decode(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bytes(iv), additionalData: enc.encode(slug) },
      await vault(secret),
      bytes(data),
    ),
  );
}
async function stripe(env, feed, path, fetcher) {
  const key = await unseal(env.EDITION_KEY, feed.slug, feed.billing_key);
  const resp = await fetcher("https://api.stripe.com/v1/" + path, {
    headers: { Authorization: "Bearer " + key },
    signal: AbortSignal.timeout(8000),
  });
  if (!resp.ok)
    fail(
      "Stripe could not verify this membership. Check the payment connection and try again.",
      503,
    );
  return resp.json();
}
export async function claim(env, feed, user, id, fetcher = fetch) {
  if (
    !feed.billing_key ||
    !feed.payment_link ||
    !/^cs_(?:test|live)_[A-Za-z0-9_]{6,240}$/.test(id)
  )
    fail("Invalid subscription confirmation.");
  const s = await stripe(env, feed, "checkout/sessions/" + id, fetcher);
  if (
    s.status !== "complete" ||
    s.payment_status !== "paid" ||
    s.mode !== "subscription" ||
    s.payment_link !== feed.payment_link ||
    s.customer_details?.email?.toLowerCase() !== user.email ||
    !/^sub_[A-Za-z0-9]+$/.test(s.subscription)
  )
    fail(
      "Sign in with the email used for a completed subscription to this edition.",
      403,
    );
  const sub = await stripe(
    env,
    feed,
    "subscriptions/" + s.subscription,
    fetcher,
  );
  if (sub.status !== "active") fail("The subscription is not active.", 403);
  await run(
    env.DB,
    `INSERT INTO members(edition,email,subscription,payment_link) VALUES(?,?,?,?) ON CONFLICT(edition,email) DO UPDATE SET
     subscription=excluded.subscription,payment_link=excluded.payment_link`,
    feed.slug,
    user.email,
    s.subscription,
    feed.payment_link,
  );
}
export async function canRead(env, feed, user, fetcher = fetch) {
  if (user?.id === feed.owner) return true;
  if (feed.visibility === "public") return true;
  if (!user || feed.visibility !== "members") return false;
  const m = await first(
    env.DB,
    "SELECT * FROM members WHERE edition=? AND email=?",
    feed.slug,
    user.email,
  );
  if (!m || m.revoked) return false;
  if (m.expires > now()) return true;
  if (
    !m.subscription ||
    !feed.billing_key ||
    !feed.payment_link ||
    feed.payment_link !== m.payment_link
  )
    return false;
  const sub = await stripe(
    env,
    feed,
    "subscriptions/" + m.subscription,
    fetcher,
  );
  return sub.status === "active";
}
