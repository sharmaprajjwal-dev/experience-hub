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
- Static HTML with no client-side UI framework; Supabase is an optional data
  backend

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
2. Open the project's **SQL Editor** and run
   `supabase/migrations/20260728000000_create_catalogue.sql`.
3. Run `supabase/seed.sql` in the SQL Editor after the migration. The seed is
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

Milestone 6 adds the official Supabase client, a reusable client module, a
read-through catalogue data layer with local demo fallback, and versioned
catalogue migration and seed SQL. The SQL enables Row Level Security and
read-only active-content policies. No admin dashboard, public data mutations,
service-role credential, checkout, Stripe, CMS, analytics, runtime AI features,
or additional UI framework is included.

Canonical metadata currently uses the reserved placeholder host
`https://experiencehub.example`. Replace the `site` value in
`astro.config.mjs` with the production domain before launch.

## Validation

Each milestone is validated with `npm run build`. Milestone 6 additionally
checks the build without Supabase variables, with clearly fake placeholder
configuration, and confirms the same local demo routes remain available. A live
connection is not claimed until real project credentials are supplied.
