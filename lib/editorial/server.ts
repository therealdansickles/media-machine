import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { editorSecret, SESSION_COOKIE, validSession } from "./session.ts";

export function getAdminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key)
    throw new Error(
      "The editorial database is not connected. Check the server settings and migration.",
    );
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function isEditor(): Promise<boolean> {
  try {
    return validSession(
      (await cookies()).get(SESSION_COOKIE)?.value,
      editorSecret(),
    );
  } catch {
    return false;
  }
}
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const source = new URL(origin);
    // Next.js can use an internal origin for request.url behind a proxy. Host
    // represents the address the browser requested and cannot be set by JS.
    const host = request.headers.get("host") || new URL(request.url).host;
    return source.host === host &&
      (source.protocol === "https:" ||
        (process.env.NODE_ENV !== "production" && source.protocol === "http:"));
  } catch {
    return false;
  }
}
export async function readText(
  request: Pick<Request, "body">,
  limit = 150000,
): Promise<string> {
  if (!request.body) throw new Error("A request body is required.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new Error("The submitted story is too large.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
export function publicError(error: unknown): string {
  console.error(
    "Editorial operation failed:",
    error instanceof Error ? error.message : "Database operation failed",
  );
  return error instanceof Error
    ? error.message
    : "The request could not be completed. Check the database connection and try again.";
}

export async function readJson(
  request: Pick<Request, "body">,
  limit = 150000,
): Promise<unknown> {
  return JSON.parse(await readText(request, limit));
}
