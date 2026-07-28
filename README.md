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
- Supabase's SSR helper with Astro's Node adapter for cookie-based administrator
  sessions
- Supabase Storage with authenticated administrator uploads and public catalogue
  image delivery
- Prerendered public pages with on-demand server rendering limited to private
  administration routes

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
restaurants, experiences, and packages from Supabase during development and
static builds. Missing, incomplete, placeholder, empty, slow, or unavailable
Supabase configuration falls back to the existing validated local demo content
without taking down the site.

To prepare a hosted project:

1. Create a project from the [Supabase dashboard](https://supabase.com/dashboard).
2. Open the project's **SQL Editor** and run the files in
   `supabase/migrations/` in filename order.
3. Run `supabase/seed.sql` in the SQL Editor after both migrations. The seed is
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
delivery settings still need production review. Admin and catalogue routes
require a Node-compatible deployment because they are rendered on demand, and
the placeholder canonical domain must be replaced before deployment.

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

1. Apply all four migrations in filename order.
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

## Local installation

Requires Node.js 22.12 or newer.

```sh
git clone <repository-url>
cd experience-hub
npm install
```

## Development

Start the local development server:

```sh
npm run dev
```

## Production build

Create an optimized production build:

```sh
npm run build
```

## Preview

Preview the production build locally:

```sh
npm run preview
```

## Current milestone status

Milestone 9 adds a focused Supabase catalogue dashboard for viewing, creating,
editing, activating, featuring, imaging, and safely deleting countries,
restaurants, experiences, and packages. Public catalogue routes now read fresh
active data at request time. Public signup, service-role access, checkout,
Stripe, analytics, and runtime AI features remain out of scope.

Canonical metadata currently uses the reserved placeholder host
`https://experiencehub.example`. Replace the `site` value in
`astro.config.mjs` with the production domain before launch.

## Validation

Each milestone is validated with `npm run build`. Milestone 9 additionally
checks protected dashboard routes, server-side admin mutations, slug and field
validation, relationship-aware deletion, image replacement, request-time public
catalogue reads, inactive-record filtering, RLS policy separation, and the
absence of embedded credentials. Live add, edit, deactivate, upload, and delete
tests require real Supabase credentials and a promoted administrator.
