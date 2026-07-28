# ExperienceHub

ExperienceHub is a multi-country platform for discovering curated dining
experiences and thoughtfully designed packages. The project begins with
experiences in Nepal and New Zealand and is structured to support additional
destinations over time.

## Technology used so far

- [Astro](https://astro.build/) with Astro's recommended strict TypeScript
  defaults
- [Tailwind CSS](https://tailwindcss.com/) 4 through the recommended Vite plugin
- Astro Content Collections with Zod-validated local JSON entries
- Static HTML with no client-side framework or backend

## Content architecture

Astro Content Collections are used for countries, restaurants, experiences, and
packages. They were chosen because collection schemas validate every local
record at build time, generate TypeScript types automatically, and support
validated references between each level of the Country → Restaurant →
Experience → Package relationship.

Each entry lives in `src/content/` as JSON. Adding a destination primarily means
adding new collection entries; country and detail pages are generated from that
data. The current `heroImage` values point to local gradient placeholder styles
and can be replaced with image assets later without changing the routes or data
relationships.

Package prices in the current catalogue are explicitly marked as placeholder
concept prices. They must not be treated as confirmed restaurant pricing.

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

Milestone 4 establishes the responsive experience catalogue, country and
experience filters, restaurant pages, package comparisons, detailed package
pages, structured metadata, and temporary booking-information routes. No
checkout, Stripe, backend, CMS, analytics, Supabase integration, AI features,
or additional UI frameworks are included.

Canonical metadata currently uses the reserved placeholder host
`https://experiencehub.example`. Replace the `site` value in
`astro.config.mjs` with the production domain before launch.

## Validation

Each milestone is validated by confirming that the development server starts,
checking the homepage at mobile and desktop widths, and ensuring that
`npm run build` completes successfully.
