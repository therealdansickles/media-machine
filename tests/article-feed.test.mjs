import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import { ARTICLE_PAGE_SIZE, fetchArticlePage } from "../lib/article-feed.ts";

const stamp = "2026-09-14T12:00:00.123456+00:00";
const makeArticle = (n) => ({
  id: `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`,
  created_at: stamp,
  headline: `Story ${n}`,
  source_name: "Test source",
  link_status: "active",
  analyst_summary: null,
  image_url: null,
});

function clientWithFetch(fetch) {
  return createClient("https://test.supabase.co", "test-public-key", {
    global: { fetch },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

test("pages through timestamp ties even when a new story arrives between requests", async () => {
  let rows = Array.from({ length: 25 }, (_, index) => makeArticle(25 - index));
  const seenRequests = [];
  const client = clientWithFetch(async (input) => {
    const params = new URL(input).searchParams;
    seenRequests.push(params);
    assert.equal(params.get("link_status"), "eq.active");
    assert.equal(params.get("order"), "created_at.desc,id.desc");
    const filter = params.get("or");
    // All fixture rows share a timestamp; the second part of the cursor filter
    // must continue below the last seen UUID, preserving sub-millisecond time.
    const boundary = filter?.match(/id\.lt\.([0-9a-f-]+)/)?.[1];
    if (filter) assert.ok(filter.includes(stamp));
    const selected = boundary ? rows.filter((row) => row.id < boundary) : rows;
    return Response.json(selected.slice(0, Number(params.get("limit"))));
  });

  const first = await fetchArticlePage(client);
  assert.equal(first.articles.length, ARTICLE_PAGE_SIZE);
  assert.equal(first.nextCursor.id, makeArticle(14).id);
  rows = [makeArticle(26), ...rows];
  const second = await fetchArticlePage(client, first.nextCursor);
  const third = await fetchArticlePage(client, second.nextCursor);
  const ids = [...first.articles, ...second.articles, ...third.articles].map(
    (row) => row.id,
  );
  assert.deepEqual(
    ids,
    Array.from({ length: 25 }, (_, i) => makeArticle(25 - i).id),
  );
  assert.equal(third.nextCursor, null);
  assert.equal(seenRequests.length, 3);
});

test("uses an exclusive older-timestamp filter as well as an ID tie breaker", async () => {
  const cursor = { createdAt: stamp, id: makeArticle(14).id };
  const client = clientWithFetch(async (input) => {
    assert.equal(
      new URL(input).searchParams.get("or"),
      `(created_at.lt.${stamp},and(created_at.eq.${stamp},id.lt.${cursor.id}))`,
    );
    return Response.json([]);
  });
  assert.equal((await fetchArticlePage(client, cursor)).nextCursor, null);
});

test("empty and exactly-full final pages do not offer another load", async () => {
  for (const count of [0, ARTICLE_PAGE_SIZE]) {
    const client = clientWithFetch(async () =>
      Response.json(Array.from({ length: count }, (_, i) => makeArticle(i))),
    );
    const result = await fetchArticlePage(client);
    assert.equal(result.articles.length, count);
    assert.equal(result.nextCursor, null);
  }
});

test("database errors reject rather than masquerading as an empty feed", async () => {
  const client = clientWithFetch(async () =>
    Response.json({ message: "Unavailable" }, { status: 503 }),
  );
  await assert.rejects(fetchArticlePage(client), /Unavailable/);
});

test("invalid cursor values are rejected before a request is sent", async () => {
  const client = clientWithFetch(() => {
    throw new Error("Should not fetch");
  });
  await assert.rejects(
    fetchArticlePage(client, { createdAt: stamp, id: "bad),id.gt.0" }),
    /Invalid article cursor/,
  );
  await assert.rejects(
    fetchArticlePage(client, { createdAt: "yesterday", id: makeArticle(1).id }),
    /Invalid article cursor/,
  );
});

test("passes cancellation to the request", async () => {
  const controller = new AbortController();
  const client = clientWithFetch(async (_input, init) => {
    assert.equal(init.signal, controller.signal);
    controller.abort();
    init.signal.throwIfAborted();
  });
  await assert.rejects(
    fetchArticlePage(client, null, controller.signal),
    /abort/i,
  );
});

test("Supabase module can load without environment settings; initialization gives an actionable error", async () => {
  const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const oldKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  try {
    const { getSupabase } = await import("../lib/supabase.ts");
    assert.throws(() => getSupabase(), /Missing NEXT_PUBLIC_SUPABASE_URL/);
  } finally {
    if (oldUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
    if (oldKey !== undefined)
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = oldKey;
  }
});
