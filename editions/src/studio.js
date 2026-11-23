import { escapeHtml as h, shell } from "./public-pages.js";

const pathFor = (slug) => "/api/" + encodeURIComponent(slug);
const deskPath = (slug) => "/studio?edition=" + encodeURIComponent(slug);
const chosen = (value, match) => (value === match ? " selected" : "");
const hidden = (name, value) =>
  `<input type="hidden" name="${h(name)}" value="${h(value)}">`;
const notice =
  '<p id="studio-notice" class="studio-notice" role="status" hidden></p>';
const feedback =
  '<p class="feedback" role="status" aria-live="polite" hidden></p>';
const act = (text, { primary = false, state } = {}) =>
  `<button type="submit"${primary ? ' class="primary"' : ""}${state ? ` name="state" value="${state}"` : ""}>${text}</button>`;

function field(label, name, value = "", attributes = "") {
  return `<label>${label}<input name="${name}" value="${h(value)}" ${attributes}></label>`;
}
function area(label, name, value = "", attributes = "") {
  return `<label>${label}<textarea name="${name}" ${attributes}>${h(value)}</textarea></label>`;
}
function form(path, contents, extra = "") {
  return `<form method="post" action="${h(path)}" ${extra}>${contents}${feedback}</form>`;
}
function safeLink(raw) {
  try {
    const url = new URL(raw);
    return /^https?:$/.test(url.protocol) && !url.username && !url.password
      ? h(url.href)
      : "";
  } catch {
    return "";
  }
}
function dateOnly(value) {
  if (!value) return "";
  const date = new Date(typeof value === "number" ? value * 1000 : value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}
function panel(title, body, id = "") {
  return `<details class="panel settings-panel"${id ? ` id="${id}"` : ""}><summary>${title}</summary>${body}</details>`;
}

function newEdition() {
  return form(
    "/api/create",
    `
    ${field("Edition name", "name", "", 'required maxlength="90" placeholder="Independent Film Desk"')}
    ${field("Edition address", "slug", "", 'required minlength="3" maxlength="64" pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="independent-film-desk" autocapitalize="none" spellcheck="false"')}
    <p class="field-help">Choose a permanent address using lowercase letters, numbers, and hyphens.</p>
    ${area("What does this edition cover?", "description", "", 'rows="2"')}
    ${field("Curator byline", "byline", "", 'required maxlength="90" autocomplete="name"')}
    ${act("Create draft edition", { primary: true })}
  `,
  );
}
function settings(feed) {
  return panel(
    "Publication settings",
    form(
      pathFor(feed.slug) + "/settings",
      `
    ${field("Edition name", "name", feed.name, "required")}
    ${area("Description", "description", feed.description, 'rows="2"')}
    ${field("Curator byline", "byline", feed.byline, 'required maxlength="90"')}
    <label>Who can read this edition?<select name="visibility">
      <option value="draft"${chosen(feed.visibility, "draft")}>Draft · curator only</option>
      <option value="public"${chosen(feed.visibility, "public")}>Public · anyone with the link</option>
      <option value="members"${chosen(feed.visibility, "members")}>Members · approved readers</option>
    </select></label>
    <fieldset><legend>Direct sponsorship</legend>
      ${field("Sponsor name", "sponsor_name", feed.sponsor_name)}
      ${field("Sponsor URL", "sponsor_url", feed.sponsor_url, 'type="url" placeholder="https://"')}
      ${area("Sponsor message", "sponsor_copy", feed.sponsor_copy, 'rows="2"')}
    </fieldset>
    ${field("Membership checkout URL", "checkout_url", feed.checkout_url, 'type="url" placeholder="https://"')}
    <p class="field-help">Members-only editions can link to your checkout. Grant readers access below or connect Stripe.</p>
    ${act("Save publication settings")}
  `,
    ),
    "settings",
  );
}
function sourcesPanel(feed, sources) {
  const base = pathFor(feed.slug);
  const rows = sources
    .map(
      (
        s,
      ) => `<li><strong>${h(s.label)}</strong><span class="source-url">${h(s.url)}</span><small>${h(s.status)}${s.last_checked ? " · " + dateOnly(s.last_checked) : ""}</small><div class="inline-forms">
    ${form(base + "/refresh", hidden("id", s.id) + act("Refresh"))}
    ${form(base + "/remove-source", hidden("id", s.id) + act("Remove"), 'data-confirm="Remove this feed from the edition?"')}
    </div></li>`,
    )
    .join("");
  return panel(
    `Sources${sources.length ? ` <span class="count">${sources.length}</span>` : ""}`,
    `
    ${rows ? `<ul class="record-list">${rows}</ul>` : ""}
    ${form(
      base + "/source",
      `
      ${field("Source name", "label", "", "required")}
      ${field("Public RSS or Atom URL", "url", "", 'type="url" required placeholder="https://publication.substack.com/feed"')}
      <p class="field-help">For a public Substack, append <code>/feed</code> to the publication address. Use a public feed URL without subscriber credentials.</p>
      <label>Import permission<select name="mode">
        <option value="links">Links and source headlines</option>
        <option value="licensed">Authorized feed text for drafting</option>
      </select></label>
      <p class="field-help">Choose authorized text only for material you own or have permission to process in an AI brief. Article pages and private subscriptions are never fetched.</p>
      <label class="check-field"><input type="checkbox" name="auto_links" value="on">Publish imported links automatically with their source headline</label>
      <p class="field-help">Leave unchecked to review incoming links before publication.</p>
      ${act("Add feed")}
    `,
    )}
  `,
    "sources",
  );
}
function sharedLink(feed) {
  return panel(
    "Add a shared story",
    form(
      pathFor(feed.slug) + "/story",
      `
    ${field("Public article link", "url", "", 'type="url" required placeholder="https://"')}
    ${field("Original publication", "source", "", "required")}
    ${field("Headline", "title", "", "required")}
    ${area("Curator’s note", "note", "", 'rows="2"')}
    ${area("Authorized source material for drafting (optional)", "evidence", "", 'rows="3"')}
    <p class="field-help">Paste at least 25 words of material you own or have permission to process. It stays in the studio and goes to OpenAI only when you request a draft.</p>
    ${act("Save to inbox")}
  `,
    ),
    "shared-story",
  );
}
function membersPanel(feed, members) {
  const base = pathFor(feed.slug);
  const rows = members
    .map(
      (
        m,
      ) => `<li><strong>${h(m.email)}</strong><small>${m.revoked ? "Revoked" : m.expires ? "Through " + dateOnly(m.expires) : m.subscribed ? "Stripe subscriber" : "Ongoing access"}</small>
    ${!m.revoked ? form(base + "/revoke", hidden("email", m.email) + act("Revoke access"), 'data-confirm="Revoke reader access for this email?"') : ""}</li>`,
    )
    .join("");
  return panel(
    "Reader memberships",
    `
    <p>Grant access to the email address the reader uses to sign in.</p>
    ${form(
      base + "/member",
      `
      ${field("Reader email", "email", "", 'type="email" required autocomplete="off"')}
      ${field("Access through", "expires", "", 'type="date" required')}
      ${act("Grant access")}
    `,
    )}
    ${rows ? `<ul class="record-list">${rows}</ul>` : ""}
  `,
    "members",
  );
}
function billingPanel(feed, origin) {
  const address = h(
    origin +
      "/claim/" +
      encodeURIComponent(feed.slug) +
      "?session_id={CHECKOUT_SESSION_ID}",
  );
  const base = pathFor(feed.slug) + "/billing";
  return panel(
    "Stripe subscription setup",
    `
    <p>To let readers activate membership after checkout, use a recurring Stripe Payment Link. Put its buy.stripe.com URL in publication settings.</p>
    <p>In Stripe, set the Payment Link’s after-payment redirect to this address.</p>
    <code class="claim-address">${address}</code>
    ${feed.payment_link ? `<p class="connection">Connected Payment Link <code>${h(feed.payment_link)}</code></p>` : ""}
    ${form(
      base,
      `
      ${field("Stripe Payment Link ID", "payment_link", feed.payment_link, 'required placeholder="plink_…" autocomplete="off"')}
      ${field("Restricted Stripe key", "key", "", 'required type="password" autocomplete="off" spellcheck="false" placeholder="rk_…"')}
      <p class="field-help">Use a restricted key with read access to checkout sessions and subscriptions. The service uses it to verify memberships with Stripe.</p>
      ${act(feed.payment_link ? "Update connection" : "Connect Stripe")}
    `,
    )}
    ${feed.payment_link ? form(base, hidden("payment_link", "") + hidden("key", "") + act("Disconnect Stripe"), 'data-confirm="Disconnect Stripe membership verification?"') : ""}
  `,
    "billing",
  );
}
function storyEditor(feed, story) {
  const base = pathFor(feed.slug);
  const link = safeLink(story.url);
  const original = story.original_title || story.title;
  const state = story.state;
  const editing = form(
    base + "/edit",
    `
    ${hidden("id", story.id)}
    ${field("Edition headline", "title", story.title, "required")}
    ${area("Curator’s note", "note", story.note, 'rows="3"')}
    <div class="actions">
      ${state === "live" ? act("Update live brief", { primary: true, state: "live" }) + act("Withdraw to drafts", { state: "draft" }) : state === "archived" ? act("Restore draft", { state: "draft" }) : act("Save draft", { state: "draft" }) + act("Publish brief", { primary: true, state: "live" })}
      ${state !== "archived" ? act("Archive", { state: "archived" }) : ""}
    </div>`,
    "data-story-edit",
  );
  const drafting = `<details class="ai-draft"><summary>Draft with OpenAI</summary>${form(
    base + "/generate",
    `
    ${hidden("id", story.id)}
    ${area("Your notes or authorized text", "evidence", story.evidence || "", 'required maxlength="3500" rows="3"')}
    <p class="field-help">Provide at least 25 words of material you own or have permission to process. You can edit the text for this request.</p>
    ${field("OpenAI API key", "key", "", 'type="password" required autocomplete="off" spellcheck="false"')}
    <p class="field-help">This request sends authorized source material to OpenAI using your key. The key is used for this request only. Review the proposed headline and note before saving.</p>
    ${act("Generate a draft")}
  `,
    "data-generate",
  )}</details>`;
  return `<article class="story-editor"><details><summary><span class="story-heading"><span class="state-label">${h(state === "live" ? "Published" : state === "archived" ? "Archived" : "Draft")} <span class="state-source">/ ${h(story.source)}</span></span><span class="story-title">${h(story.title)}</span></span></summary>
    <p class="source-credit">Original from ${h(story.source)}<br>${link ? `<a href="${link}" target="_blank" rel="noopener noreferrer">${h(original)}</a>` : h(original)}</p>
    ${editing}${drafting}</details></article>`;
}

export function studioPage(
  editions = [],
  selected,
  sources = [],
  stories = [],
  members = [],
  { origin = "", offset = 0, hasMore = false } = {},
) {
  if (!editions.length || !selected) {
    return shell(
      "Curator studio",
      `<div class="wrap studio">${notice}<section class="studio-intro"><p class="kicker"><span class="slug-mark" aria-hidden="true"></span>Curator studio</p><h1>Create an edition</h1><p>Your first edition starts as a private draft. Give it a name and a focus, then build your source list.</p></section><section class="panel first-edition">${newEdition()}</section></div>`,
      { studio: true },
    );
  }
  const path = deskPath(selected.slug);
  const pageOffset = Math.max(0, Number(offset) || 0);
  const selector = `<details class="edition-switch"><summary>Switch edition</summary><ul>${editions.map((ed) => `<li><a href="${deskPath(ed.slug)}"${ed.slug === selected.slug ? ' aria-current="page"' : ""}>${h(ed.name)}</a></li>`).join("")}</ul></details>`;
  return shell(
    "Curator studio",
    `<div class="wrap studio">${notice}
    <header class="studio-intro"><div class="edition-strap"><span class="kicker"><span class="slug-mark" aria-hidden="true"></span>Curator studio</span>${selector}</div>
    <h1>${h(selected.name)}</h1>
    <div class="studio-subhead"><span>${selected.visibility === "draft" ? "Private draft" : selected.visibility === "members" ? "Members-only edition" : "Public edition"}</span>${selected.visibility !== "draft" ? `<a href="/f/${encodeURIComponent(selected.slug)}">Open reader edition</a>` : ""}</div></header>
    <div class="studio-layout"><section class="inbox"><h2>Editorial inbox</h2>
    ${sharedLink(selected)}
    ${stories.length ? stories.map((story) => storyEditor(selected, story)).join("") : `<p class="empty-state">Your inbox is empty. Add a feed in Sources or save a shared story to start your first brief.</p>`}
    ${pageOffset > 0 || hasMore ? `<nav class="actions pagination" aria-label="Inbox pages">${pageOffset > 0 ? `<a class="secondary" href="${path}&amp;offset=${Math.max(0, pageOffset - 25)}">Previous briefs</a>` : ""}${hasMore ? `<a class="secondary" href="${path}&amp;offset=${pageOffset + 25}">Next briefs</a>` : ""}</nav>` : ""}
    </section><aside class="studio-rail"><h2>Edition desk</h2>${sourcesPanel(selected, sources)}${settings(selected)}${membersPanel(selected, members)}${billingPanel(selected, origin)}${panel("Create another edition", newEdition())}</aside></div>
  </div>`,
    { studio: true },
  );
}
