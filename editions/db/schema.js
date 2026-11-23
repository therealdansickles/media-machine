import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/sqlite-core";

export const editions = sqliteTable(
  "editions",
  {
    slug: text().primaryKey(),
    owner: text().notNull(),
    name: text().notNull(),
    description: text().notNull(),
    byline: text().notNull(),
    visibility: text().notNull().default("draft"),
    sponsor_name: text(),
    sponsor_url: text(),
    sponsor_copy: text(),
    sponsor_until: text(),
    checkout_url: text(),
    payment_link: text(),
    billing_key: text(),
    draft_key: text(),
    draft_limit: integer().notNull().default(0),
    draft_day: text().notNull().default(""),
    drafts_used: integer().notNull().default(0),
    created_at: integer().notNull(),
  },
  (t) => [index("editions_owner").on(t.owner)],
);
export const sources = sqliteTable(
  "sources",
  {
    id: text().primaryKey(),
    edition: text()
      .notNull()
      .references(() => editions.slug),
    url: text().notNull(),
    label: text().notNull(),
    mode: text().notNull(),
    auto_links: integer().notNull(),
    next_check: integer().notNull().default(0),
    last_checked: integer(),
    status: text().notNull().default("Waiting"),
    etag: text(),
    modified: text(),
  },
  (t) => [
    uniqueIndex("source_per_edition").on(t.edition, t.url),
    index("sources_due").on(t.next_check),
  ],
);
export const stories = sqliteTable(
  "stories",
  {
    id: text().primaryKey(),
    edition: text()
      .notNull()
      .references(() => editions.slug),
    url: text().notNull(),
    source: text().notNull(),
    original_title: text().notNull(),
    automation: text(),
    evidence: text(),
    title: text().notNull(),
    note: text().notNull(),
    state: text().notNull(),
    members_only: integer().notNull().default(0),
    source_date: text(),
    published_at: text(),
    created_at: integer().notNull(),
  },
  (t) => [
    uniqueIndex("story_per_edition").on(t.edition, t.url),
    index("stories_edition_state").on(t.edition, t.state, t.published_at),
  ],
);
export const members = sqliteTable(
  "members",
  {
    edition: text()
      .notNull()
      .references(() => editions.slug),
    email: text().notNull(),
    expires: integer(),
    subscription: text(),
    payment_link: text(),
    revoked: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.edition, t.email] })],
);
