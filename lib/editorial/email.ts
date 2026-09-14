import { JSDOM } from "jsdom";
import { Webhook } from "svix";
import { normalizeArticleUrl } from "./url.ts";

export function emailAddress(value: string): string {
  return (value.match(/<([^<>]+)>/)?.[1] ?? value).trim().toLowerCase();
}
export function emailCandidates(text: string, html: string): string[] {
  const dom = new JSDOM(html);
  try {
    const links = [
      ...(text.match(/https?:\/\/[^\s<>"']+/g) ?? []),
      ...Array.from(dom.window.document.querySelectorAll("a[href]")).map(
        (a) => a.getAttribute("href") ?? "",
      ),
    ];
    const candidates = new Set<string>();
    for (const value of links) {
      try {
        const url = normalizeArticleUrl(value.replace(/[).,;]+$/, ""));
        const parsed = new URL(url);
        if (
          parsed.pathname === "/" ||
          /unsubscribe|preferences|optout|privacy|terms|mailto|manage-subscription/i.test(
            parsed.pathname + parsed.search,
          )
        )
          continue;
        candidates.add(url);
      } catch {
        /* Non-article or non-public URL. */
      }
    }
    return [...candidates].slice(0, 20);
  } finally {
    dom.window.close();
  }
}
export function verifyEmailEvent(
  body: string,
  headers: Headers,
  secret: string,
): { type: string; data: { email_id: string } } {
  new Webhook(secret).verify(body, {
    "svix-id": headers.get("svix-id") ?? "",
    "svix-timestamp": headers.get("svix-timestamp") ?? "",
    "svix-signature": headers.get("svix-signature") ?? "",
  });
  const event = JSON.parse(body) as {
    type: string;
    data: { email_id: string };
  };
  if (typeof event.type !== "string") throw new Error("Invalid email event.");
  return event;
}
