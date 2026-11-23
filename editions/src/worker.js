import css from "./style.css";
import client from "./studio-client.txt";
import sharing from "./sharing-client.txt";
import { guide, capturePage } from "./guide.js";
import {
  homePage,
  readerPage,
  shell,
  errorPage,
  escapeHtml as esc,
} from "./public-pages.js";
import { studioPage } from "./studio.js";
import { uploadMail, receiveMail } from "./mail.js";
import { mailPage } from "./mail-page.js";
import { create, action } from "./actions.js";
import { example, exampleStories, ensureExample } from "./example.js";
import {
  first,
  all,
  identity,
  signIn,
  limitedText,
  fail,
  Problem,
} from "./core.js";
import { refreshDue } from "./feeds.js";
import { draftNext } from "./draft-queue.js";
async function sweep(env, fetcher = fetch) {
  return {
    checked: await refreshDue(env.DB, fetcher),
    drafting: await draftNext(env, fetcher),
  };
}
import { canRead, hasMembership, claim } from "./commerce.js";
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noarchive",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; object-src 'none'; frame-ancestors 'self' https://chatgpt.com",
};
const response = (s, type = "text/html; charset=utf-8", status = 200) =>
  new Response(s, { status, headers: { ...headers, "Content-Type": type } });
const json = (data, status = 200) =>
  response(JSON.stringify(data), "application/json", status);
const redirect = (url) =>
  new Response(null, { status: 303, headers: { ...headers, Location: url } });
function rss(feed, stories, origin) {
  return (
    '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>' +
    esc(feed.name) +
    "</title><description>" +
    esc(feed.description || feed.name) +
    "</description><link>" +
    esc(origin + "/f/" + feed.slug) +
    "</link>" +
    stories
      .map(
        (s) =>
          "<item><title>" +
          esc(s.title) +
          "</title><link>" +
          esc(s.url) +
          '</link><guid isPermaLink="true">' +
          esc(s.url) +
          "</guid><description>" +
          esc((s.note ? s.note + " · " : "") + s.source) +
          "</description>" +
          (s.published_at
            ? "<pubDate>" +
              new Date(s.published_at).toUTCString() +
              "</pubDate>"
            : "") +
          "</item>",
      )
      .join("") +
    "</channel></rss>"
  );
}
export async function handle(req, env, ctx, fetcher = fetch) {
  const url = new URL(req.url),
    path = url.pathname,
    db = env.DB,
    method = req.method;
  const studio = /^\/api\/(?:create|[a-z0-9-]+\/[a-z-]+)$/.test(path);
  const inbound=/^\/inbound\/postmark(?:\/([a-z0-9-]+))?$/.exec(path);
  if (inbound && method === "POST") return json(await receiveMail(env,req,inbound[1]));
  if (studio && method === "POST" && path.endsWith("/mail-upload")) {
    if (req.headers.get("origin")!==url.origin || req.headers.get("content-type")!=="application/octet-stream") fail("Use the private inbox to import an email.",403);
    const user=await identity(req,env), slug=path.split("/")[2];
    if (!user || !await first(db,"SELECT 1 FROM editions WHERE slug=? AND owner=?",slug,user.id)) fail("Edition unavailable.",403);
    return json(await uploadMail(db,slug,req));
  }
  if (path === "/jobs/refresh" && method === "POST")
    return json(await sweep(env, fetcher));
  if (studio && method === "POST") {
    if (
      req.headers.get("origin") !== url.origin ||
      !/^application\/json(?:;|$)/i.test(req.headers.get("content-type") || "")
    )
      fail("Submit changes from your studio.", 403);
    const user = await identity(req, env);
    if (!user) fail("Sign in to your studio.", 401);
    let d;
    const payload = await limitedText(req, path.endsWith("/mail-paste") ? 750000 : 14000);
    try {
      d = JSON.parse(payload);
    } catch {
      fail("Invalid request.");
    }
    if (!d || Array.isArray(d) || typeof d !== "object")
      fail("Invalid request.");
    const [, , slug, op] = path.split("/");
    return json(
      path === "/api/create"
        ? await create(db, user, d)
        : await action(env, user, slug, op, d, fetcher),
    );
  }
  if (method !== "GET" && method !== "HEAD") fail("Method unavailable.", 405);
  if (path === "/style.css") return response(css, "text/css; charset=utf-8");
  if (path === "/studio.js")
    return response(client, "application/javascript; charset=utf-8");
  if (path === "/sharing.js") return response(sharing, "application/javascript; charset=utf-8");
  if (path === "/guide") return response(guide(url.origin));
  if (path === "/capture") return response(capturePage());
  if (path === "/") return response(homePage(example, exampleStories));
  if (path === "/publishing")
    return response(
      shell(
        "Publishing and corrections",
        `<article class="wrap message-page"><p class="kicker">Media Machine Editions</p><h1>Publishing and corrections</h1><h2>What readers see</h2><p>Each curator chooses the sources, writes or reviews editorial briefs, and links back to the original publication. A source wire lists publisher headlines. Sponsor placements are labeled.</p><h2>What the studio stores</h2><p>The studio keeps your sign-in identifier, edition settings, shared links, editorial notes and any permitted source material you enter. A members-only edition stores the email addresses used to grant access. Connecting Stripe also stores subscription references and an encrypted restricted key. Curators choose whether to send authorized material to OpenAI for drafting. A connected automatic-drafting key is encrypted.</p><h2>Private email</h2><p>Only the curator can open the email inbox. It stores message subjects and delivered text for private reading. Images and attachments are discarded. Email text stays out of automatic drafting, public pages and RSS. You can delete a message from the inbox. A brief you wrote separately can be edited or removed in the editorial inbox.</p><h2>Rights and corrections</h2><p>Use public permalinks and respect publisher terms. Publish material you own, have licensed, or can otherwise lawfully use. If a story needs correction or removal, identify the edition and its article link. Omit private subscriber details and account credentials from public reports.</p><a class="secondary" href="https://github.com/therealdansickles/media-machine/issues/new">Report a publishing issue</a></article>`,
      ),
    );
  if (path === "/robots.txt")
    return response(
      "User-agent: *\nDisallow: /studio\nDisallow: /claim/\nDisallow: /api/\n",
      "text/plain",
    );
  if (path === "/login" && env.IDENTITY_MODE !== "sites") {
    const user = await identity(req, env);
    if (!user)
      fail(
        "The host must protect /login with Cloudflare Access to enable sign-in.",
        401,
      );
    const next = new URL(url.searchParams.get("return_to") || "/studio", url);
    return redirect(
      next.origin === url.origin && next.pathname !== "/login"
        ? next.pathname + next.search
        : "/studio",
    );
  }
  if (path === "/studio/mail") {
    const user=await identity(req,env);
    if (!user) return redirect(signIn(path+url.search,env));
    const slug=url.searchParams.get("edition") || "";
    const feed=await first(db,"SELECT slug,name,mail_base,mail_alias FROM editions WHERE slug=? AND owner=?",slug,user.id);
    if (!feed) fail("Edition unavailable.",404);
    const q=(url.searchParams.get("q")||"").trim().slice(0,120);
    const value=url.searchParams.get("filter");
    const filter=["unfiled","filed"].includes(value) ? value : "all";
    const offset=Math.min(200,Math.max(0,Math.floor(Number(url.searchParams.get("offset"))/25)||0)*25);
    const join=" FROM private_mail m LEFT JOIN stories s ON s.edition=m.edition AND s.id='mail-'||m.id WHERE m.edition=?";
    const rows=await all(db,"SELECT m.id,m.subject,m.received,s.id AS filed"+join+" AND (instr(lower(m.subject),lower(?))>0 OR instr(lower(m.body),lower(?))>0) AND (?='all' OR (?='filed')=(s.id IS NOT NULL)) ORDER BY m.received DESC,m.id LIMIT 26 OFFSET ?",slug,q,q,filter,filter,offset);
    const id=url.searchParams.get("message");
    const selected=id ? await first(db,"SELECT m.id,m.subject,m.body,s.id AS filed"+join+" AND m.id=?",slug,id) : null;
    if (id && !selected) fail("Email unavailable.",404);
    return response(mailPage(env,feed,rows,selected,{q,filter,offset,origin:url.origin}));
  }
  if (path === "/studio") {
    const user = await identity(req, env);
    if (!user) return redirect(signIn(path + url.search, env));
    const editions = await all(
      db,
      "SELECT slug,name FROM editions WHERE owner=? ORDER BY created_at DESC,slug",
      user.id,
    );
    const slug = url.searchParams.get("edition") || editions[0]?.slug;
    const selected = slug
      ? await first(
          db,
          "SELECT slug,name,description,byline,visibility,sponsor_name,sponsor_url,sponsor_copy,sponsor_until,checkout_url,payment_link,draft_limit FROM editions WHERE slug=? AND owner=?",
          slug,
          user.id,
        )
      : null;
    if (slug && !selected) fail("Edition not found.", 404);
    const offset = Math.max(
      0,
      Math.min(3000, Math.floor(Number(url.searchParams.get("offset")) || 0)),
    );
    const filter=["draft","live","archived"].includes(url.searchParams.get("filter")) ? url.searchParams.get("filter") : "";
    const [sources, rows, members, mailTotal, recentMail] = selected
      ? await Promise.all([
          // The dashboard displays a count; message bodies load only in the owner's email view.
          all(
            db,
            "SELECT id,label,url,mode,auto_links,status,last_checked FROM sources WHERE edition=? ORDER BY label",
            slug,
          ),
          all(
            db,
            "SELECT id,url,source,original_title,title,note,state,members_only,source_date,published_at,evidence,automation FROM stories WHERE edition=? AND (?='' OR state=?) ORDER BY created_at DESC,id LIMIT 26 OFFSET ?",
            slug,filter,filter,
            offset,
          ),
          all(
            db,
            "SELECT email,expires,revoked,subscription IS NOT NULL AS subscribed FROM members WHERE edition=? ORDER BY email LIMIT 500",
            slug,
          ),
          first(db,"SELECT count(*) AS n FROM private_mail WHERE edition=?",slug),
          all(db,"SELECT id,subject FROM private_mail WHERE edition=? ORDER BY received DESC,id LIMIT 3",slug),
        ])
      : [[], [], []];
    return response(
      studioPage(editions, selected, sources, rows.slice(0, 25), members, {
        origin: url.origin,
        offset,
        filter,
        mailCount: mailTotal?.n || 0,
        recentMail: recentMail || [],
        hasMore: rows.length > 25,
      }),
    );
  }
  const match = path.match(/^\/(f|claim)\/([a-z0-9-]{3,64})(\/rss\.xml)?\/?$/);
  if (!match) fail("This page could not be found.", 404);
  const [, type, slug, asRSS] = match;
  if (type === "f" && slug === example.slug) await ensureExample(db);
  const feed = await first(db, "SELECT * FROM editions WHERE slug=?", slug);
  if (!feed) fail("This edition is unavailable.", 404);
  const user = await identity(req, env);
  if (feed.visibility === "draft" && feed.owner !== user?.id)
    fail("This edition is unavailable.", 404);
  if (type === "claim") {
    if (asRSS || feed.visibility === "draft")
      fail("This membership link is unavailable.", 404);
    if (!user) return redirect(signIn(path + url.search, env));
    await claim(
      env,
      feed,
      user,
      url.searchParams.get("session_id") || "",
      fetcher,
    );
    return redirect("/f/" + slug);
  }
  if (asRSS && feed.visibility !== "public")
    fail("This edition does not offer a public RSS feed.", 403);
  const allowed = await canRead(env, feed, user, fetcher);
  const hasPaidBriefs = !asRSS && feed.visibility === "public" && !!await first(db,
    "SELECT 1 FROM stories WHERE edition=? AND state='live' AND members_only=1 LIMIT 1", slug);
  const readPremium = !asRSS && (feed.visibility !== "public" ? allowed :
    hasPaidBriefs && await hasMembership(env, feed, user, fetcher));
  const items = allowed
    ? await all(
        db,
        "SELECT id,title,note,url,source,published_at,members_only FROM stories WHERE edition=? AND state='live' AND (members_only=0 OR ?=1) ORDER BY published_at DESC,id LIMIT 100",
        slug, readPremium ? 1 : 0,
      )
    : [];
  if (asRSS)
    return response(
      rss(feed, items, url.origin),
      "application/rss+xml; charset=utf-8",
    );
  return response(
    readerPage(feed, items, {
      locked: !allowed,
      offer: hasPaidBriefs && !readPremium,
      member: feed.visibility !== "public",
      loginUrl: user ? null : signIn(path, env),
    }),
  );
}
export async function serve(req, env, ctx, fetcher = fetch) {
  try {
    return await handle(req, env, ctx, fetcher);
  } catch (e) {
    const code = e instanceof Problem ? e.status : 500;
    const msg =
      e instanceof Problem
        ? e.message
        : "The service could not complete this request. Please try again.";
    if (code === 500)
      console.error("Editions request failed", e?.name || "Error");
    return new URL(req.url).pathname.startsWith("/api/")
      ? json({ error: msg }, code)
      : response(errorPage(msg), "text/html; charset=utf-8", code);
  }
}
export default {
  fetch: (req, env, ctx) => serve(req, env, ctx),
  scheduled: (_event, env, ctx) => ctx.waitUntil(sweep(env)),
};
