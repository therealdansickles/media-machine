import { escapeHtml as h, shell } from "./public-pages.js";

export function capturePage() {
  return shell("Save a story", `<section class="wrap studio guide"><p class="kicker">Curator studio</p>
    <h1>Save a story</h1><p>Bring a public article link into your edition. Add your headline and dictate or type a note before publishing.</p>
    <form class="panel" id="capture-link"><label>Public article link<input type="url" name="url" required placeholder="https://" maxlength="2048"></label>
    <button class="primary">Continue to studio</button><p role="status" data-capture-status></p></form>
    <p><a href="/studio">Open studio</a> · <a href="/guide#phone">Set up iPhone sharing</a></p></section>`);
}

export function guide(origin) {
  const bookmark = "javascript:" + encodeURIComponent("void(window.open(" + JSON.stringify(origin + "/capture#") + "+new URLSearchParams({url:location.href,title:document.title}),'_blank','noopener,noreferrer'))");
  return shell("Curator guide", `<article class="wrap guide message-page"><p class="kicker">Curator guide</p><h1>Run your edition</h1>
    <h2>Your first edition</h2><p>Choose a permanent address and byline. In Sources, add a public RSS or Atom feed, or paste a Substack publication address. New links go to your inbox for review. Open a story, add a headline and your take, then publish the brief.</p>
    <p>Your edition starts private. In Publication settings choose Public and save, then use Open reader edition to get the address readers can share or follow with RSS.</p><a class="primary" href="/studio">Open curator studio</a>
    <h2 id="phone">Save from your phone</h2><p>Bookmark <a href="/capture">Save a story</a> to paste links from any app. For Safari’s share sheet, set up this Apple Shortcut once:</p>
    <ol><li>In Shortcuts, create a shortcut named <strong>Save to Media Machine</strong>. In Details, turn on <strong>Show in Share Sheet</strong>. Set its input to URLs.</li>
    <li>Add a <strong>Text</strong> action. Paste the prefix below, then insert the <strong>Shortcut Input</strong> variable immediately after the # with no space.</li></ol>
    <code class="claim-address">${h(origin)}/capture#</code>
    <ol start="3"><li>Add <strong>Open URLs</strong> with the Text result as its input. Save the shortcut.</li>
    <li>In Safari, share an article and choose your shortcut. Check the link, continue to Studio, pick an edition, and use the keyboard microphone for your note. Choose Save to inbox or Publish brief.</li></ol>
    <h2>Save from a desktop browser</h2><p>Drag <a class="secondary" href="${h(bookmark)}">Save to Media Machine</a> to your bookmarks bar. Click it on an article to bring its link and title into Studio. If the publisher blocks bookmarklets, use <a href="/capture">Save a story</a>.</p>
    <h2>Offer member briefs</h2><p>Keep your edition public and select <strong>Members only</strong> on individual briefs. Their headlines, notes and links stay out of public RSS. Previously public copies can remain in readers’ apps. To restrict the entire edition, choose Members in Publication settings.</p>
    <p>Set the price in your own checkout. For automatic access, use a recurring Stripe Payment Link and follow Stripe subscription setup in Studio, including its return address. For a manual sale, grant the buyer’s sign-in email access under Reader memberships. You can test a weekly specialist brief at $6/month.</p>
    <h2>Feature a sponsor</h2><p>Agree on a placement period and fee directly with the sponsor. Enter the name, approved message and destination in Publication settings. Use a campaign link to measure clicks with your sponsor. Choose the final day to have the placement end automatically.</p>
    <p>There’s no creator subscription fee in this release. Optional AI drafting uses your own OpenAI account. <a href="/publishing">Publishing and permissions</a></p>
    </article>`);
}
