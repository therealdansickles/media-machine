# Media Machine

A source-first media and entertainment publication. Forward one story by email or
paste a link into the private editor inbox. The app reads the source, prepares a
concise brief, checks it against the source, and automatically publishes eligible
results with a link to the original reporting.

The publication includes summaries, key facts, qualified context, source dates
when available, section filters, full-text search, individual story pages, and RSS.
The private inbox supports edits, retries, manual publication, and unpublishing.
There are no fabricated popularity metrics, stock-image heroes, or n8n dependency.

## Run locally

Use Node.js 22.18+ or 24+.

```bash
npm ci
cp .env.example .env.local
```

Follow [the connection and cutover guide](docs/SETUP.md) to apply the database
migration and supply the server settings. Then run `npm run dev` and open
http://localhost:3000. The editor is at `/editor`.

Builds work without service credentials. Live importing, summaries, and email
forwarding require the corresponding services to be connected. Missing connections
are reported in the private editor; the public reader shows a retryable error.

## Processing

1. Form submissions and verified email events enter the private `editorial_inbox`.
2. A database lease claims each job once. URL fetching checks DNS/IP destinations
   and every redirect, pins the connection, and bounds time and response size.
3. Readability extracts plain source text. Short/unreadable pages require pasted
   text; the app does not bypass access controls or paywalls.
4. OpenAI produces a structured draft. Supporting excerpts must occur in the
   source, and a second model pass audits the brief for unsupported claims.
5. With `AUTO_PUBLISH=true`, relevant drafts without warnings publish. Flagged
   drafts stay private. These checks reduce errors; they do not guarantee accuracy.
6. Publication copies only the public fields into `published_stories` in one
   database transaction. Source text and supporting excerpts remain private.

Requests are processed after the response with Next.js `after`. Queued jobs survive
request failure. Interrupted processing can be recovered after a five-minute lease
using the editor's recovery button or the authenticated `/api/jobs/process` endpoint.
Configure an external schedule for unattended recovery. After five interrupted
attempts, a job requires an explicit retry from the inbox.

## Checks

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Tests cover source extraction, URL restrictions, session/signature validation,
summary evidence and quality gates, pagination, and real PostgreSQL migration/RLS/
queue/publication behavior using PGlite. All test stories are fixtures, not news.

The build fetches Fraunces from Google Fonts. In environments using system proxy
certificates, run the build with `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1`.

## Cutover notes

The migration is additive. Existing `articles` and n8n data are not deleted, but the
new reader intentionally reads only `published_stories`. Legacy stories need an
explicit editorial migration if they should appear in the new publication.

The external n8n workflow is not in this repository and has not been disabled.
Disable it during cutover once the new forwarding path is verified. See
[project status](PROJECT_STATUS.md) for current implementation and validation limits.
