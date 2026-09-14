import { cookies } from "next/headers";
import { z } from "zod";
import {
  createSession,
  editorSecret,
  safeEqual,
  SESSION_COOKIE,
  SESSION_SECONDS,
} from "@/lib/editorial/session";
import { sameOrigin, readJson, publicError } from "@/lib/editorial/server";

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const input = z
      .object({ secret: z.string().max(256) })
      .strict()
      .parse(await readJson(request, 1000));
    const secret = editorSecret();
    if (!safeEqual(input.secret, secret))
      return Response.json(
        { error: "That editor key is not correct." },
        { status: 401 },
      );
    (await cookies()).set(SESSION_COOKIE, createSession(secret), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_SECONDS,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: publicError(error) }, { status: 400 });
  }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  (await cookies()).delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
