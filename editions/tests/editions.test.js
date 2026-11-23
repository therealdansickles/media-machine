import test from "node:test";
import assert from "node:assert/strict";
import { LocalDB } from "../scripts/local-db.mjs";
import { serve } from "../dist/server/index.js";
import { parseFeed, refresh } from "../src/feeds.js";
import { seal, unseal } from "../src/commerce.js";
const origin = "https://edition.example.org";
const source = "https://art.example.org/feed.xml";
const article = "https://art.example.org/stories/colour";
const xml =
  "<rss><channel><item><title>Colour study opens</title><link>" +
  article +
  "</link><description>A long source description from the publisher</description><pubDate>Mon, 16 Nov 2026 12:00:00 GMT</pubDate></item></channel></rss>";
const feedData = {
  slug: "paint-desk",
  name: "Paint Desk",
  byline: "Editor",
  description: "A specialist painting journal.",
};
function setup() {
  const env = {
    DB: new LocalDB(),
    IDENTITY_MODE: "sites",
    EDITION_KEY: Buffer.alloc(32, 7).toString("base64"),
  };
  const req = (path, body, user, fetcher = async () => new Response(xml)) => {
    const headers = {};
    if (user) {
      headers["oai-authenticated-user-id"] = user;
      headers["oai-authenticated-user-email"] = user + "@example.org";
    }
    if (body) {
      headers.origin = origin;
      headers["content-type"] = "application/json";
    }
    return serve(
      new Request(origin + path, {
        method: body ? "POST" : "GET",
        headers,
        body: body ? JSON.stringify(body) : undefined,
      }),
      env,
      {},
      fetcher,
    );
  };
  return {
    env,
    req,
    post: (op, data, fetcher) =>
      req("/api/paint-desk/" + op, data, "owner", fetcher),
    create: () => req("/api/create", feedData, "owner"),
  };
}
test("creator can create, import, deduplicate, publish, sponsor, gate, revoke and withdraw an edition", async () => {
  const { env, req, post, create } = setup();
  assert.equal((await create()).status, 200);
  assert.equal((await create()).status, 409);
  assert.match(
    await (await req("/studio?edition=paint-desk", null, "owner")).text(),
    /Paint Desk/,
  );
  assert.equal((await req("/f/paint-desk")).status, 404);
  assert.equal(
    (await post("source", { label: "Art News", url: source, mode: "links" }))
      .status,
    200,
  );
  const story = env.DB.sqlite.prepare("SELECT * FROM stories").get();
  assert.equal(story.evidence, "");
  assert.equal(story.state, "draft");
  const src = env.DB.sqlite.prepare("SELECT * FROM sources").get();
  assert.match(await refresh(env.DB, src), /recently/);
  env.DB.sqlite.exec("update sources set next_check=0");
  await refresh(env.DB, src, async () => new Response(xml));
  assert.equal(
    env.DB.sqlite.prepare("SELECT COUNT(*) n FROM stories").get().n,
    1,
  );
  const edit = {
    id: story.id,
    title: "Gallery opens a new colour study",
    note: "A curator’s perspective.",
    state: "live",
  };
  assert.equal((await req("/api/paint-desk/edit", edit, "other")).status, 404);
  assert.equal((await post("edit", edit)).status, 200);
  const settings = {
    ...feedData,
    visibility: "public",
    sponsor_name: "Studio Supply",
    sponsor_url: "https://supply.example.org/",
  };
  await post("settings", settings);
  assert.match(await (await req("/f/paint-desk")).text(), /Studio Supply/);
  assert.match(
    await (await req("/f/paint-desk/rss.xml")).text(),
    /Gallery opens/,
  );
  await post("settings", { ...settings, visibility: "members" });
  assert.doesNotMatch(
    await (await req("/f/paint-desk")).text(),
    /Gallery opens/,
  );
  assert.equal((await req("/f/paint-desk/rss.xml")).status, 403);
  await post("member", { email: "reader@example.org", expires: "2099-05-01" });
  assert.match(
    await (await req("/f/paint-desk", null, "reader")).text(),
    /Gallery opens/,
  );
  await post("revoke", { email: "reader@example.org" });
  assert.doesNotMatch(
    await (await req("/f/paint-desk", null, "reader")).text(),
    /Gallery opens/,
  );
  await post("edit", { ...edit, state: "draft" });
  await post("settings", settings);
  assert.doesNotMatch(
    await (await req("/f/paint-desk/rss.xml")).text(),
    /Gallery opens/,
  );
});
test("mixed edition keeps premium items out of public HTML and all RSS, including after legacy edits", async () => {
  const {env, req, post, create} = setup();
  await create();
  await post("settings", {...feedData, visibility:"public"});
  const shared = {url:article, source:"Art News", title:"Public story", state:"live"};
  assert.equal((await post("story", shared)).status, 200);
  const paid = {...shared, title:"Private briefing", url:article+"/paid", note:"Paid analysis", audience:"members"};
  assert.equal((await post("story", paid)).status, 200);
  assert.equal((await post("story", paid)).status, 409);
  const id = env.DB.sqlite.prepare("SELECT id FROM stories WHERE members_only=1").get().id;
  await post("edit", {id,title:paid.title,note:paid.note,state:"live"});
  await post("member", {email:"reader@example.org", expires:"2099-12-12"});
  const page = async (path,user) => (await req("/f/paint-desk"+path,null,user)).text();
  for (const user of [undefined, "other"]) {
    const publicPage = await page("",user);
    assert.match(publicPage, /Public story/);
    assert.doesNotMatch(publicPage, /Private briefing|Paid analysis|colour\/paid/);
  }
  for (const user of ["owner","reader"]) {
    assert.match(await page("",user), /Paid analysis/);
    assert.doesNotMatch(await page("/rss.xml",user), /Private briefing|Paid analysis|colour\/paid/);
  }
  await post("revoke", {email:"reader@example.org"});
  assert.doesNotMatch(await page("","reader"), /Paid analysis/);
});
test("capture is public and studio retains capture intent through sign-in", async () => {
  const {req} = setup();
  assert.match(await (await req("/capture")).text(), /capture-link/);
  assert.match(await (await req("/guide")).text(), /Show in Share Sheet/);
  assert.equal((await req("/studio?capture=1")).headers.get("location"), "/signin-with-chatgpt?return_to=%2Fstudio%3Fcapture%3D1");
});
test("expired sponsor bookings stop rendering, and legacy settings saves preserve their expiry", async () => {
  const {req,post,create} = setup();
  await create();
  const settings = {...feedData, visibility:"public", sponsor_name:"Gallery Sponsor"};
  assert.equal((await post("settings",{...settings,sponsor_until:"2099-02-30"})).status,400);
  await post("settings",{...settings,sponsor_until:"2020-02-28"});
  await post("settings",settings);
  assert.doesNotMatch(await (await req("/f/paint-desk")).text(), /Gallery Sponsor/);
  await post("settings",{...settings,sponsor_until:"2099-12-31"});
  assert.match(await (await req("/f/paint-desk")).text(), /Gallery Sponsor/);
});
test("Atom alternate links, attribution and source dates survive import", () => {
  const atom =
    '<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Colour</title><link rel="self" href="https://art.example.org/api"/><link href="/colour"/><updated>2026-11-20T15:00:00Z</updated><summary>Permitted source material</summary></entry></feed>';
  const parsed = parseFeed(atom, source, true);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].url, "https://art.example.org/colour");
  assert.equal(parsed[0].evidence, "Permitted source material");
  assert.equal(parsed[0].date, "2026-11-20T15:00:00.000Z");
});

test("pasted mail stays private, is searchable, and creates a separate draft without source text", async () => {
  const {env,req,post,create} = setup();
  await create();
  await post("settings",{...feedData,visibility:"public"});
  const body="Member copy <img src=x> only.";
  const {redirect} = await (await post("mail-paste",{subject:"Dispatch",body})).json();
  const id = new URL(redirect,origin).searchParams.get("message");
  assert.match(await (await req(redirect,null,"owner")).text(),/Member copy &lt;img/);
  assert.equal((await req(redirect,null,"other")).status,404);
  assert.equal((await req(redirect)).status,303);
  assert.match(await (await req("/studio/mail?edition=paint-desk&q=member&filter=unfiled",null,"owner")).text(),/Dispatch/);
  assert.match(await (await req("/studio?edition=paint-desk",null,"owner")).text(),/Dispatch/);
  const brief={id,url:article,source:"Publication",title:"My headline",note:"My observation"};
  assert.equal((await req("/api/paint-desk/mail-brief",brief,"other")).status,404);
  await post("mail-brief",brief);
  await post("mail-brief",brief);
  const stories=env.DB.sqlite.prepare("SELECT * FROM stories").all();
  assert.equal(stories.length,1);
  assert.equal(stories[0].state,"draft");
  assert.ok(!stories[0].evidence);
  assert.ok(!stories[0].automation);
  assert.match(await (await req("/studio/mail?edition=paint-desk&filter=filed",null,"owner")).text(),/Dispatch/);
  assert.doesNotMatch(await (await req("/studio/mail?edition=paint-desk&filter=unfiled",null,"owner")).text(),/Dispatch/);
  await post("edit",{...brief,id:stories[0].id,state:"live"});
  for (const suffix of ["","/rss.xml"]) {
    const page=await (await req("/f/paint-desk"+suffix)).text();
    assert.match(page,/My headline/);
    assert.doesNotMatch(page,/Member copy|Dispatch/);
  }
  await post("mail-delete",{id});
  assert.equal((await req(redirect,null,"owner")).status,404);
  assert.match(await (await req("/f/paint-desk")).text(),/My observation/);
});

test("authenticated .eml import decodes MIME and deduplicates a second upload", async () => {
  const {env,create,req}=setup();
  await create();
  const raw=["Subject: =?UTF-8?Q?Caf=C3=A9_notes?=","Message-ID: <test45@news.example.org>","MIME-Version: 1.0","Content-Type: text/plain; charset=UTF-8","Content-Transfer-Encoding: base64","",btoa("The complete delivered note.")].join("\r\n");
  const upload=(user)=>serve(new Request(origin+"/api/paint-desk/mail-upload",{method:"POST",body:raw,headers:{origin,"content-type":"application/octet-stream","oai-authenticated-user-id":user,"oai-authenticated-user-email":user+"@example.org"}}),env,{});
  assert.equal((await upload("other")).status,403);
  const a=await (await upload("owner")).json();
  const b=await (await upload("owner")).json();
  assert.ok(a.redirect);
  assert.equal(a.redirect,b.redirect);
  const page=await (await req(a.redirect,null,"owner")).text();
  assert.match(page,/Café notes/);
  assert.match(page,/The complete delivered note/);
});

test("provider deliveries require the correct stream credentials and envelope recipient; rotation invalidates an old address", async () => {
  const {env,post,create} = setup();
  await create();
  const base="abcd1234@inbound.postmarkapp.com", pass="test-webhook-password-123456789";
  const alias=()=>env.DB.sqlite.prepare("SELECT mail_alias FROM editions").get().mail_alias;
  const data={mode:"custom",base,password:pass};
  assert.equal((await post("mail-connect",data)).status,200);
  const send=(route,password,recipient)=>serve(new Request(origin+"/inbound/postmark"+route,{method:"POST",headers:{"content-type":"application/json",authorization:"Basic "+btoa("editions:"+password)},body:JSON.stringify({To:recipient,OriginalRecipient:recipient,Subject:"Newsletter",MessageID:"mock-delivery",HtmlBody:"<style>hidden</style><p>Actual <b>news</b></p><img src='https://tracker.example.org'>",Attachments:[{Content:"discarded"}]})}),env,{});
  let recipient=base.replace("@","+"+alias()+"@");
  assert.equal((await send("/paint-desk","bad",recipient)).status,403);
  assert.equal((await send("/paint-desk",pass,"other"+recipient)).status,403);
  assert.equal((await send("/paint-desk",pass,recipient)).status,200);
  assert.equal((await send("/paint-desk",pass,recipient)).status,200);
  assert.deepEqual(env.DB.sqlite.prepare("SELECT body FROM private_mail").all().map(m=>m.body),["Actual news"]);
  await post("mail-connect",data);
  assert.equal((await send("/paint-desk",pass,recipient)).status,403);
  env.POSTMARK_INBOUND_ADDRESS=base;
  env.POSTMARK_WEBHOOK_SECRET=pass;
  await post("mail-connect",{mode:"hosted"});
  recipient=base.replace("@","+"+alias()+"@");
  assert.equal((await send("",pass,recipient)).status,200);
  await post("mail-disable",{});
  assert.equal((await send("",pass,recipient)).status,403);
});
test("failed source stays visible to the curator and retries after its backoff", async () => {
  const { env, post, create } = setup();
  await create();
  const resp = await post(
    "source",
    { label: "Feed", url: source, mode: "links" },
    async () => new Response("", { status: 503 }),
  );
  assert.match((await resp.json()).message, /503/);
  assert.equal(
    env.DB.sqlite.prepare("SELECT count(*) n FROM stories").get().n,
    0,
  );
});
test("shared links and evidence-checked model drafts stay private until an editor publishes", async () => {
  const { env, post, create } = setup();
  await create();
  const evidence =
    "The announced painting exhibition pairs works by two local artists and opens to residents on Friday. The program includes an afternoon conversation about the materials and techniques both painters use.";
  await post("story", {
    url: article,
    title: "Studio event",
    source: "Studio",
    evidence,
  });
  const id = env.DB.sqlite.prepare("SELECT id FROM stories").get().id;
  const draft = {
    title: "Local painters share their techniques",
    note: "A studio exhibition pairs two local artists.",
    evidence: "works by two local artists",
  };
  const resp = await post(
    "generate",
    { id, key: "sk-fixture-not-a-live-key" },
    async (url, opts) => {
      assert.match(url, /api.openai.com/);
      assert.equal(JSON.parse(opts.body).store, false);
      return Response.json({
        status: "completed",
        output: [
          { content: [{ type: "output_text", text: JSON.stringify(draft) }] },
        ],
      });
    },
  );
  assert.deepEqual((await resp.json()).draft, {
    title: draft.title,
    note: draft.note,
  });
  const story = env.DB.sqlite.prepare("SELECT title,state FROM stories").get();
  assert.equal(story.title, "Studio event");
  assert.equal(story.state, "draft");
});
test("Stripe claim verifies buyer, purchase and current status; manual revocation persists", async () => {
  const { env, req, post, create } = setup();
  await create();
  await post("settings", { ...feedData, visibility: "members" });
  await post("story", {
    url: article,
    title: "Paid coverage",
    source: "Publisher",
    note: "A member note",
  });
  const id = env.DB.sqlite.prepare("SELECT id FROM stories").get().id;
  await post("edit", {
    id,
    title: "Paid coverage",
    note: "A member note",
    state: "live",
  });
  await post("billing", {
    key: "rk_test_examplefixture",
    payment_link: "plink_abc",
  });
  const row = env.DB.sqlite.prepare("SELECT * FROM editions").get();
  assert.notEqual(row.billing_key, "rk_test_examplefixture");
  assert.equal(
    await unseal(env.EDITION_KEY, row.slug, row.billing_key),
    "rk_test_examplefixture",
  );
  let status = "active";
  const fake = async (url) =>
    Response.json(
      url.includes("/checkout/")
        ? {
            status: "complete",
            mode: "subscription",
            payment_status: "paid",
            customer_details: { email: "reader@example.org" },
            payment_link: "plink_abc",
            subscription: "sub_abc",
          }
        : { status },
    );
  const path = "/claim/paint-desk?session_id=cs_test_examplefixture";
  assert.equal((await req(path, null, "other", fake)).status, 403);
  assert.equal((await req(path, null, "reader", fake)).status, 303);
  assert.match(
    await (await req("/f/paint-desk", null, "reader", fake)).text(),
    /Paid coverage/,
  );
  status = "canceled";
  assert.doesNotMatch(
    await (await req("/f/paint-desk", null, "reader", fake)).text(),
    /Paid coverage/,
  );
  status = "active";
  await post("revoke", { email: "reader@example.org" });
  await req(path, null, "reader", fake);
  assert.doesNotMatch(
    await (await req("/f/paint-desk", null, "reader", fake)).text(),
    /Paid coverage/,
  );
});
test("starter edition is seeded once and publishes new link-only items from its publisher", async () => {
  const { req, env } = setup();
  await req("/jobs/refresh", {}, null);
  await req("/jobs/refresh", {}, null);
  assert.equal(
    env.DB.sqlite.prepare("SELECT count(*) n FROM sources").get().n,
    1,
  );
  assert.equal(
    env.DB.sqlite.prepare("SELECT count(*) n FROM stories").get().n,
    4,
  );
  assert.match(
    await (await req("/f/independent-film-desk/rss.xml")).text(),
    /Colour study opens/,
  );
});
test("automatic drafting requires opt-in, keeps results private and honors the daily budget", async () => {
  const { env, req, post, create } = setup();
  await create();
  const evidence =
    "The exhibition pairs works by two local artists and opens to residents on Friday. The program includes an afternoon conversation on materials and techniques used in the studio.";
  const entry = (i) =>
    "<item><title>Studio exhibition " +
    i +
    "</title><link>https://art.example.org/events/" +
    i +
    "</link><description>" +
    evidence +
    "</description></item>";
  const feed = "<rss><channel>" + entry(1) + entry(2) + "</channel></rss>";
  await post("drafting", { key: "sk-fictional-test-credential", limit: 1 });
  await post(
    "source",
    { label: "Licensed source", url: source, mode: "licensed" },
    async () => new Response(feed),
  );
  const count = (state) =>
    env.DB.sqlite
      .prepare(
        "SELECT COUNT(*) n FROM stories WHERE edition=? AND automation=?",
      )
      .get(feedData.slug, state).n;
  assert.equal(count("queued"), 2);
  let calls = 0;
  const provider = async (url) => {
    if (!url.startsWith("https://api.openai.com/")) return new Response(xml);
    calls++;
    return Response.json({
      status: "completed",
      output: [
        {
          content: [
            {
              type: "output_text",
              text: JSON.stringify({
                title: "Two painters discuss their methods",
                note: "Friday’s exhibition includes a conversation on materials.",
                evidence: "works by two local artists",
              }),
            },
          ],
        },
      ],
    });
  };
  await Promise.all([
    req("/jobs/refresh", {}, null, provider),
    req("/jobs/refresh", {}, null, provider),
  ]);
  assert.equal(calls, 1);
  assert.equal(count("ready"), 1);
  assert.equal(count("queued"), 1);
  assert.equal(
    env.DB.sqlite
      .prepare(
        "SELECT COUNT(*) n FROM stories WHERE edition=? AND state='live'",
      )
      .get(feedData.slug).n,
    0,
  );
  await post("drafting", { limit: 0 });
  assert.equal(count("queued"), 0);
  assert.equal(
    env.DB.sqlite
      .prepare("SELECT draft_key FROM editions WHERE slug=?")
      .get(feedData.slug).draft_key,
    null,
  );
});
