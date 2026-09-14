import { after } from "next/server";
import { z } from "zod";
import { getAdminDb, readText, readJson } from "@/lib/editorial/server";
import {
  emailAddress,
  emailCandidates,
  verifyEmailEvent,
} from "@/lib/editorial/email";
import { processSafely } from "@/lib/editorial/process";

export const maxDuration = 180;
const ReceivedEmail = z.object({
  id: z.string().uuid(),
  from: z.string(),
  to: z.array(z.string()),
  subject: z.string().nullish(),
  text: z.string().nullish(),
  html: z.string().nullish(),
});
export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const key = process.env.RESEND_API_KEY;
  const address = process.env.INBOUND_EMAIL_ADDRESS?.trim().toLowerCase();
  const senders = (process.env.INBOUND_ALLOWED_SENDERS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!secret || !key || !address || senders.length === 0)
    return Response.json(
      { error: "Email intake is not configured." },
      { status: 503 },
    );
  let body;
  try {
    body = await readText(request, 100000);
  } catch {
    return Response.json({ error: "Event too large." }, { status: 413 });
  }
  let event;
  try {
    event = verifyEmailEvent(body, request.headers, secret);
  } catch {
    return Response.json({ error: "Invalid signature." }, { status: 401 });
  }
  if (event.type !== "email.received") return Response.json({ ignored: true });
  if (!z.string().uuid().safeParse(event.data?.email_id).success)
    return Response.json(
      { error: "Invalid email identifier." },
      { status: 400 },
    );
  try {
    const db = getAdminDb();
    const externalId = `resend:${event.data.email_id}`;
    const { data: existing, error: lookupError } = await db
      .from("editorial_inbox")
      .select("id")
      .eq("external_id", externalId)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) return Response.json({ accepted: true, duplicate: true });
    const response = await fetch(
      `https://api.resend.com/emails/receiving/${event.data.email_id}`,
      {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
      },
    );
    if (!response.ok) throw new Error("Received email could not be retrieved.");
    const mail = ReceivedEmail.parse(await readJson(response, 2000000));
    if (mail.id !== event.data.email_id)
      throw new Error("Email identifier mismatch.");
    // The receiving address must be a private, unpredictable alias. An allowlisted
    // From header alone is not proof of sender identity.
    if (
      !senders.includes(emailAddress(mail.from)) ||
      !mail.to.map(emailAddress).includes(address)
    )
      return Response.json({ ignored: true });
    const candidates = emailCandidates(
      (mail.text ?? "").slice(0, 100000),
      (mail.html ?? "").slice(0, 500000),
    );
    const url = candidates.length === 1 ? candidates[0] : null;
    const { data, error } = await db
      .from("editorial_inbox")
      .insert({
        external_id: externalId,
        origin: "email",
        original_url: url,
        candidate_urls: candidates,
        source_title: mail.subject?.slice(0, 300) || "Forwarded story",
        status: url ? "queued" : "needs_attention",
        error_message: url
          ? null
          : "Choose the original article link below, or paste a link and the article text. This email did not contain one unambiguous story link.",
      })
      .select("id")
      .single();
    if (error?.code === "23505")
      return Response.json({ accepted: true, duplicate: true });
    if (error || !data) throw new Error("Email intake could not be saved.");
    if (url) after(() => processSafely(data.id));
    return Response.json({ accepted: true }, { status: 202 });
  } catch (error) {
    console.error(
      "Email intake failed:",
      error instanceof Error ? error.message : "Database error",
    );
    // Non-2xx makes the provider retry; no event is acknowledged before it is saved.
    return Response.json(
      { error: "Intake temporarily unavailable. Please retry." },
      { status: 503 },
    );
  }
}
