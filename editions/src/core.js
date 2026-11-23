import { createRemoteJWKSet, jwtVerify } from "jose";
export class Problem extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
export const fail = (s, status = 400) => {
  throw new Problem(s, status);
};
export const now = () => Math.floor(Date.now() / 1000);
export function field(value, max, required = false) {
  if (typeof value !== "string") value = "";
  value = value.trim();
  if (required && !value) fail("Complete the required fields.");
  if (value.length > max)
    fail("One of the fields exceeds the character limit.");
  return value;
}
export function publicUrl(input, { feed = false } = {}) {
  let u;
  try {
    u = new URL(input);
  } catch {
    fail("Enter a complete public HTTPS link.");
  }
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.port ||
    !/^([a-z0-9-]+\.)+[a-z]{2,63}$/i.test(u.hostname) ||
    /\.(localhost|local|internal|invalid|example|test|onion)$/i.test(
      u.hostname,
    ) ||
    u.hostname === "localhost" ||
    u.href.length > 2048
  )
    fail("Use a public HTTPS address without credentials or a custom port.");
  if (
    /\/(?:private|private-feed|magic-link|unsubscribe|manage-subscription)(?:\/|$)/i.test(
      u.pathname,
    ) ||
    [...u.searchParams.keys()].some((k) =>
      /token|secret|password|signature|^key$|^sig$|^auth$|^email$|subscription_id/i.test(
        k,
      ),
    )
  )
    fail(
      "Use the public permalink. Private subscription links may contain access credentials.",
    );
  if (
    feed &&
    u.hostname.endsWith(".substack.com") &&
    !/^(\/feed|\/feed\.xml)\/?$/.test(u.pathname)
  )
    fail("Use the publication’s public Substack RSS URL ending in /feed.");
  u.hash = "";
  for (const k of [...u.searchParams.keys()])
    if (/^utm_|^(?:fbclid|gclid|mc_eid|mc_cid)$/i.test(k))
      u.searchParams.delete(k);
  u.searchParams.sort();
  return u.href;
}
export const first = (db, q, ...args) =>
  db
    .prepare(q)
    .bind(...args)
    .first();
export const all = async (db, q, ...args) =>
  (
    await db
      .prepare(q)
      .bind(...args)
      .all()
  ).results;
export const run = (db, q, ...args) =>
  db
    .prepare(q)
    .bind(...args)
    .run();
export async function limitedText(request, max) {
  return new TextDecoder().decode(await limitedBytes(request, max));
}
export async function limitedBytes(request, max) {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        fail("The response is too large.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const buf = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    buf.set(c, offset);
    offset += c.byteLength;
  }
  return buf;
}
export const signIn = (path, env) =>
  env.IDENTITY_MODE === "sites"
    ? "/signin-with-chatgpt?return_to=" + encodeURIComponent(path)
    : "/login?return_to=" + encodeURIComponent(path);
const jwks = new Map();
export async function identity(req, env) {
  if (env.IDENTITY_MODE === "sites") {
    const id = req.headers.get("oai-authenticated-user-id"),
      email = req.headers.get("oai-authenticated-user-email");
    return id && email ? { id, email: email.toLowerCase().trim() } : null;
  }
  const jwt =
    req.headers.get("cf-access-jwt-assertion") ||
    (req.headers.get("cookie") || "").match(
      /(?:^|;\s*)CF_Authorization=([^;]+)/,
    )?.[1];
  if (!jwt || !env.ACCESS_TEAM || !env.ACCESS_AUD) return null;
  const issuer = "https://" + env.ACCESS_TEAM + ".cloudflareaccess.com";
  if (!jwks.has(issuer))
    jwks.set(
      issuer,
      createRemoteJWKSet(new URL(issuer + "/cdn-cgi/access/certs")),
    );
  try {
    const { payload } = await jwtVerify(jwt, jwks.get(issuer), {
      issuer,
      audience: env.ACCESS_AUD,
      algorithms: ["RS256"],
    });
    return typeof payload.sub === "string" && typeof payload.email === "string"
      ? { id: payload.sub, email: payload.email.toLowerCase().trim() }
      : null;
  } catch {
    return null;
  }
}
