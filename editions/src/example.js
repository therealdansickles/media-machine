export const example = {
  slug: "independent-film-desk",
  name: "Independent Film Desk",
  description:
    "Festival deadlines, release windows and distribution decisions for people making independent films.",
  byline: "Media Machine editors",
  visibility: "public",
};
export const exampleStories = [
  {
    title: "Two Sundance documentaries, two November release paths",
    note: "Nuisance Bear opened in select theaters before a planned December expansion. When A Witness Recants went to HBO and HBO Max in November. The two releases give producers a concrete comparison from the same festival.",
    source: "Sundance Institute",
    published_at: "2026-11-06",
    url: "https://www.sundance.org/blogs/release-rundown-what-to-watch-in-november-from-when-a-witness-recants-to-josephine/",
  },
  {
    title: "Tribeca’s feature deadline leaves room for a December cut",
    note: "Tribeca lists December 16, 2026 as its final feature deadline for the June festival. It accepts clearly marked works in progress, giving a team finishing its mix a way to submit while preserving its New York State premiere.",
    source: "Tribeca Festival",
    published_at: "2026-09-30",
    url: "https://tribecafilm.com/festival/submissions",
  },
  {
    title: "The four-week digital sales window behind Columbus",
    note: "Archive · The Columbus team had roughly four weeks between the end of its theatrical holdback and its Hulu debut. Nearly 60% of its iTunes sales came in that interval, a detail worth bringing into a windowing negotiation.",
    source: "Sundance Institute",
    published_at: null,
    url: "https://www.sundance.org/case-studies/creative-distribution/columbus/",
  },
];

// Initial editorial material is source-controlled. The publication also follows a
// public publisher feed in link-only mode. Seeding is safe across concurrent sweeps.
export async function ensureExample(db) {
  const exists = await db
    .prepare("SELECT id FROM sources WHERE id=?")
    .bind("sample-sundance")
    .first();
  if (exists) return;
  const e = example;
  const seed = [
    db
      .prepare(
        "INSERT OR IGNORE INTO editions(slug,owner,name,description,byline,visibility,created_at) VALUES(?,'reserved:editorial',?,?,?,'public',0)",
      )
      .bind(e.slug, e.name, e.description, e.byline),
  ];
  for (const [i, s] of exampleStories.entries()) {
    seed.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO stories(id,edition,url,source,original_title,title,note,state,source_date,published_at,created_at)
      VALUES(?,?,?,?,?,?,?,'live',?,?,0)`,
        )
        .bind(
          "sample-brief-" + i,
          e.slug,
          s.url,
          s.source,
          s.title,
          s.title,
          s.note,
          s.published_at,
          s.published_at,
        ),
    );
  }
  seed.push(
    db
      .prepare(
        "INSERT OR IGNORE INTO sources(id,edition,url,label,mode,auto_links) VALUES('sample-sundance',?,?,'Sundance Institute','links',1)",
      )
      .bind(e.slug, "https://www.sundance.org/feed/"),
  );
  await db.batch(seed);
}
