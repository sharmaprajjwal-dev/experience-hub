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

Milestone 3 establishes the multi-country information architecture with
validated local content, reusable country selection, and statically generated
country, experience, and package routes. No backend, CMS, analytics, Supabase
integration, AI features, or additional UI frameworks are included.

## Validation

Each milestone is validated by confirming that the development server starts,
checking the homepage at mobile and desktop widths, and ensuring that
`npm run build` completes successfully.
