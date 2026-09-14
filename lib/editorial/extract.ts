import { lookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { isPublicAddress, normalizeArticleUrl, sourceLabel } from "./url.ts";

const MAX_BYTES = 2 * 1024 * 1024;
export const MIN_SOURCE_WORDS = 180;
export const MAX_SOURCE_CHARS = 45000;
export interface SourceArticle {
  url: string;
  title: string;
  publication: string;
  publishedAt: string | null;
  text: string;
  truncated?: boolean;
}

// Resolve and pin the connection to a public address. Each redirect is checked
// separately, so private addresses and DNS rebinding cannot reach the server LAN.
export async function fetchPublicHtml(
  input: string,
  redirects = 0,
): Promise<{ html: string; url: string }> {
  if (redirects > 4)
    throw new Error("Too many redirects. Paste the article text instead.");
  const url = new URL(normalizeArticleUrl(input));
  const addresses = await lookup(url.hostname.replace(/^\[|\]$/g, ""), {
    all: true,
  });
  if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address)))
    throw new Error("The article address is not public.");
  const address = addresses[0];
  const result = await new Promise<{ html: string; redirect?: string }>(
    (resolve, reject) => {
      const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(
        url,
        {
          agent: false,
          family: address.family,
          lookup: (_hostname, _options, callback) =>
            callback(null, address.address, address.family),
          headers: {
            "User-Agent": "MediaMachine/1.0 (article summarizer)",
            Accept: "text/html, application/xhtml+xml",
            "Accept-Encoding": "identity",
          },
        },
        (response) => {
          if (
            [301, 302, 303, 307, 308].includes(response.statusCode ?? 0) &&
            response.headers.location
          ) {
            response.resume();
            resolve({
              html: "",
              redirect: new URL(response.headers.location, url).toString(),
            });
            return;
          }
          if (
            response.statusCode !== 200 ||
            !/text\/html|application\/xhtml\+xml/i.test(
              response.headers["content-type"] ?? "",
            )
          ) {
            response.resume();
            reject(
              new Error(
                "The page could not be read. Paste the article text to continue.",
              ),
            );
            return;
          }
          let size = 0;
          const chunks: Buffer[] = [];
          response.on("data", (chunk) => {
            size += chunk.length;
            if (size > MAX_BYTES) {
              request.destroy(
                new Error(
                  "The page is too large. Paste the article text instead.",
                ),
              );
              return;
            }
            chunks.push(Buffer.from(chunk));
          });
          response.on("error", reject);
          response.on("end", () =>
            resolve({ html: Buffer.concat(chunks).toString("utf8") }),
          );
        },
      );
      const timer = setTimeout(
        () =>
          request.destroy(
            new Error("The page timed out. Paste the article text instead."),
          ),
        12000,
      );
      request.on("close", () => clearTimeout(timer));
      request.on("error", reject);
      request.end();
    },
  );
  return result.redirect
    ? fetchPublicHtml(result.redirect, redirects + 1)
    : { html: result.html, url: url.toString() };
}

export function extractHtml(html: string, url: string): SourceArticle {
  // No scripts or subresource loading are enabled. Only plain extracted text is
  // stored or sent to the summarizer; publisher HTML is never rendered in the app.
  const dom = new JSDOM(html, { url });
  try {
    const document = dom.window.document;
    const site = document
      .querySelector('meta[property="og:site_name"]')
      ?.getAttribute("content")
      ?.trim();
    const published = document
      .querySelector('meta[property="article:published_time"]')
      ?.getAttribute("content");
    const parsed = new Readability(document).parse();
    const text = parsed?.textContent?.replace(/\s+/g, " ").trim() ?? "";
    return {
      url,
      title: parsed?.title?.trim() || sourceLabel(url),
      publication: site?.slice(0, 150) || sourceLabel(url),
      publishedAt:
        published && Number.isFinite(Date.parse(published))
          ? new Date(published).toISOString()
          : null,
      text,
    };
  } finally {
    dom.window.close();
  }
}

export function requireSourceText(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.split(/\s+/).length < MIN_SOURCE_WORDS)
    throw new Error(
      "Not enough article text for a reliable summary. Paste the full story and try again.",
    );
  if (
    /^(access denied|just a moment|enable javascript|robot or human)/i.test(
      cleaned,
    )
  )
    throw new Error(
      "This page could not be read. Paste the article text instead.",
    );
  return cleaned.slice(0, MAX_SOURCE_CHARS);
}

export async function readSource(
  url: string,
  suppliedText?: string | null,
): Promise<SourceArticle> {
  const normalized = normalizeArticleUrl(url);
  if (suppliedText?.trim())
    return {
      url: normalized,
      title: "",
      publication: sourceLabel(normalized),
      publishedAt: null,
      text: requireSourceText(suppliedText),
      truncated:
        suppliedText.replace(/\s+/g, " ").trim().length > MAX_SOURCE_CHARS,
    };
  const page = await fetchPublicHtml(normalized);
  const source = extractHtml(page.html, page.url);
  source.truncated = source.text.length > MAX_SOURCE_CHARS;
  source.text = requireSourceText(source.text);
  return source;
}
