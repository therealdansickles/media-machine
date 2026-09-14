import assert from "node:assert/strict";
import test from "node:test";
import { Webhook } from "svix";
import { normalizeArticleUrl, isPublicAddress } from "../lib/editorial/url.ts";
import { extractHtml, requireSourceText } from "../lib/editorial/extract.ts";
import {
  checkDraft,
  eligibleForAutoPublish,
  summarizeSource,
} from "../lib/editorial/summarize.ts";
import { emailCandidates, verifyEmailEvent } from "../lib/editorial/email.ts";
import {
  createSession,
  validSession,
  SESSION_SECONDS,
} from "../lib/editorial/session.ts";

const sourceText = Array.from(
  { length: 10 },
  () =>
    "Example Studio announced a new distribution agreement with Example Cinema on Monday. The agreement covers six independent films and will begin in October. Financial terms were not disclosed. Both companies said the films would receive theatrical releases.",
).join(" ");
const draft = {
  headline: "Example Studio signs a distribution agreement for six films",
  summary:
    "Example Studio announced a distribution agreement with Example Cinema covering six independent films. According to the announcement, the agreement begins in October and includes theatrical releases. The companies did not disclose financial terms. The arrangement sets out a release route for the films, while leaving the financial structure of the agreement unspecified. No additional commercial terms were provided in the source.",
  key_points: [
    {
      text: "The agreement covers six independent films.",
      evidence:
        "The agreement covers six independent films and will begin in October.",
    },
    {
      text: "The companies did not disclose financial terms.",
      evidence: "Financial terms were not disclosed.",
    },
  ],
  why_it_matters:
    "The agreement could provide a theatrical route for the six independent films, while its financial structure remains undisclosed.",
  section: "Film",
  entities: ["Example Studio", "Example Cinema"],
  is_relevant: true,
  warnings: [],
};

test("normalizes tracking URLs for deduplication without stripping article identifiers", () => {
  assert.equal(
    normalizeArticleUrl(
      "https://example.com/story?id=2&utm_source=email&fbclid=x#top",
    ),
    "https://example.com/story?id=2",
  );
  assert.notEqual(
    normalizeArticleUrl("https://example.com/story?id=2"),
    normalizeArticleUrl("https://example.com/story?id=3"),
  );
});

test("rejects local, mapped, reserved and credential-bearing targets", () => {
  for (const address of [
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "100.64.0.1",
    "192.168.1.1",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "fe80::1",
    "0.0.0.0",
    "224.0.0.1",
  ])
    assert.equal(isPublicAddress(address), false, address);
  assert.equal(isPublicAddress("8.8.8.8"), true);
  for (const url of [
    "file:///etc/passwd",
    "http://localhost/a",
    "http://127.1/a",
    "http://2130706433/a",
    "http://[::1]/a",
    "http://site.internal/a",
    "https://user:pass@example.com/a",
    "https://example.com:8080/a",
  ])
    assert.throws(() => normalizeArticleUrl(url), undefined, url);
});

test("extracts plain article text and source metadata without executing publisher scripts", () => {
  const html = `<html><head><title>Distribution deal</title><meta property="og:site_name" content="Example Wire"><meta property="article:published_time" content="2026-09-14T12:00:00Z"></head><body><nav>Subscribe Subscribe</nav><article><h1>Distribution deal</h1>${Array.from({ length: 6 }, () => `<p>${sourceText}</p>`).join("")}</article><script>globalThis.hacked = true</script></body></html>`;
  const source = extractHtml(html, "https://example.com/story");
  assert.equal(source.publication, "Example Wire");
  assert.equal(source.publishedAt, "2026-09-14T12:00:00.000Z");
  assert.ok(source.text.includes("six independent films"));
  assert.ok(!source.text.includes("globalThis.hacked"));
  assert.throws(
    () => requireSourceText("Subscribe to read this article."),
    /Not enough article text/,
  );
});

test("requires exact supporting passages and gates automatic publication on relevance and warnings", () => {
  assert.equal(checkDraft(draft, sourceText).headline, draft.headline);
  assert.throws(
    () =>
      checkDraft(
        {
          ...draft,
          key_points: [
            {
              ...draft.key_points[0],
              evidence: "The studio paid two billion dollars for these films.",
            },
            draft.key_points[1],
          ],
        },
        sourceText,
      ),
    /could not be verified/,
  );
  assert.equal(eligibleForAutoPublish(draft), true);
  assert.equal(eligibleForAutoPublish({ ...draft, is_relevant: false }), false);
  assert.equal(
    eligibleForAutoPublish({ ...draft, warnings: ["Unverified valuation"] }),
    false,
  );
});

test("runs a separate source audit and holds flagged briefs", async () => {
  const old = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  let calls = 0;
  try {
    const result = await summarizeSource(
      {
        url: "https://example.com/story",
        publication: "Example Wire",
        title: "Deal",
        publishedAt: null,
        text: sourceText,
      },
      async (url, init) => {
        assert.equal(url, "https://api.openai.com/v1/responses");
        const request = JSON.parse(init.body);
        assert.equal(request.store, false);
        assert.equal(request.text.format.strict, true);
        const payload =
          calls++ === 0
            ? draft
            : { concerns: ["The headline needs a source attribution check."] };
        return Response.json({
          status: "completed",
          output: [
            {
              type: "message",
              content: [{ type: "output_text", text: JSON.stringify(payload) }],
            },
          ],
        });
      },
    );
    assert.equal(calls, 2);
    assert.equal(eligibleForAutoPublish(result), false);
    assert.match(result.warnings[0], /source attribution/);
  } finally {
    if (old === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = old;
  }
});

test("incomplete model output never becomes a draft", async () => {
  const old = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  try {
    await assert.rejects(
      summarizeSource(
        {
          url: "https://example.com/story",
          publication: "Example",
          title: "",
          publishedAt: null,
          text: sourceText,
        },
        async () => Response.json({ status: "incomplete", output: [] }),
      ),
      /did not finish/,
    );
  } finally {
    if (old === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = old;
  }
});

test("forwarded email links are deduplicated and multiple story candidates remain explicit", () => {
  assert.deepEqual(
    emailCandidates(
      "Read https://example.com/story?utm_source=email",
      '<a href="https://example.com/story">Read</a><a href="https://example.com/unsubscribe">Unsubscribe</a>',
    ),
    ["https://example.com/story"],
  );
  assert.equal(
    emailCandidates("https://example.com/one https://example.com/two", "")
      .length,
    2,
  );
});

test("email webhook rejects tampering and accepts a valid signed event", () => {
  const secret =
    "whsec_" +
    Buffer.from("a-long-test-secret-for-svix-123456").toString("base64");
  const body = JSON.stringify({
    type: "email.received",
    data: { email_id: "00000000-0000-4000-8000-000000000001" },
  });
  const timestamp = new Date(),
    id = "msg_test";
  const signature = new Webhook(secret).sign(id, timestamp, body);
  const headers = new Headers({
    "svix-id": id,
    "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
    "svix-signature": signature,
  });
  assert.equal(verifyEmailEvent(body, headers, secret).type, "email.received");
  assert.throws(() => verifyEmailEvent(body + " ", headers, secret));
});

test("editor sessions expire and cannot be forged or reused after secret rotation", () => {
  const now = Date.now(),
    secret = "random-long-private-editor-secret-123456789";
  const token = createSession(secret, now);
  assert.equal(validSession(token, secret, now), true);
  assert.equal(validSession(token + "x", secret, now), false);
  assert.equal(
    validSession(token, secret, now + SESSION_SECONDS * 1000),
    false,
  );
  assert.equal(validSession(token, secret + "rotated", now), false);
});
