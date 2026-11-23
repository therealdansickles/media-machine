const escapes = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => escapes[char]);
}

function externalUrl(value) {
  try {
    const url = new URL(value);
    if (
      ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    ) {
      return escapeHtml(url.href);
    }
  } catch {
    // A missing or malformed destination should never become an interactive link.
  }
  return "";
}

const mark = '<span class="wordmark">MEDIA <b>/</b> MACHINE</span>';
const editionPath = (slug) => "/f/" + encodeURIComponent(String(slug ?? ""));

export function shell(title, body, { studio = false, rssPath = "" } = {}) {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light"><meta name="theme-color" content="#f6f5ed">
<meta name="referrer" content="no-referrer">
<title>${escapeHtml(title)} · Media Machine Editions</title>
<link rel="stylesheet" href="/style.css">
<script type="module" src="/sharing.js"></script>
${rssPath ? `<link rel="alternate" type="application/rss+xml" href="${escapeHtml(rssPath)}" title="${escapeHtml(title)}">` : ""}
${studio ? '<script type="module" src="/studio.js"></script>' : ""}
</head><body>
<a class="skip" href="#content">Skip to content</a>
<header class="topbar"><nav class="wrap bar-inner" aria-label="Main navigation">
<a class="brand" href="/">${mark}<span class="brand-editions">Editions</span></a>
<div class="bar-links"><a class="archive-link" href="https://www.mediamachine.app">Entertainment desk</a><a class="studio-nav" href="/studio"${studio ? ' aria-current="page"' : ""}>Curator studio</a></div>
</nav></header>
<main id="content">${body}</main>
<footer><div class="wrap foot-inner"><a class="brand" href="/">${mark}<span class="brand-editions">Editions</span></a><span><a href="/publishing">Publishing &amp; corrections</a> · <a href="https://www.mediamachine.app">Original publication</a></span></div></footer>
</body></html>`;
}

function timeLabel(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const iso = date.toISOString().split("T")[0];
  const text = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
  return `<time datetime="${iso}">${text}</time>`;
}

function compactCover(feed, stories) {
  const path = editionPath(feed.slug);
  return `<aside class="cover-scene" aria-label="Featured edition">
  <div class="print-cover">
    <div class="print-strap"><span class="registration" aria-hidden="true"></span><span>Featured edition</span><span class="press-bars" aria-hidden="true"></span></div>
    <h2 class="cover-title"><a href="${path}">${escapeHtml(feed.name)}</a></h2>
    ${feed.description ? `<p class="cover-deck">${escapeHtml(feed.description)}</p>` : ""}
    <ul class="cover-contents">${stories
      .slice(0, 2)
      .map(
        (story) =>
          `<li><span class="cover-source">${escapeHtml(story.source)}</span><p>${escapeHtml(story.title)}</p></li>`,
      )
      .join("")}</ul>
    <a class="cover-open" href="${path}">Read the edition</a>
  </div></aside>`;
}

export function homePage(example, stories = []) {
  return shell(
    "Create a specialist newsfeed",
    `<div class="wrap">
    <section class="home-spread"><div class="home-intro">
      <p class="kicker"><span class="slug-mark" aria-hidden="true"></span>Independent publishing</p>
      <h1>The newsfeed<br>only <em>you</em> could edit.</h1>
      <p class="intro-copy">Turn the sources you follow into a publication of your own. Pick the stories, add your take, and give readers one place to follow your beat.</p>
      <div class="actions"><a class="primary" href="/studio">Create an edition</a>${example ? `<a class="plain-link" href="${editionPath(example.slug)}">Read a sample</a>` : ""}</div>
    </div>${example ? compactCover(example, stories) : ""}</section>
    <section class="workflow"><h2>Inside the studio</h2><div class="workflow-grid">
      <article><h3>Follow your beat</h3><p>Bring in RSS feeds or add a story link when someone shares a piece worth saving.</p></article>
      <article><h3>Write the brief</h3><p>Give each pick a headline and a short note explaining why your readers should open the original.</p></article>
      <article><h3>Find your audience</h3><p>Share a public edition, feature a sponsor, or offer a members-only feed.</p></article>
    </div><p><a class="plain-link" href="/guide">Read the curator guide</a></p></section>
  </div>`,
  );
}

function storyCard(story, index) {
  const target = externalUrl(story.url);
  const title = escapeHtml(story.title);
  const source = escapeHtml(story.source);
  const date = timeLabel(story.published_at);
  return `<article class="brief${index === 0 ? " lead-brief" : ""}">
    <div class="brief-meta">${source ? `<span>${source}</span>` : ""}${date}</div>
    <div class="brief-text"><h2>${target ? `<a href="${target}">${title}</a>` : title}</h2>
    ${story.note ? `<p>${escapeHtml(story.note)}</p>` : ""}
    ${target ? `<a class="original" href="${target}" aria-label="Read original: ${title}">Read original</a>` : ""}</div>
  </article>`;
}

function sponsorBlock(feed) {
  if (!feed.sponsor_name || (feed.sponsor_until && feed.sponsor_until < new Date().toISOString().slice(0,10))) return "";
  const name = escapeHtml(feed.sponsor_name);
  const destination = externalUrl(feed.sponsor_url);
  return `<aside class="sponsor" aria-label="Paid sponsorship"><span class="kicker">Sponsor</span><div><strong>${destination ? `<a href="${destination}" rel="sponsored nofollow">${name}</a>` : name}</strong>${feed.sponsor_copy ? `<p>${escapeHtml(feed.sponsor_copy)}</p>` : ""}</div></aside>`;
}

export function readerPage(
  feed,
  stories = [],
  { locked = false, offer = false, member = false, loginUrl = null } = {},
) {
  const path = editionPath(feed.slug);
  const checkout = externalUrl(feed.checkout_url);
  let contents;
  if (locked) {
    contents = `<section class="access-panel"><p class="kicker">Members only</p><h2>Read this edition</h2>
      <p>${checkout ? "After payment, use the same email address to sign in and read the edition." : "Access is linked to the email address on your membership. Contact the curator if you need access."}</p>
      <div class="actions">${checkout ? `<a class="primary" href="${checkout}" rel="nofollow">Subscribe to this edition</a>` : ""}${typeof loginUrl === "string" && /^\/(?![\/\\])/.test(loginUrl) ? `<a class="secondary" href="${escapeHtml(loginUrl)}" target="_top">Member sign-in</a>` : ""}</div></section>`;
  } else {
    const briefs = stories.filter((story) => story.note),
      links = stories.filter((story) => !story.note);
    contents =
      briefs.length && links.length
        ? `<section class="brief-list" aria-label="Editorial briefs"><h2 class="desk-section">Editorial briefs</h2>${briefs.map(storyCard).join("")}</section><section class="brief-list" aria-label="Source wire"><h2 class="desk-section">Source wire</h2>${links.map(storyCard).join("")}</section>`
        : stories.length
          ? `<section class="brief-list" aria-label="Published briefs">${stories.map(storyCard).join("")}</section>`
          : '<p class="empty-state">The first brief has yet to be published.</p>';
  }
  return shell(
    feed.name,
    `<div class="wrap reader">
    <header class="edition-head"><div class="edition-strap"><span class="kicker"><span class="slug-mark" aria-hidden="true"></span>${locked || member ? "Member edition" : "Independent edition"}</span>
    <div class="actions">${feed.visibility !== "draft" ? '<button type="button" class="secondary" data-share-edition>Share edition</button><span role="status" data-share-status></span>' : ""}${!locked && !member ? `<a class="rss-link" href="${path}/rss.xml">RSS feed</a>` : ""}</div></div>
    <h1>${escapeHtml(feed.name)}</h1>
    ${feed.description ? `<p class="edition-description">${escapeHtml(feed.description)}</p>` : ""}
    ${feed.byline ? `<p class="edition-byline">Edited by ${escapeHtml(feed.byline)}</p>` : ""}</header>
    ${sponsorBlock(feed)}${offer ? `<aside class="access-panel"><h2>Member briefs</h2><p>Members can read additional briefs from this desk.</p><div class="actions">${checkout ? `<a class="primary" href="${checkout}" rel="nofollow">Get membership</a>` : ""}${loginUrl ? `<a class="secondary" target="_top" href="${escapeHtml(loginUrl)}">Member sign-in</a>` : ""}</div></aside>` : ""}${contents}
    <p><a class="plain-link" href="/studio">Create your own edition</a></p>
  </div>`,
    { rssPath: feed.visibility === "public" ? path + "/rss.xml" : "" },
  );
}

export function errorPage(message) {
  return shell(
    "Edition unavailable",
    `<section class="wrap message-page"><p class="kicker">Media Machine Editions</p><h1>Edition unavailable</h1><p>${escapeHtml(message)}</p><a class="secondary" href="/">Back to Editions</a></section>`,
  );
}
