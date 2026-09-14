import ipaddr from "ipaddr.js";

export function isPublicAddress(address: string): boolean {
  try {
    const parsed = ipaddr.process(address);
    return parsed.range() === "unicast";
  } catch {
    return false;
  }
}

export function normalizeArticleUrl(input: string): string {
  const url = new URL(input.trim());
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !["80", "443"].includes(url.port))
  )
    throw new Error("Use a public http or https article link.");
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    (!host.includes(".") && !ipaddr.isValid(host)) ||
    /\.(localhost|local|internal|test|invalid)$/.test(host) ||
    (ipaddr.isValid(host) && !isPublicAddress(host))
  )
    throw new Error("Use a public article link.");
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (
      /^utm_/i.test(key) ||
      ["fbclid", "gclid", "mc_cid", "mc_eid"].includes(key.toLowerCase())
    )
      url.searchParams.delete(key);
  }
  url.searchParams.sort();
  return url.toString();
}

export function sourceLabel(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}
