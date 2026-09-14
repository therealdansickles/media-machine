# Connect the publication

## 1. Database

Use the existing Supabase project or create a separate project for preview testing.
Apply `supabase/migrations/202609140001_editorial_inbox.sql` once using the Supabase
SQL editor or your migration tooling. Test it in a staging project first.

The migration adds two tables and three service-only functions. It leaves the legacy
`articles` table intact. `editorial_inbox` has no anonymous/authenticated grants;
`published_stories` exposes only active public briefs. Only the server's service-role
connection may write or execute the processing/publishing functions.

Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the server-only
`SUPABASE_SERVICE_ROLE_KEY`. Do not place the service-role key in a public variable.

## 2. Editor and summaries

Generate a random editor key using `openssl rand -hex 32`. Set it as `EDITOR_SECRET`
on the server, then use that value to sign in at `/editor`. Sessions are signed,
HTTP-only, same-site cookies that expire after 12 hours. Rotating the secret revokes
existing sessions. This is a single-owner editor, not a multi-user identity system.

Set `OPENAI_API_KEY` and optionally `OPENAI_SUMMARY_MODEL` (default `gpt-4.1-mini`).
The implementation uses [Responses structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
with `store: false`. Source text is sent to OpenAI for drafting and auditing; only
paste material you intend to submit for this processing. API usage has its own
billing and requires a working API key.

Leave `AUTO_PUBLISH=true` for automatic publication of relevant, unflagged briefs.
Set it to `false` to make all new briefs review-first. Changes saved in the editor do
not update the live copy until you click **Publish brief** or **Update live brief**.

Set `NEXT_PUBLIC_SITE_URL` to the actual public origin, without a trailing slash.
Set `CORRECTIONS_EMAIL` if you want the About page to show a corrections contact.

## 3. Email forwarding

Use [Resend receiving](https://resend.com/docs/dashboard/receiving/introduction)
with a receiving domain or provider-supplied receiving address. Configure a dedicated,
private alias containing a long random segment, such as `stories-<random-24-hex>`.
Do not publish this address. The sender allowlist is an additional filter; an email
From header alone is not cryptographic proof of identity.

Set:

- `RESEND_API_KEY`: a server-side key permitted to retrieve received messages.
- `RESEND_WEBHOOK_SECRET`: the signing secret for this endpoint.
- `INBOUND_EMAIL_ADDRESS`: the exact private receiving address.
- `INBOUND_ALLOWED_SENDERS`: your permitted sender addresses, comma-separated.

Add a webhook for `email.received` pointing to:

```text
https://YOUR_DOMAIN/api/inbound/email
```

The handler verifies the [webhook signature](https://resend.com/docs/webhooks/verify-webhooks-requests),
retrieves the full received email via the receiving API, checks the recipient and
sender, and saves the event before acknowledging it. Delivery retries and repeated
article links are deduplicated. Attachments are not imported. Raw email bodies and
signatures are not stored in the publication database.

Forward a message containing one clear article URL. Homepage, unsubscribe, preference,
and tracking links are filtered or normalized. If several plausible story links
remain, the inbox asks you to choose one. The app reads the linked web article; if
it is blocked or short, paste the article text in the editor and retry. It does not
automatically summarize an entire newsletter or guess which link you meant.

## 4. Hosting and job recovery

Deploy this branch as a preview first using the repository's existing hosting setup.
Routes that process stories request a maximum duration of 180 seconds. Confirm that
your host supports this limit and Next.js `after` background work.

Normal imports start processing immediately after the intake response. For automatic
recovery of interrupted jobs, set a random `CRON_SECRET` and configure your scheduler
to call this endpoint periodically (for example, every five minutes):

```text
GET https://YOUR_DOMAIN/api/jobs/process
Authorization: Bearer YOUR_CRON_SECRET
```

Each call claims at most one queued or expired job. Concurrent calls cannot claim the
same active job. Use the editor's **Recover queued work** button for manual recovery.
Missing service keys, blocked articles, or failed evidence checks require fixing the
item and retrying; they do not loop indefinitely or publish empty briefs.

No scheduler, service credentials, domain records, or provider webhook is created by
merging the code alone.

## 5. Acceptance check and cutover

1. Confirm anonymous clients cannot select the inbox or call publishing functions.
2. Sign in and paste a real article link. Verify the summary, key facts, context,
   attribution, and original link on the resulting public brief.
3. Test one forwarded email from your allowed address and confirm it appears once.
4. Forward it again and confirm deduplication. Try a blocked/paywalled URL and
   confirm it stays private with an actionable message.
5. Edit a published brief, save it, then update the live copy. Unpublish and confirm
   its public URL no longer shows the brief.
6. Check desktop/mobile rendering, search, filters, RSS, and configured sitemap.
7. Evaluate a representative set of real stories before relying on unattended
   publication. Automated evidence matching and model audits can still miss errors.
8. Disable the old external n8n workflow. The new reader uses `published_stories`;
   review and explicitly migrate any legacy stories worth preserving publicly.

The repository work does not delete production data, disable external workflows,
configure provider accounts, or perform this live acceptance check.
