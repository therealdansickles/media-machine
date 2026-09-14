# Validation record

September 14, 2026. Next.js 16.3.5, Node.js 24.

## Automated checks

- `npm test`: 17 tests pass.
- `npm run lint`: passes.
- `npm run typecheck`: passes.
- Production build passes with the environment's system TLS certificate option.
- `npm audit --omit=dev`: zero known vulnerabilities reported at validation time.

The tests include PostgreSQL execution of the actual migration through PGlite:
private/public access policies, duplicate rejection, exclusive job claims, expired
lease recovery, idempotent publication, transaction rollback on failure, unpublishing,
and replacing a corrected source URL. Other tests cover source extraction, local/
reserved address rejection, structured draft validation and evidence matching,
model-audit quality holds, incomplete responses, email link selection and signature
verification, session expiry/tampering, and cursor pagination.

## Browser checks

Ran Chromium against the app with a local PostgreSQL-backed Supabase REST adapter
and simulated OpenAI responses. No real API calls or production data were used.

Verified:
- Server-rendered reader, pagination, section filters, and full-text search.
- Editor sign-in and same-host origin validation, including a rejected foreign origin.
- Source-text submission through the actual API, queued processing, generation,
  audit, and automatic publication.
- Editing a published headline, saving it, and explicitly updating the public brief.
- Original-source link and public article rendering.
- Unpublishing and subsequent 404 on the public article route.
- Anonymous requests to the private inbox return 401.
- RSS generation.
- Mobile width and visual checks in light and dark themes.

The browser test found and resolved an origin-check mismatch caused by Next.js
using an internal request URL. The app compares Origin to Host and requires HTTPS
in production. A database regression test also covers preserving a corrected source
link when a previously unpublished brief is republished.

## Live validation still required

Real OpenAI output quality, publisher extraction behavior, live Resend delivery,
production Supabase policies/configuration, provider retries, hosting duration and
background-job support, DNS, and the external recovery schedule remain unverified.
The live acceptance procedure is in `SETUP.md`. Model audits can miss errors; this
record does not establish the factual quality of real generated briefs.
