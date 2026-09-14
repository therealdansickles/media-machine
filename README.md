# Media Machine

An entertainment-industry news reader built with Next.js, React, Tailwind CSS,
and Supabase. The feed shows active articles with source links, analyst summaries,
and extracted entities. Each article has a detail page and sharing controls.

## Local setup

Use Node.js 22.18+ (or Node.js 24+) to run the built-in TypeScript tests.

```bash
npm ci
cp .env.example .env.local
```

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to your project's
public connection settings, then run `npm run dev`. Open http://localhost:3000.
Never put a Supabase service-role key in a `NEXT_PUBLIC_` variable.

The app expects the existing `articles` table documented by `types/article.ts`.
This repository does not yet contain a database bootstrap migration or the n8n
workflow that populates it. Obtain those from the project owner when setting up a
new database. Public access must be constrained by Supabase row-level policies;
the application's `link_status = active` filters are not an access-control boundary.

Without database settings the app can still build. The feed shows a recoverable
error when it tries to load data, and the server logs identify missing settings.

## Feed behavior

- Fetches 12 active stories at a time, plus one lookahead row to detect another page.
- Orders by `created_at DESC, id DESC`. Pagination uses both values, preserving
  timestamp precision and avoiding offsets that shift when new stories arrive.
- Assumes UUID article IDs and non-null, stable creation timestamps.
- Failed requests preserve loaded stories and retry from the same cursor.
- Duplicate clicks are guarded; pending feed requests are cancelled on unmount.
- The article page and its metadata use the same active-story lookup. Missing or
  inactive stories show a 404; database failures show a retry screen.

## Checks

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Unit tests use the real Supabase client with fixture HTTP responses, without live
database access. Production builds fetch Fraunces from Google Fonts. In a proxy
environment that requires system certificates, Next.js supports running the build
with `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1`.

## Remaining buildout

See `PROJECT_STATUS.md` for the roadmap and the latest repository review. The social
pulse, creator rankings, box-office ticker, and context tooltip still contain sample
data. The submission box is not connected to a backend. The ingestion workflow and
live database configuration need a separate review before end-to-end validation.
