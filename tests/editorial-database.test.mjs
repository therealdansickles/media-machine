import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const migration = await readFile(
  new URL(
    "../supabase/migrations/202609140001_editorial_inbox.sql",
    import.meta.url,
  ),
  "utf8",
);
const draft = {
  headline: "A source-grounded headline",
  summary: "A concise sourced summary for the public reader.",
  key_points: [
    { text: "First public fact.", evidence: "A private supporting excerpt." },
    { text: "Second public fact.", evidence: "Another private excerpt." },
  ],
  why_it_matters: "An explicitly qualified interpretation.",
  section: "Film",
  entities: ["Example Studio"],
  is_relevant: true,
  warnings: [],
};

test("migration, privacy, queue leases, atomic/idempotent publication and unpublishing", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role bypassrls;",
    );
    await db.exec(migration);
    const {
      rows: [story],
    } = await db.query(
      "insert into editorial_inbox (original_url,origin) values ('https://example.com/story','form') returning id",
    );
    await assert.rejects(
      db.query(
        "insert into editorial_inbox (original_url,origin) values ('https://example.com/story','form')",
      ),
      /duplicate key/,
    );
    const claim = await db.query("select * from claim_editorial_story($1)", [
      story.id,
    ]);
    assert.equal(claim.rows[0].status, "processing");
    assert.ok(claim.rows[0].processing_token);
    assert.equal(
      (await db.query("select * from claim_editorial_story($1)", [story.id]))
        .rows.length,
      0,
    );
    await db.query(
      "update editorial_inbox set processing_started_at = now() - interval '6 minutes' where id=$1",
      [story.id],
    );
    const nextClaim = await db.query(
      "select * from claim_editorial_story($1)",
      [story.id],
    );
    assert.notEqual(
      nextClaim.rows[0].processing_token,
      claim.rows[0].processing_token,
    );
    await db.query(
      "update editorial_inbox set status='ready',source_text='PRIVATE FULL SOURCE',source_name='Example Wire',draft=$2 where id=$1",
      [story.id, JSON.stringify(draft)],
    );
    await db.query("select publish_editorial_story($1)", [story.id]);
    const firstPublication = (
      await db.query("select created_at from published_stories where id=$1", [
        story.id,
      ])
    ).rows[0].created_at;
    await db.query("select publish_editorial_story($1)", [story.id]);
    assert.equal(
      (await db.query("select count(*)::int as count from published_stories"))
        .rows[0].count,
      1,
    );
    assert.equal(
      (
        await db.query("select created_at from published_stories where id=$1", [
          story.id,
        ])
      ).rows[0].created_at.toISOString(),
      firstPublication.toISOString(),
    );
    await db.exec("set role anon");
    const publicRows = await db.query("select * from published_stories");
    assert.deepEqual(publicRows.rows[0].key_points, [
      "First public fact.",
      "Second public fact.",
    ]);
    assert.ok(!JSON.stringify(publicRows.rows).includes("PRIVATE FULL SOURCE"));
    assert.ok(!JSON.stringify(publicRows.rows).includes("private supporting"));
    await assert.rejects(
      db.query("select * from editorial_inbox"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select publish_editorial_story($1)", [story.id]),
      /permission denied/,
    );
    await db.exec("reset role");
    await db.query("select unpublish_editorial_story($1)", [story.id]);
    await db.exec("set role anon");
    assert.equal(
      (await db.query("select * from published_stories")).rows.length,
      0,
    );
    await db.exec("reset role");
    await db.query("update editorial_inbox set draft=$2 where id=$1", [
      story.id,
      JSON.stringify({ ...draft, section: "Invalid section" }),
    ]);
    await assert.rejects(
      db.query("select publish_editorial_story($1)", [story.id]),
      /check constraint/,
    );
    assert.equal(
      (
        await db.query("select status from editorial_inbox where id=$1", [
          story.id,
        ])
      ).rows[0].status,
      "ready",
    );
    assert.equal(
      (
        await db.query(
          "select link_status from published_stories where id=$1",
          [story.id],
        )
      ).rows[0].link_status,
      "inactive",
    );
    await db.query("update editorial_inbox set original_url=$2,draft=$3 where id=$1", [story.id, 'https://example.com/corrected-source', JSON.stringify(draft)]);
    await db.query('select publish_editorial_story($1)', [story.id]);
    assert.equal((await db.query('select original_url from published_stories where id=$1', [story.id])).rows[0].original_url, 'https://example.com/corrected-source');
  } finally {
    await db.close();
  }
});
