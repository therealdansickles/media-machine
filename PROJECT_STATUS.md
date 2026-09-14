# Media Machine status

Updated September 14, 2026.

## Product direction

Forward stories into a private editorial inbox. Publish concise, source-grounded
media and entertainment briefs automatically when quality checks pass. Keep source
links prominent and hold unreadable or flagged items for correction.

## Implemented

- Native form and signed inbound-email intake; no n8n dependency in the new path.
- Private inbox, public briefs, additive migration, public read policies, and
  service-only claim/publish/unpublish functions.
- Durable queue, job leases, duplicate handling, recovery endpoint and manual retry.
- Bounded source extraction, public-network-only destinations, and pasted-text fallback.
- Structured summaries, source-excerpt checks, separate model audit, and automatic
  publication with relevance/warning gates.
- Signed editor sessions, same-origin mutation checks, editing and publication controls.
- Rebuilt reader with summaries, key facts, why-it-matters context, actual attribution,
  source dates, section filters, full-text search, pagination, article pages and sharing.
- RSS, sitemap, robots rules, About page, and a real icon asset.
- Removed sample social/creator/box-office widgets, fake context tooltips, dead submission
  UI, showtimes embed, and unrelated stock-image heroes.

## Connection work still required

- Apply the migration to the chosen Supabase environment.
- Set service credentials and a random editor key on the host.
- Configure the forwarding address, allowed senders, and signed receiving webhook.
- Configure periodic queue recovery and the public site origin.
- Evaluate real forwarded stories and their generated briefs.
- Disable the external n8n workflow during cutover; it was not accessible here.

## Boundaries

Legacy database content is preserved but is not automatically republished. The source
URL is normalized for tracking parameters; distinct URLs reporting the same event are
not yet clustered. Article and email bodies are not republished. Ambiguous emails and
unreadable pages require source selection/text. Automated audits reduce error risk
but cannot establish that every generated claim is correct.

The current editor is for one owner. Multi-user roles, correction history, event
clustering, additional-source corroboration, and newsletter distribution are future
work. RSS returns the latest 100 stories; the initial sitemap covers 1,000 stories.

See `docs/SETUP.md` for the connection, acceptance, and cutover procedure.

## Validation completed

Seventeen automated tests, TypeScript, ESLint, and the production build pass on
Next.js 16.3.5. The production dependency audit reports no known vulnerabilities.
A Chromium run using a local PostgreSQL-backed API adapter and simulated AI responses
passed the submission-to-publication flow, editing/unpublishing, access controls,
search/filtering/pagination, RSS, and mobile light/dark checks. See
`docs/VALIDATION.md` for scope and live-service limitations.
