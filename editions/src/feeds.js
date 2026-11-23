import { ensureExample } from "./example.js";
import { XMLParser } from "fast-xml-parser";
import { publicUrl, limitedText, first, run, all, now, fail } from "./core.js";
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  parseTagValue: false,
  removeNSPrefix: true,
  processEntities: true,
  htmlEntities: true,
});
const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const str = (x) =>
  typeof x === "string"
    ? x
    : typeof x?.["#text"] === "string"
      ? x["#text"]
      : "";
const plain = (x) =>
  str(x)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
export function parseFeed(xml, base, licensed) {
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml))
    fail("This feed contains unsupported XML declarations.");
  let doc;
  try {
    doc = parser.parse(xml);
  } catch {
    fail("The address did not return readable RSS or Atom.");
  }
  const channel = doc?.rss?.channel || doc?.feed || doc?.RDF;
  if (!channel)
    fail("Use an RSS or Atom feed address, not a publication homepage.");
  const out = [],
    seen = new Set();
  for (const item of arr(channel.item ?? channel.entry).slice(0, 50)) {
    try {
      const link = arr(item.link).find(
        (l) => typeof l === "string" || !l["@rel"] || l["@rel"] === "alternate",
      );
      const href =
        (typeof link === "string" ? link : link?.["@href"]) || str(item.guid);
      if (!href) continue;
      const url = publicUrl(new URL(href, base).href),
        title = plain(item.title).slice(0, 240);
      if (!title || seen.has(url)) continue;
      seen.add(url);
      const date = str(
        item.published || item.pubDate || item.date || item.updated,
      );
      const evidence = licensed
        ? plain(
            item.description || item.summary || item.encoded || item.content,
          ).slice(0, 3500)
        : "";
      out.push({
        url,
        title,
        evidence,
        date:
          date && !Number.isNaN(Date.parse(date))
            ? new Date(date).toISOString()
            : null,
      });
      if (out.length === 20) break;
    } catch {
      continue;
    }
  }
  return out;
}
export async function download(source, fetcher = fetch) {
  let address = publicUrl(source.url, { feed: true });
  const headers = {
    Accept:
      "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9",
    "User-Agent": "MediaMachineEditions/1.0 (RSS reader)",
  };
  if (source.etag) headers["If-None-Match"] = source.etag;
  if (source.modified) headers["If-Modified-Since"] = source.modified;
  const signal = AbortSignal.timeout(9000);
  for (let i = 0; i < 4; i++) {
    const resp = await fetcher(address, {
      headers,
      redirect: "manual",
      signal,
    });
    if (resp.status === 304) return { unchanged: true };
    if ([301, 302, 303, 307, 308].includes(resp.status)) {
      const loc = resp.headers.get("location");
      await resp.body?.cancel();
      if (!loc) break;
      address = publicUrl(new URL(loc, address).href, { feed: true });
      continue;
    }
    if (!resp.ok) {
      await resp.body?.cancel();
      fail("Publisher returned HTTP " + resp.status + ".");
    }
    return {
      items: parseFeed(
        await limitedText(resp, 1500000),
        address,
        source.mode === "licensed",
      ),
      etag: resp.headers.get("etag")?.slice(0, 300) || null,
      modified: resp.headers.get("last-modified")?.slice(0, 100) || null,
    };
  }
  fail("The feed redirects too many times.");
}
export async function refresh(db, source, fetcher = fetch) {
  const started = now(),
    lease = started + 600;
  const claimed = await run(
    db,
    "UPDATE sources SET next_check=? WHERE id=? AND next_check<=?",
    lease,
    source.id,
    started,
  );
  if (!claimed.meta.changes) return "Already checked recently.";
  try {
    const result = await download(source, fetcher);
    const entries = result.items || [];
    const statements = entries.map((s, index) =>
      db
        .prepare(
          `INSERT OR IGNORE INTO stories(id,edition,url,source,original_title,evidence,title,note,state,source_date,published_at,created_at)
      SELECT ?,edition,?,label,?,?,?,'',CASE WHEN auto_links=1 THEN 'live' ELSE 'draft' END,?,CASE WHEN auto_links=1 THEN ? END,?
      FROM sources WHERE id=? AND next_check=? AND (SELECT COUNT(*) FROM stories WHERE edition=?)<3000`,
        )
        .bind(
          crypto.randomUUID(),
          s.url,
          s.title,
          s.evidence,
          s.title,
          s.date,
          s.date || new Date((started - index) * 1000).toISOString(),
          started - index,
          source.id,
          lease,
          source.edition,
        ),
    );
    const writes = statements.length ? await db.batch(statements) : [];
    const inserted = writes.reduce((a, v) => a + v.meta.changes, 0);
    const msg = result.unchanged
      ? "Up to date"
      : inserted + " new link" + (inserted === 1 ? "" : "s");
    await run(
      db,
      "UPDATE sources SET last_checked=?,next_check=?,status=?,etag=COALESCE(?,etag),modified=COALESCE(?,modified) WHERE id=? AND next_check=?",
      started,
      started + 3600,
      msg,
      result.etag || null,
      result.modified || null,
      source.id,
      lease,
    );
    return msg;
  } catch (e) {
    const msg = e.status
      ? e.message
      : "Could not reach the publisher. Check the feed URL.";
    await run(
      db,
      "UPDATE sources SET last_checked=?,next_check=?,status=? WHERE id=? AND next_check=?",
      started,
      started + 3600,
      msg,
      source.id,
      lease,
    );
    return msg;
  }
}
export async function refreshDue(db, fetcher = fetch) {
  await ensureExample(db);
  const due = await all(
    db,
    "SELECT * FROM sources WHERE next_check<=? ORDER BY next_check LIMIT 5",
    now(),
  );
  await Promise.all(due.map((s) => refresh(db, s, fetcher)));
  return due.length;
}
