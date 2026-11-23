import { first, run, now, field, publicUrl, fail } from "./core.js";
import { refresh } from "./feeds.js";
import { seal } from "./commerce.js";
import { generate } from "./brief.js";
import { example } from "./example.js";
const choices = (v, values) =>
  values.includes(v) ? v : fail("Choose a valid option.");
const address = (v) => {
  const e = field(v, 254, true).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) fail("Enter a valid email.");
  return e;
};
const optionalUrl = (v) => (v ? publicUrl(v) : "");
export async function create(db, user, data) {
  const slug = field(data.slug, 64, true).toLowerCase();
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    slug.length < 3 ||
    slug === example.slug
  )
    fail(
      "Choose a unique address of 3–64 lowercase letters, numbers or hyphens.",
    );
  const res = await run(
    db,
    `INSERT OR IGNORE INTO editions(slug,owner,name,description,byline,created_at)
    SELECT ?,?,?,?,?,? WHERE (SELECT count(*) FROM editions WHERE owner=?)<15`,
    slug,
    user.id,
    field(data.name, 90, true),
    field(data.description, 400),
    field(data.byline, 90, true),
    now(),
    user.id,
  );
  if (!res.meta.changes)
    fail(
      "This address is taken, or you have reached the 15-edition limit.",
      409,
    );
  return { redirect: "/studio?edition=" + slug };
}
export async function action(env, user, slug, op, d, fetcher = fetch) {
  const db = env.DB;
  const feed = await first(
    db,
    "SELECT * FROM editions WHERE slug=? AND owner=?",
    slug,
    user.id,
  );
  if (!feed) fail("Edition not found.", 404);
  switch (op) {
    case "settings": {
      const url = optionalUrl(d.sponsor_url),
        name = field(d.sponsor_name, 100),
        copy = field(d.sponsor_copy, 300);
      if ((url || copy) && !name) fail("Give the sponsor a name.");
      const until = d.sponsor_until === undefined ? feed.sponsor_until : field(d.sponsor_until, 10);
      if (until) {
        const date = new Date(until + "T00:00:00Z");
        if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== until)
          fail("Choose a valid sponsor end date.");
      }
      await run(
        db,
        "UPDATE editions SET name=?,description=?,byline=?,visibility=?,sponsor_name=?,sponsor_copy=?,sponsor_url=?,sponsor_until=?,checkout_url=? WHERE slug=?",
        field(d.name, 90, true),
        field(d.description, 400),
        field(d.byline, 90, true),
        choices(d.visibility, ["public", "draft", "members"]),
        name,
        copy,
        url,
        until || null,
        optionalUrl(d.checkout_url),
        slug,
      );
      break;
    }
    case "source": {
      let url = publicUrl(field(d.url, 2048, true), { feed: false });
      const u = new URL(url);
      if (
        u.hostname.endsWith(".substack.com") &&
        u.pathname === "/" &&
        !u.search
      )
        url = new URL("/feed", url).href;
      url = publicUrl(url, { feed: true });
      const id = crypto.randomUUID();
      const res = await run(
        db,
        `INSERT OR IGNORE INTO sources(id,edition,url,label,mode,auto_links) SELECT ?,?,?,?,?,?
        WHERE (SELECT count(*) FROM sources WHERE edition=?)<20`,
        id,
        slug,
        url,
        field(d.label, 120, true),
        choices(d.mode, ["links", "licensed"]),
        d.auto_links === "on" ? 1 : 0,
        slug,
      );
      if (!res.meta.changes)
        fail(
          "This source already exists, or the edition has reached 20 sources.",
          409,
        );
      const src = await first(db, "SELECT * FROM sources WHERE id=?", id);
      return { message: await refresh(db, src, fetcher) };
    }
    case "refresh": {
      const src = await first(
        db,
        "SELECT * FROM sources WHERE edition=? AND id=?",
        slug,
        d.id || "",
      );
      if (!src) fail("Source not found.", 404);
      return { message: await refresh(db, src, fetcher) };
    }
    case "remove-source":
      await run(
        db,
        "DELETE FROM sources WHERE edition=? AND id=?",
        slug,
        d.id || "",
      );
      break;
    case "story": {
      const title = field(d.title, 240, true);
      const state = choices(d.state ?? "draft", ["draft", "live"]);
      const res = await run(
        db,
        `INSERT OR IGNORE INTO stories(id,edition,url,source,original_title,evidence,title,note,state,members_only,published_at,created_at)
        SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE (SELECT count(*) FROM stories WHERE edition=?)<3000`,
        crypto.randomUUID(),
        slug,
        publicUrl(d.url),
        field(d.source, 120, true),
        title,
        field(d.evidence, 3500),
        title,
        field(d.note, 1500),
        state,
        choices(d.audience ?? "edition", ["edition","members"]) === "members" ? 1 : 0,
        state === "live" ? new Date().toISOString() : null,
        now(),
        slug,
      );
      if (!res.meta.changes)
        fail("This link already exists or the edition is full.", 409);
      return { message: state === "draft" ? "Saved to your editorial inbox." : feed.visibility === "draft" ? "Brief saved. Set the edition to Public or Members in Publication settings to share it." : "Brief published." };
    }
    case "edit": {
      const state = choices(d.state, ["draft", "live", "archived"]);
      const story = await first(
        db,
        "SELECT id FROM stories WHERE edition=? AND id=?",
        slug,
        d.id || "",
      );
      if (!story) fail("Story not found.", 404);
      await run(
        db,
        `UPDATE stories SET automation=NULL,title=?,note=?,state=?,members_only=COALESCE(?,members_only),published_at=CASE WHEN ?='live' THEN COALESCE(published_at,?) ELSE published_at END WHERE edition=? AND id=?`,
        field(d.title, 240, true),
        field(d.note, 1500),
        state,
        d.audience == null ? null : choices(d.audience, ["edition","members"]) === "members" ? 1 : 0,
        state,
        new Date().toISOString(),
        slug,
        d.id,
      );
      break;
    }
    case "generate": {
      const story = await first(
        db,
        "SELECT source,original_title,evidence FROM stories WHERE edition=? AND id=?",
        slug,
        d.id || "",
      );
      if (!story) fail("Story not found.", 404);
      if (d.evidence) story.evidence = field(d.evidence, 3500, true);
      return { draft: await generate(story, field(d.key, 320, true), fetcher) };
    }
    case "member": {
      const email = address(d.email),
        date = field(d.expires, 10, true);
      const expires = Date.parse(date + "T23:59:59Z") / 1000;
      if (
        !/^\d{4}-\d\d-\d\d$/.test(date) ||
        !Number.isFinite(expires) ||
        expires <= now() ||
        new Date(expires * 1000).toISOString().slice(0, 10) !== date
      )
        fail("Enter a valid future expiry date.");
      await run(
        db,
        `INSERT INTO members(edition,email,expires) VALUES(?,?,?) ON CONFLICT(edition,email) DO UPDATE SET expires=excluded.expires,revoked=0`,
        slug,
        email,
        expires,
      );
      break;
    }
    case "revoke":
      await run(
        db,
        "UPDATE members SET revoked=1,expires=NULL WHERE edition=? AND email=?",
        slug,
        address(d.email),
      );
      break;
    case "drafting": {
      const limit = Number(d.limit);
      if (!Number.isInteger(limit) || limit < 0 || limit > 25)
        fail("Choose a daily limit between 0 and 25.");
      if (!limit) {
        await db.batch([
          db
            .prepare(
              "UPDATE editions SET draft_key=NULL,draft_limit=0 WHERE slug=?",
            )
            .bind(slug),
          db
            .prepare(
              "UPDATE stories SET automation=NULL WHERE edition=? AND automation IN ('queued','working')",
            )
            .bind(slug),
        ]);
        break;
      }
      const key = field(d.key, 320, true);
      if (!/^sk-[a-zA-Z0-9_-]{12,300}$/.test(key))
        fail("Enter an OpenAI API key.");
      await run(
        db,
        "UPDATE editions SET draft_key=?,draft_limit=? WHERE slug=?",
        await seal(env.EDITION_KEY, "draft/" + slug, key),
        limit,
        slug,
      );
      break;
    }
    case "billing": {
      const key = field(d.key, 300),
        link = field(d.payment_link, 120);
      if (key || link) {
        if (
          !/^rk_(live|test)_[A-Za-z0-9_]+$/.test(key) ||
          !/^plink_[A-Za-z0-9]+$/.test(link)
        )
          fail("Use a restricted Stripe key and a Payment Link ID.");
        const sealed = await seal(env.EDITION_KEY, slug, key);
        await run(
          db,
          "UPDATE editions SET payment_link=?,billing_key=? WHERE slug=?",
          link,
          sealed,
          slug,
        );
      } else
        await run(
          db,
          "UPDATE editions SET payment_link=NULL,billing_key=NULL WHERE slug=?",
          slug,
        );
      break;
    }
    default:
      fail("Unknown action.", 404);
  }
  return { message: "Saved." };
}
