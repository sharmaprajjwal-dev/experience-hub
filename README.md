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
catalogue-management interface, or service-role client. Supabase rate limits and
email delivery settings still need production review. Admin routes require a
Node-compatible deployment because they are rendered on demand, and the
placeholder canonical domain must be replaced before deployment.

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

Milestone 7 adds server-rendered administrator login, logout, session detection,
password recovery, and reset routes. Middleware verifies the Supabase Auth user
and requires an RLS-protected `admin` profile before rendering `/admin`. The
landing page contains non-interactive placeholders only; catalogue management,
public signup, service-role access, checkout, Stripe, CMS, analytics, and
runtime AI features remain out of scope.

Canonical metadata currently uses the reserved placeholder host
`https://experiencehub.example`. Replace the `site` value in
`astro.config.mjs` with the production domain before launch.

## Validation

Each milestone is validated with `npm run build`. Milestone 7 additionally
checks public prerendering, on-demand admin routes, unauthenticated redirects,
configuration error states, POST-only logout, RLS role enforcement in
middleware, sitemap exclusion, and the absence of public signup or embedded
credentials. Live login is tested only when real Supabase credentials are
available.
