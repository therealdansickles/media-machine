import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "mm_editor";
export const SESSION_SECONDS = 60 * 60 * 12;
export function editorSecret(): string {
  const secret = process.env.EDITOR_SECRET;
  if (!secret || secret.length < 32)
    throw new Error(
      "Set EDITOR_SECRET to a random value of at least 32 characters in the server settings.",
    );
  return secret;
}
export function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left),
    b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
function signature(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}
export function createSession(secret: string, now = Date.now()): string {
  const expiry = String(Math.floor(now / 1000) + SESSION_SECONDS);
  return `${expiry}.${signature(`editor:${expiry}`, secret)}`;
}
export function validSession(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): boolean {
  if (!token || token.length > 120) return false;
  const [expiry, signed, extra] = token.split(".");
  if (extra || !/^\d+$/.test(expiry) || !signed) return false;
  const remaining = Number(expiry) - Math.floor(now / 1000);
  return (
    remaining > 0 &&
    remaining <= SESSION_SECONDS &&
    safeEqual(signature(`editor:${expiry}`, secret), signed)
  );
}
