# Media Machine Editions

[Create an edition](https://media-machine-editions.sickles.chatgpt.site/studio) · [Read Independent Film Desk](https://media-machine-editions.sickles.chatgpt.site/f/independent-film-desk)

## Publish your first feed

1. Sign in and choose a permanent edition address, a byline and a beat. New editions start in draft.
2. Open **Sources**. Add a public RSS or Atom URL or a public Substack publication address. The default imports headlines and links into the inbox. Enable automatic link publication for sources you want to syndicate as a link list. Only select the licensed setting if you may process the publisher’s feed descriptions.
3. Add an individual article from **Add a shared story**. Use the publisher’s public permalink, including for subscriber-only reporting. Write your own headline and explain what your reader should take away. Draft with OpenAI is optional. It sends the source label, headline and the material you supply to OpenAI using the API key entered for that request. Review the result before publishing.
4. Publish a story and change **Publication settings** from draft to public. The web edition and its RSS output show up to 100 published entries. For members-only editions the public page shows the subscription offer and the RSS endpoint closes. Readers sign in with their membership email.
5. To withdraw a story, return it to draft or archive it. Existing third-party RSS readers may keep previously public items. Remove a source to stop future imports. Imported stories stay under editorial control.

## Earn from an edition

**Direct sponsors.** Enter the sponsor’s name, link and approved copy in Publication settings. The reader displays a clearly labeled sponsor placement. Sell the placement directly and arrange billing with the sponsor.

**Manual memberships.** Add an external checkout URL and select members-only visibility. Grant the subscriber’s login email access through a chosen expiry date after confirming payment. Revoke it from the same desk. The curator handles buyer communication.

**Stripe subscriptions.** Create a recurring Stripe Payment Link in your own Stripe account and set it as the edition’s checkout URL. In the studio connect its `plink_` ID and a restricted key with **read-only Checkout Sessions and Subscriptions** access. Configure the Payment Link’s post-payment redirect to the exact claim URL shown in the studio, including the literal `{CHECKOUT_SESSION_ID}` placeholder. Test with a test-mode link and matching restricted key before enabling live payments. Readers complete checkout and sign in with the email they used to pay. The server verifies the paid session, payment link, email and active subscription and verifies subscription status again on subsequent reads. Trials and one-time payments use manual grants. A reader who misses the return redirect can contact the curator for a manual grant. Discounts, refunds, dispute handling and tax settings are managed in the curator’s Stripe account. A curator can revoke access independently.

Stripe credentials are encrypted using AES-GCM with the edition ID as authenticated data. Keep the deployment key stable and backed up in your secret manager. Changing it requires reconnecting Stripe for each edition. OpenAI keys are used in memory for one draft and never written into the edition database.

## Sources and rights

A subscription grants the access the publisher offers. Each curator is responsible for their rights to reuse material. Public link mode stores the publisher title, date and permalink. Licensed description mode can retain up to 3,500 characters privately for editorial review. Avoid private feed tokens and subscriber copies. No full web article is fetched on link submission. Write your own analysis and preserve attribution and each publisher's paywall. Source links are visible in the web reader and RSS.

[U.S. Copyright Office fair use guidance](https://www.copyright.gov/fair-use/more-info.html) · [Substack Terms of Use](https://substack.com/tos) · [Stripe Payment Links after checkout](https://docs.stripe.com/payment-links/post-payment)

## Run a local copy

Use Node 24 and npm. From this directory:

```sh
npm ci
npm test
npm run dev
```

Open http://localhost:3000. The development server uses a local SQLite database and a single preview identity. Use this mode only on your own machine. Production uses the bundled Worker, real sign-in and D1. All test articles and provider responses used in the automated suite are fixtures.

## Self-host a production copy

The package is independent of the old Next.js publication and its Supabase database. A Cloudflare Workers account, D1 and an identity provider are sufficient for link publishing. For Cloudflare Access:

1. Create a D1 database and copy `wrangler.example.toml` to `wrangler.toml`. Enter your database ID and choose your own Worker name. Assign a custom hostname.
2. Configure a Cloudflare Access self-hosted application for the hostname with a public sign-in entry at the protected path `/login`. Configure it to issue the authorization cookie for the host and use the same audience on protected paths. Set `ACCESS_TEAM` and `ACCESS_AUD`. The Worker checks the signed JWT and can serve anonymous readers on the public paths. Only use `IDENTITY_MODE=sites` behind the ChatGPT Sites identity gateway.
3. Apply and deploy with Wrangler from this directory.

```sh
npx wrangler d1 migrations apply editions --remote
npx wrangler secret put EDITION_KEY
npm run build
npx wrangler deploy
```

Provide a base64-encoded, randomly generated 32-byte secret to the secret command. The Worker has a cron handler that checks up to five due feeds per invocation, oldest first. Each source has an hourly minimum interval and each request imports up to 20 entries. RSS fetches are bounded, deduplicated, and use ETags or Last-Modified when provided. The hosted service also accepts an empty POST to `/jobs/refresh` to trigger the same bounded sweep. It takes no target URL or credentials from the caller.

The launch edition combines authored briefs with new linked headlines from the Sundance Institute’s public RSS feed. Other creators can follow any supported public feed. The default limits are 15 editions per creator, 20 sources per edition and 3,000 stored stories per edition.
