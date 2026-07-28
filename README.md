# ExperienceHub

ExperienceHub is a multi-country platform for discovering curated dining
experiences and thoughtfully designed packages. The project begins with
experiences in Nepal and New Zealand and is structured to support additional
destinations over time.

## Technology used so far

- [Astro](https://astro.build/) with Astro's recommended strict TypeScript
  defaults
- [Tailwind CSS](https://tailwindcss.com/) 4 through the recommended Vite plugin
- Astro Content Collections with Zod-validated local JSON and Markdown entries
- Astro's official sitemap and RSS packages
- The official Supabase JavaScript client for optional catalogue reads
- Supabase's SSR helper with Astro middleware for cookie-based administrator
  sessions
- Supabase Storage with authenticated administrator uploads and public catalogue
  image delivery
- Server-side OpenRouter recommendations with structured response validation
- Consent-gated Google Tag Manager with a direct Google Analytics 4 fallback
- Stripe-hosted payments through validated Payment Links or server-created
  Checkout Sessions, with a safe dummy mode
- Cloudflare Workers through Astro's official adapter for on-demand catalogue,
  administration, AI, and payment routes
- Prerendered Journal pages and edge-served static assets in the same hybrid
  deployment

## Content architecture

Astro Content Collections are used for countries, restaurants, experiences,
packages, and Journal articles. They were chosen because collection schemas
validate every local record at build time, generate TypeScript types
automatically, and support validated references between each level of the
Country → Restaurant → Experience → Package relationship.

Structured catalogue entries live in `src/content/` as JSON, while Journal
articles use Markdown with fully validated frontmatter. Adding a destination or
article primarily means adding a new collection entry; detail pages are
generated from that data. The current image values point to local gradient
placeholder styles and can be replaced with image assets later without changing
the routes or data relationships.

Draft Journal entries are excluded from generated article routes, the Journal
index, the sitemap, and the RSS feed. Published entries can reference an
existing country and experience through validated collection relationships.

Package prices in the current catalogue are explicitly marked as placeholder
concept prices. They must not be treated as confirmed restaurant pricing.

## Supabase catalogue setup

Supabase is optional during development. When both public environment variables
are configured, the shared catalogue data layer reads active countries,
restaurants, experiences, and packages from Supabase for each catalogue
request. Missing, incomplete, placeholder, slow, or unavailable Supabase
configuration falls back to the existing validated local demo content without
taking down the site.

To prepare a hosted project:

1. Create a project from the [Supabase dashboard](https://supabase.com/dashboard).
2. Open the project's **SQL Editor** and run the files in
   `supabase/migrations/` in filename order.
3. Run `supabase/seed.sql` in the SQL Editor after all migrations. The seed is
   demonstration content; all prices are marked as placeholders and the New
   Zealand restaurant and experience are explicitly fictional.
4. Open **Project Settings → Data API** to find the project URL.
5. Open **Project Settings → API Keys** to find the browser-safe anonymous key.
   Supabase projects using the newer key format may label this the publishable
   key; it serves the same public-client purpose here.
6. Copy `.env.example` to `.env` and add the two browser-safe values:

```sh
cp .env.example .env
```

```dotenv
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-browser-safe-anonymous-key
```

The committed `.gitignore` excludes `.env` and other environment variants while
allowing the empty `.env.example` template. Never commit real credentials.

The project URL and anonymous/publishable key are designed to be visible in
browser requests. They are safe only when Row Level Security remains enabled
and policies restrict which rows each role can access. The migration grants
anonymous and authenticated clients `SELECT` only and permits reads solely for
active catalogue records whose parent records are also active. It creates no
public insert, update, or delete policy.

The service-role key is deliberately absent. It bypasses Row Level Security,
must never be sent to a browser, and must never use Astro's `PUBLIC_` prefix. A
future trusted server-side administrative workflow would store it in a protected
secret store instead.

Teams using the Supabase CLI can apply the same committed files with the normal
migration and seed workflow. No Supabase CLI dependency is required by the
Astro application.

## Administrator authentication

ExperienceHub has no public registration route. Before creating an
administrator, open **Authentication → Providers → Email** in Supabase and
disable **Allow new users to sign up**. Also keep anonymous sign-ins disabled.

Create the initial user through the trusted Supabase Dashboard:

1. Open **Authentication → Users**.
2. Choose **Add user → Create new user**, enter the owner email, and set a
   temporary strong password through the Dashboard.
3. Confirm that the `public.profiles` trigger created a profile with the safe
   default `member` role.
4. In the Supabase SQL Editor, promote only the intended user:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id
  from auth.users
  where email = 'owner@example.com'
);
```

Replace the example email before running the statement. Role assignment is a
trusted database operation and is intentionally unavailable from the website.
The profile migration grants signed-in users read access only to their own
profile and creates no browser-accessible insert, update, or delete policy.

To test login with real project credentials:

1. Configure `.env` as described above.
2. Start the project with `npm run dev`.
3. Visit `/admin/login` and sign in with the promoted administrator.
4. Confirm `/admin` shows the signed-in email and that the logout button returns
   to the login screen.
5. Confirm an unauthenticated request to `/admin` redirects to login.
6. Confirm a valid user whose profile remains `member` cannot open `/admin`.

Password recovery uses `/admin/forgot-password` and
`/admin/reset-password`. Add both the local and production reset URLs to
**Authentication → URL Configuration → Redirect URLs** in Supabase, for
example:

```text
http://localhost:4321/admin/reset-password
https://your-production-domain.example/admin/reset-password
```

The recovery email establishes a supported Supabase PKCE cookie session before
the user chooses a new password of at least 12 characters. After a successful
reset, the session is signed out and the administrator must authenticate again.

Authentication and authorization are separate checks. Supabase Auth verifies
who owns the session; server middleware then reads that user's RLS-protected
profile to determine whether the database-assigned role is `admin`. Checking a
role only in frontend JavaScript would be insecure because browser code and
editable user metadata can be manipulated. The middleware therefore validates
the user with Supabase before the protected page renders.

Current limitations are intentional: there is no public signup, MFA interface,
bulk catalogue workflow, or service-role client. Supabase rate limits and email
delivery settings still need production review. Admin and catalogue routes use
the configured Cloudflare Workers runtime because they are rendered on demand.
The canonical origin must be configured through `PUBLIC_SITE_URL` before a
production launch.

## Catalogue image storage

Run `supabase/migrations/20260728000002_add_catalogue_image_storage.sql` after
the catalogue and profiles migrations. It creates or configures the
`experience-images` bucket and prepares image metadata columns on countries,
restaurants, experiences, and packages.

The bucket is intentionally public because catalogue images are public website
assets. A public bucket allows direct image downloads, but it does not make
uploads or deletes anonymous. Row Level Security policies on `storage.objects`
allow only an authenticated user whose trusted `profiles.role` is `admin` to
upload or delete. No anonymous write policy and no update policy are created;
uploads use collision-resistant names and never overwrite an existing object.

Images use these organized paths:

```text
countries/<uuid>.webp
restaurants/<uuid>.jpg
experiences/<uuid>.png
packages/<uuid>.webp
```

The UUID is generated by the application rather than derived from the original
filename. The SQL policy independently checks the top-level folder, UUID
filename, and extension. The bucket and server utility accept JPEG, PNG, and
WebP up to 5 MB. AVIF is not enabled in this milestone so that upload and
preview support remains predictable across the supported environments.

The server utility validates the declared MIME type, file size, and file
signature before upload. The temporary browser interface also checks dimensions
and requires images to be at least 640 × 360 pixels with no side above 8,000
pixels. Browser dimension checks improve feedback but are not treated as a
security boundary. WebP is encouraged, and no automatic compression is
promised or performed.

Database records are prepared to store the canonical Supabase object path,
descriptive alt text, width, and height. Public URLs are derived from the bucket
and object path instead of being stored redundantly, making future bucket or
delivery changes easier. Public pages should continue to render known width and
height values and use lazy loading for images below the fold.

To test with a configured Supabase project and promoted administrator:

1. Apply all migrations in filename order.
2. Configure `.env` with the browser-safe project URL and anonymous/publishable
   key.
3. Run `npm run dev`, sign in at `/admin/login`, and open
   `/admin/storage`.
4. Preview and upload a supported image, confirm the public URL loads, then use
   **Delete test upload** to remove it.

The browser upload uses only the administrator's supported Supabase cookie
session and the public anonymous/publishable key. It needs no secret because
Storage RLS makes the authorization decision in Supabase. The service-role key
still bypasses RLS, is not used by this project, and must never be exposed in
browser code or given a `PUBLIC_` prefix.

## Catalogue administration

Apply
`supabase/migrations/20260728000003_add_catalogue_admin_policies.sql` after the
storage migration. It grants catalogue mutation privileges only to the
`authenticated` database role and adds Row Level Security policies that require
the signed-in user's trusted `profiles.role` to be `admin`. Anonymous users
retain active-record reads only. The migration also adds the package hero-image
fallback field needed by the shared image workflow.

After signing in, `/admin` shows overview counts, recently updated records, and
a quick **Add package** action. The catalogue navigation supports countries,
restaurants, experiences, and packages. Each editor validates required fields,
suggests an editable slug, checks slug uniqueness before saving, handles the
correct parent relationship, and supports active, featured, image, and alt-text
state where applicable.

Package inclusions use one plain-text line per item instead of a rich-text
editor. Package currency is checked against the country reached through the
selected experience and restaurant. Image replacements upload a new
collision-resistant Storage object, update the database record, and then remove
the previous object.

Deletion requires typing the record name exactly. The dashboard checks for
child records and blocks destructive deletion when a country still has
restaurants, a restaurant has experiences, or an experience has packages.
PostgreSQL foreign keys remain the final safeguard. Deactivation is the
recommended choice when content may be restored or relationships remain.

Public catalogue routes render on demand and fetch active Supabase records for
each request, so saved changes do not require a site rebuild. Inactive records
are excluded by both queries and RLS, and direct visits to inactive or missing
detail slugs return to the relevant catalogue index. The validated local
content remains a development fallback only when Supabase is missing or
unavailable; a successfully connected but empty database displays normal empty
states instead of substituting demo records.

## AI package recommendation assistant

The **Help me choose** panel sends a short, structured preference request to
`/api/recommendations`. Browser JavaScript never contacts OpenRouter directly.
The Astro server loads active packages from the same catalogue layer, supplies
that bounded context to OpenRouter, validates the returned JSON and package
slugs, enriches the cards from trusted catalogue data, and returns only the
safe display response.

To configure it locally:

1. Create an account at [OpenRouter](https://openrouter.ai/).
2. Create an application API key from
   [OpenRouter API Keys](https://openrouter.ai/settings/keys). Treat the
   plaintext key as a secret.
3. Choose a currently available low-cost model from the
   [OpenRouter model catalogue](https://openrouter.ai/models). Confirm that the
   model supports structured outputs.
4. Add these server-side values to the ignored local `.env`:

```dotenv
OPENROUTER_API_KEY=
OPENROUTER_MODEL=
SITE_URL=
SITE_NAME=
```

No model identifier is hard-coded, because model availability and pricing can
change. Fill these values only in the ignored `.env`; change
`OPENROUTER_MODEL` and restart the server to switch models.
`SITE_URL` and `SITE_NAME` are optional attribution values sent through
OpenRouter's documented request headers; they are not secrets.

For a Cloudflare deployment, add `OPENROUTER_API_KEY` as an encrypted **Secret**
under **Workers & Pages → your Worker → Settings → Variables and Secrets**.
Add the model, site URL, and site name there as normal variables or secrets
according to the deployment policy. A Wrangler-managed Worker can instead use:

```sh
npx wrangler secret put OPENROUTER_API_KEY
```

The endpoint reads Cloudflare runtime bindings through `cloudflare:workers`.
Keep `OPENROUTER_API_KEY` server-only and never give it a `PUBLIC_` prefix. The
browser bundle has no reason to receive it.

If a key is leaked, create a replacement, update the deployment secret, verify
the new key, and revoke the old key immediately. OpenRouter supports usage
limits on application keys and organization guardrails; set an appropriately
small spending limit and monitor usage in the OpenRouter dashboard.

Grounding and safety controls are deliberately narrow:

- Only currently active packages and their approved country, restaurant,
  experience, price status, guest, duration, inclusion, note, and booking
  fields are supplied.
- Catalogue and preference objects are labelled as untrusted data, never
  instructions.
- The browser cannot provide a system prompt, model name, endpoint, or API key.
- OpenRouter is asked for strict JSON containing existing package slugs,
  reasons, considerations, and an optional follow-up question.
- The server rejects unknown slugs, duplicate recommendations, excessive text,
  sensitive-configuration topics, and malformed responses.
- Invalid model JSON produces a deterministic catalogue-only fallback; provider
  and timeout failures produce friendly errors.
- Requests are limited to 2,500 characters and five valid requests per client
  per ten-minute server-instance window. This in-memory limiter is a basic abuse
  control, not a distributed production quota.
- Conversations are not stored, and the interface asks users not to submit
  personal or payment-card details.

Without both `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`, the site still builds
and the panel displays a non-technical unavailable state while the normal
catalogue remains usable.

## Consent-aware analytics

Analytics is optional and disabled when no valid identifier is configured.
These identifiers are public configuration values, not secret API keys:

```dotenv
PUBLIC_GTM_CONTAINER_ID=
PUBLIC_GA_MEASUREMENT_ID=
```

Google Tag Manager is the preferred integration point. When a valid
`PUBLIC_GTM_CONTAINER_ID` is present, ExperienceHub loads GTM only after the
visitor accepts analytics and does not initialise GA4 directly. Configure the
Google tag inside that GTM container. A valid `PUBLIC_GA_MEASUREMENT_ID` enables
direct GA4 only when GTM is absent. This precedence prevents the same page and
events from being sent by two independently initialised tags.

The demonstration consent panel offers accept and reject choices, stores the
preference in browser local storage, and exposes **Privacy preferences** in the
footer. Rejection loads no Google tracking. Changing an accepted preference to
rejected reloads the page so the already-loaded tag cannot continue on that
page. This small consent system is a technical foundation, not a claim of legal
compliance in every country. Production consent language, retention settings,
regional behavior, and legal requirements must be reviewed for each target
market.

### Google Analytics 4 setup

1. In [Google Analytics](https://analytics.google.com/), create an Analytics
   account and GA4 property.
2. Create a **Web** data stream for the production site and copy its measurement
   ID, which begins with `G-`.
3. If GTM is not used, place that value in
   `PUBLIC_GA_MEASUREMENT_ID`.
4. In **Admin → Data display → Events**, mark only the relevant received events
   as key events. Treat purchase as a key event only when the server-verified
   checkout flow is enabled and tested.

Google's current property and web-stream flow is documented in
[Set up Analytics for a website](https://support.google.com/analytics/answer/14183469),
and key-event controls are covered in
[Mark events as key events](https://support.google.com/analytics/answer/12571843).

### Google Tag Manager setup

1. In [Google Tag Manager](https://tagmanager.google.com/), create an account
   and a **Web** container, then copy the container ID beginning with `GTM-`.
2. Add it as `PUBLIC_GTM_CONTAINER_ID`; leave it blank to disable GTM.
3. In the container, add a **Google tag** using the GA4 measurement ID.
4. Create Custom Event triggers for the ExperienceHub event names below.
5. Create GA4 Event tags using those triggers. Add data-layer variables only for
   the approved parameters that each event needs.
6. Use **Preview** to test, then submit and publish the verified container.

Google documents the
[Google tag in Tag Manager](https://support.google.com/tagmanager/answer/14842872),
[Custom Event triggers](https://support.google.com/tagmanager/answer/7679219),
[Preview mode](https://support.google.com/tagmanager/answer/6107056), and
[publishing](https://support.google.com/tagmanager/answer/6107163).

ExperienceHub pushes these consistently named events after consent:

| Event | When used |
| --- | --- |
| `country_selected` | A country destination link is selected |
| `experience_viewed` | An experience detail page is viewed |
| `package_viewed` | A package detail page is viewed |
| `ai_assistant_opened` | A **Help me choose** entry point is selected |
| `ai_recommendation_clicked` | A generated package recommendation is opened |
| `booking_button_clicked` | A package booking-information action is selected |
| `checkout_started` | A dummy or Stripe checkout pathway is started |
| `purchase_completed` | Reserved for a later idempotent booking record |

GTM events are pushed to `window.dataLayer` with only relevant catalogue fields:
`country`, `restaurant`, `experience`, `package`, `currency`, and non-negative
`value`. Direct GA4 sends the same event names and fields through `gtag`. The
utility deliberately ignores other fields; it does not track free-text AI
messages, dietary notes, personal data, payment details, or entire form
payloads. Future checkout code should import the same utility rather than
creating another analytics client.

### Verification

- Clear the `experiencehub_analytics_consent` local-storage value, reload, and
  confirm no request to `googletagmanager.com` occurs before acceptance.
- Reject, reload, and confirm no GTM, Google tag, or GA collection request is
  made.
- For GTM, use
  [Preview mode](https://support.google.com/tagmanager/answer/6107056) to verify
  Custom Event triggers and their approved data-layer values.
- For direct GA4 or a published GTM container, enable debug mode and use
  [GA4 DebugView](https://support.google.com/analytics/answer/7201382) to verify
  event names and parameters.
- In browser developer tools, inspect the Network panel for `gtm.js`,
  `gtag/js`, and GA collection requests. Exactly one loading strategy should be
  present: GTM when its ID is configured, otherwise direct GA4.
- If duplicate events appear, check for a hard-coded Google tag, a second GTM
  container, or GA4 direct initialisation outside this integration before
  publishing.

## Stripe checkout

ExperienceHub supports three deliberately separate payment modes:

1. **Dummy** is the default. It opens a local demonstration checkout stating
   that no payment or reservation will be processed. It never contacts Stripe.
2. **Payment Link** redirects through the server to a package-specific
   Stripe-hosted link. Only HTTPS links on `buy.stripe.com` or
   `checkout.stripe.com` are accepted.
3. **Checkout Session** posts only the package slug to the Astro server. The
   server reloads the active package from the trusted catalogue, retrieves its
   Stripe Price, checks the Price is active and one-time, and verifies currency
   and minor-unit amount before creating a Checkout Session.

`PAYMENT_MODE` is a deployment safety switch. Missing, empty, or invalid values
resolve to `dummy`. A real mode activates only when the package is also enabled,
uses the same package payment mode, is available, and has all required trusted
fields. Incomplete real configuration produces a contact state rather than
attempting a charge.

Apply
`supabase/migrations/20260728000004_add_package_payments.sql` after the previous
catalogue migrations, then rerun `supabase/seed.sql` if demo records are needed.
The migration adds payment-enabled state, package payment mode, Stripe Price
ID, validated Payment Link, and trusted minor-unit amount. It stores no Stripe
secret. The admin package editor can manage these public references.

### Stripe account and sandbox setup

1. Create a [Stripe account](https://dashboard.stripe.com/register). New
   accounts can use a sandbox without moving real money; accepting real
   payments requires account activation.
2. Stay in a sandbox while developing. Stripe sandbox objects and keys are
   separate from live-mode objects and keys.
3. In **Product catalogue**, create one product per bookable package and a
   one-time Price in the package currency. Copy the resulting `price_...` ID.
   Stripe Price amounts use the currency’s minor unit; review
   [Stripe’s currency rules](https://docs.stripe.com/currencies) for
   zero-decimal and special-case currencies.
4. For Payment Link mode, create a Payment Link for the matching Price in
   **More → Payment Links**, then copy its Stripe-hosted URL.
5. Find the sandbox publishable and secret keys under **Developers → API
   keys**. Publishable keys begin with `pk_test_`; server secret keys begin with
   `sk_test_`.

Stripe’s documentation explains
[sandbox and live accounts](https://docs.stripe.com/get-started/account),
[API key types](https://docs.stripe.com/keys),
[products and one-time Prices](https://docs.stripe.com/products-prices/manage-prices),
and [Payment Link creation](https://docs.stripe.com/payment-links/create).

### Local configuration

Copy `.env.example` to the ignored `.env` and begin in dummy mode:

```dotenv
PAYMENT_MODE=dummy
PUBLIC_SITE_URL=http://localhost:4321
PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

`PUBLIC_STRIPE_PUBLISHABLE_KEY` is intentionally browser-safe. The current
Stripe-hosted redirect flow does not load Stripe.js, so it is prepared but not
required. `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are server-only and
must never use the `PUBLIC_` prefix.

To use a Payment Link:

1. Set the package to **Stripe Payment Link**, add the validated link, enable
   payment, set a confirmed catalogue price and matching trusted minor-unit
   amount, and set booking status to available.
2. Set `PAYMENT_MODE=payment-link` and restart the server.

To use a server-created Checkout Session:

1. Give the package a confirmed catalogue price and available booking status.
2. Set its mode to **Server-created Checkout Session**, add the Stripe Price ID,
   and enter the expected amount in minor units—for example, NZD 220.00 is
   `22000`.
3. Add the sandbox `STRIPE_SECRET_KEY`, set the exact `PUBLIC_SITE_URL`, set
   `PAYMENT_MODE=checkout-session`, and restart.

The browser never submits a price, currency, Stripe Price ID, success URL, or
secret. It submits only the package slug. The server obtains every payment
value from the active trusted catalogue and Stripe. Payment fields must not be
added to query strings or hidden inputs as a source of truth.

### Success, cancellation, and webhooks

Stripe returns Checkout Sessions to `/checkout/success` with a session ID. The
page does not trust its URL: it retrieves the session from Stripe and claims a
verified payment only when status, paid state, package metadata, amount, and
currency match the catalogue. `/checkout/cancel` never claims payment.

Configure a Stripe webhook endpoint at:

```text
https://your-production-domain.example/api/stripe-webhook
```

Subscribe initially to `checkout.session.completed` and
`checkout.session.expired`. Copy that endpoint’s `whsec_...` signing secret into
the server-only `STRIPE_WEBHOOK_SECRET`. The endpoint reads the unparsed request
body and verifies the `Stripe-Signature` header before accepting an event, as
required by Stripe’s
[webhook verification guidance](https://docs.stripe.com/webhooks).

This milestone’s webhook is a verified, side-effect-free scaffold. It creates
no booking record, so repeated delivery is harmless. A later booking workflow
must store Stripe event IDs uniquely and make each status transition
idempotent before fulfilment is attached.

For local webhook testing, the
[Stripe CLI](https://docs.stripe.com/stripe-cli/use-cli) can forward sandbox
events:

```sh
stripe listen \
  --events checkout.session.completed,checkout.session.expired \
  --forward-to localhost:4321/api/stripe-webhook
```

Use the `whsec_...` value printed by that command for the local webhook secret.
For interactive Checkout tests, use Stripe’s documented sandbox card
`4242 4242 4242 4242`, any future expiry date, and any valid CVC. Never enter
real card information in a sandbox or test with live credentials.
[Stripe’s test-card guide](https://docs.stripe.com/testing) lists successful,
declined, and authentication scenarios.

### Cloudflare and production

In **Workers & Pages → project → Settings → Variables and Secrets**, add
`STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` as encrypted secrets. Add
`PAYMENT_MODE`, `PUBLIC_SITE_URL`, and the optional publishable key as ordinary
environment variables. Cloudflare documents encrypted values in
[Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/).

Before changing from dummy mode:

- test the whole flow with sandbox products, Prices, keys, cards, and webhooks;
- confirm the package’s catalogue amount and Stripe Price match;
- replace the placeholder site URL and configure the production webhook;
- review taxes, refunds, fulfilment, terms, privacy, and target-market legal
  requirements;
- activate live mode and switch all related objects and keys together.

Card numbers and card verification data are entered only on Stripe-hosted
Checkout and do not touch ExperienceHub’s server. This reduces payment-data
scope, but the project does not claim blanket PCI compliance. Stripe account
configuration and the production integration still require an appropriate
security and compliance review.

## Production architecture

ExperienceHub is a hybrid Astro application deployed as one Cloudflare Worker:

- Journal pages and local assets are prerendered during `astro build`.
- Catalogue pages render on demand so active Supabase changes can appear
  without a rebuild.
- Authentication, admin mutations, OpenRouter requests, Stripe Checkout, and
  webhook verification execute only in server routes.
- Cloudflare serves generated assets and invokes Astro's Worker entry point for
  application routes.
- Supabase remains the database, Auth provider, and image store. No Cloudflare
  KV, D1, R2, Queues, or Images binding is configured.
- Supabase cookie sessions are separate from Astro Sessions. The configured
  in-memory Astro session driver is unused and prevents the adapter from
  provisioning an unnecessary KV namespace.

The committed `wrangler.jsonc` uses Astro's current unified Cloudflare entry
point, enables `nodejs_compat` for Stripe and Supabase, serves `dist` assets,
enables version preview URLs, and uses the custom static `404.html`.
`imageService: "passthrough"` avoids an unnecessary Cloudflare Images
dependency.

## Environment variables

Copy `.env.example` to the ignored `.env` for local work. Do not put real values
in source files, `wrangler.jsonc`, screenshots, issue comments, or build logs.

### Public variables

These identifiers and browser configuration values are intentionally public:

| Variable | Purpose |
| --- | --- |
| `PUBLIC_SUPABASE_URL` | Supabase project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Browser-safe anonymous or publishable key; RLS remains the security boundary |
| `PUBLIC_GA_MEASUREMENT_ID` | Direct GA4 fallback when GTM is absent |
| `PUBLIC_GTM_CONTAINER_ID` | Preferred consent-gated analytics integration |
| `PUBLIC_STRIPE_PUBLISHABLE_KEY` | Browser-safe Stripe identifier reserved for future Stripe.js use |
| `PUBLIC_SITE_URL` | Exact canonical production origin and trusted Stripe return origin |

Because `PUBLIC_` values can be compiled into HTML or browser JavaScript, add
them to **Workers & Pages → ExperienceHub → Settings → Build → Variables and
Secrets** for Git builds. Also add `PUBLIC_SITE_URL` to the Worker's runtime
variables because checkout validates it at request time. A public identifier is
not an authorization mechanism.

### Server configuration

These values are not credentials, but they control server behavior:

| Variable | Purpose |
| --- | --- |
| `PAYMENT_MODE` | `dummy` by default; later `payment-link` or `checkout-session` |
| `OPENROUTER_MODEL` | Explicit currently available model selected by the operator |
| `SITE_URL` | Optional OpenRouter attribution origin |
| `SITE_NAME` | Optional OpenRouter attribution name |

Store these as normal Worker variables. Keep `PAYMENT_MODE=dummy` until the
entire Stripe sandbox flow and package configuration have been verified.

### Secret variables

These values belong only in **Workers & Pages → ExperienceHub → Settings →
Variables and Secrets** as encrypted secrets:

| Variable | Purpose |
| --- | --- |
| `OPENROUTER_API_KEY` | Server-to-server recommendation requests |
| `STRIPE_SECRET_KEY` | Server-created Checkout Sessions and verification |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification |

They must never use `PUBLIC_`, enter GitHub source files, or be exposed to
browser code. The Supabase service-role key is intentionally not used. A
CLI-managed deployment can set secrets interactively:

```sh
npx wrangler secret put OPENROUTER_API_KEY
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

## Local development

Node.js 22.12 or newer is required.

```sh
git clone <repository-url>
cd experience-hub
npm install
cp .env.example .env
npm run dev
```

Useful commands:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Astro development server using the Cloudflare runtime |
| `npm run build` | Production hybrid build |
| `npm run preview` | Astro preview of the production output |
| `npm run cf:dev` | Build and run the output through Wrangler locally |
| `npm run cf:types` | Regenerate Worker types after binding changes |
| `npm run deploy:preview` | Upload a version without promoting it |
| `npm run deploy` | Build and deploy the active Worker version |

## Cloudflare deployment

The project uses Cloudflare **Workers**, not a static-only Pages deployment,
because server endpoints and protected routes are required. Cloudflare
recommends Workers for new Astro full-stack applications.

### Local CLI deployment

1. Create or sign in to a Cloudflare account.
2. Run `npx wrangler login` and complete browser authorization.
3. Add the variables and secrets listed above.
4. Keep `PAYMENT_MODE=dummy` for the first deployment.
5. Run `npm run deploy`.
6. Record the returned `https://experiencehub.<account-subdomain>.workers.dev`
   URL.
7. Set `PUBLIC_SITE_URL` and `SITE_URL` to that exact origin in build and
   runtime configuration, rebuild, and deploy again so canonical, sitemap, and
   checkout origins are correct.

Cloudflare's current Workers route uses a `workers.dev` subdomain. A
`pages.dev` hostname applies to Cloudflare Pages and is not used by this
server-capable deployment.

### Git-based production and preview deployments

In **Workers & Pages**, create or select a Worker named `experiencehub`, connect
the GitHub repository under **Settings → Builds**, and use:

```text
Build command: npm run build
Production deploy command: npx wrangler deploy
Preview deploy command: npx wrangler versions upload
Root directory: /
```

The dashboard Worker name must match `wrangler.jsonc`. Select the production
branch and enable non-production branch builds for isolated version preview
URLs. Configure variables for both production and preview triggers; use dummy
payment mode and sandbox-only integrations in preview. Review a preview before
promoting a production version.

## Domain setup

### Route A: no domain yet

Use the free Worker subdomain returned by the first deployment. Set
`PUBLIC_SITE_URL` to that origin and use it for Supabase Auth redirect URLs,
Stripe return URLs and webhook, OpenRouter attribution, canonical URLs, and
analytics data streams.

### Route B: custom domain later

1. Register a domain with a suitable registrar, transfer an eligible domain, or
   keep the existing registrar. Cloudflare Registrar supports only its
   available top-level domains; do not assume every TLD is offered.
2. Add the domain as a Cloudflare zone. If Cloudflare will be authoritative,
   update nameservers and wait for the zone to become active.
3. Open **Workers & Pages → experiencehub → Settings → Domains & Routes → Add
   → Custom Domain** and attach the chosen hostname. Cloudflare creates the DNS
   record and certificate.
4. Wait for DNS and SSL activation, then verify HTTPS on major routes.
5. Update `PUBLIC_SITE_URL`, `SITE_URL`, Supabase redirect URLs, Stripe
   settings, GA4, GTM, and provider allowlists; rebuild and redeploy.
6. Choose either the apex or `www` as canonical. Add the other hostname as a
   proxied DNS record and create one Cloudflare Redirect Rule to the canonical
   hostname while preserving path and query.

See Cloudflare's current [Worker Custom Domains guidance](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
and [Workers Builds documentation](https://developers.cloudflare.com/workers/ci-cd/builds/).

## Business email setup

Website hosting and business email are separate services. Never commit mailbox
passwords, app passwords, recovery codes, or administrator credentials.

Paid mailbox options include Google Workspace, Microsoft 365, and email hosting
from a domain provider. A lower-cost option is forwarding
`info@yourdomain.example` to an existing inbox. Forwarding alone is not a full
outgoing mailbox: replies normally leave from the destination address rather
than the branded address. Cloudflare documents this in its
[Email Routing guidance](https://developers.cloudflare.com/email-service/reference/postmaster/).

For Google Workspace:

1. Create the Workspace account and add the production domain.
2. Verify domain ownership using Google's supplied DNS record in Cloudflare.
3. Add the exact Google MX records shown in the Admin console and remove
   conflicting MX records.
4. Create the required mailbox, such as `info@...`.
5. Publish the provider-approved SPF TXT record. Keep only one SPF record.
6. Generate a DKIM key in Google Admin, add the supplied TXT record, then start
   authentication.
7. Add DMARC gradually: begin with monitoring and aggregate reports, review
   legitimate senders, then tighten policy after SPF and DKIM consistently pass.
8. Test external sending, receiving, replies, spam placement, SPF, DKIM, and
   DMARC alignment.

Use Google's current instructions for [MX records](https://support.google.com/a/answer/87127),
[SPF](https://support.google.com/a/answer/33786), and
[DKIM](https://support.google.com/a/answer/174124) instead of copying
potentially outdated values into this repository.

## Production SEO and operational checks

- `PUBLIC_SITE_URL` drives canonical URLs, Open Graph URLs, sitemaps, RSS, and
  Stripe return-origin validation. The reserved `.example` fallback is for
  unconfigured builds only.
- Astro's sitemap integration covers prerendered pages and Journal articles.
  `/catalogue-sitemap.xml` lists the active runtime catalogue. `/robots.txt`
  points crawlers to both.
- `BaseLayout` supplies canonical, description, Open Graph, Twitter card,
  favicon, and structured-data hooks. Package and Journal pages emit schema
  data without invented ratings or availability.
- `public/og.jpg` is a local 1200 × 630 social preview; the favicon is local.
- Custom 404 and safe 500 pages expose no stack traces or secrets.
- `trailingSlash: "never"` sets path consistency. A domain Redirect Rule sets
  hostname consistency.
- Validate representative structured data with Google's Rich Results Test or
  Schema.org validator after a public URL exists.

Before every production promotion:

1. Run `npm ci` and `npm run build` with production public variables.
2. Confirm sitemap and canonical hosts match production.
3. Search tracked source and browser assets for credential patterns; verify
   `.env`, `.dev.vars`, and `.wrangler` are ignored.
4. Check navigation, forms, focus states, mobile-menu keyboard behavior, 404,
   missing-image fallbacks, and representative internal links.
5. Confirm no Google request occurs before consent and that GTM prevents direct
   GA4 duplicate initialization.
6. Confirm `PAYMENT_MODE=dummy` is visibly demonstrational unless an explicitly
   tested Stripe configuration is being promoted.
7. Confirm fictional New Zealand records retain demo/concept labels.
8. Inspect build warnings, Worker logs, asset sizes, and browser network weight.
   Do not log secrets, full payment payloads, or AI free text.
9. Validate AI, checkout, and webhook failure paths before configured success
   paths.

The application uses system font stacks, so there is no render-blocking web
font request. Content images provide dimensions, below-the-fold images are lazy
loaded, responsive media frames prevent layout shift, and no UI framework or
animation library is hydrated. Browser JavaScript stays focused on navigation,
filters, consent, assistant, admin forms, and checkout behavior.

## Git milestone history

| Milestone | Delivered foundation |
| --- | --- |
| 1 | Astro, TypeScript, Tailwind, base layout, and homepage |
| 2 | Premium responsive design and accessible navigation |
| 3 | Validated multi-country architecture and routes |
| 4 | Nepal and clearly fictional New Zealand catalogue |
| 5 | SEO-focused Journal, RSS, and sitemap support |
| 6 | Supabase catalogue layer, RLS schema, seed, and local fallback |
| 7 | Supabase administrator authentication and authorization |
| 8 | Secure Supabase Storage image workflow |
| 9 | Focused catalogue administration dashboard |
| 10 | Grounded server-only OpenRouter recommendation assistant |
| 11 | Consent-aware GTM with direct GA4 fallback |
| 12 | Dummy, Payment Link, and server-created Stripe checkout |
| 13 | Cloudflare Workers production configuration and launch audit |

## Current limitations and future expansion

- No deployment is live until an authenticated Cloudflare account completes the
  deployment steps and a production origin is configured.
- Live Supabase Auth, Storage, OpenRouter, analytics, and Stripe flows require
  operator-owned accounts and are never fabricated during local-only checks.
- The AI rate limiter is per Worker isolate, not a distributed abuse control.
- The verified Stripe webhook does not yet persist idempotent bookings,
  fulfilment, expiry, refunds, or restaurant confirmation.
- Public registration, customer accounts, multilingual content, inventory,
  availability calendars, taxes, refunds, and transactional email are out of
  scope.
- The runtime catalogue sitemap follows Supabase changes after its short cache;
  Journal changes still require a build.

The recommended next milestone is a production booking lifecycle: an
idempotent booking table keyed by Stripe event ID, restaurant confirmation,
privacy-reviewed customer contact capture, transactional email, admin
fulfilment controls, and sandbox-to-live release tests.

## Current milestone status

Milestone 13 configures the hybrid application for Cloudflare Workers, adds
production error and crawler routes, documents public and secret variables,
provides preview and production commands, and completes domain, business-email,
SEO, security, and performance launch guidance.

## Validation

Every milestone is validated with `npm run build`. Milestone 13 additionally
validates Cloudflare runtime output, local Worker routes, dummy checkout,
invalid AI input, webhook signature rejection, authentication redirects,
catalogue and Journal links, sitemap and robots responses, secret-pattern
absence from browser assets, analytics precedence, responsive navigation
semantics, and production asset weight. Live provider success paths are tested
only with operator-owned sandbox credentials; no connection or deployment is
claimed without evidence.
