# ExperienceHub

ExperienceHub is a multi-country platform for discovering curated dining
experiences and thoughtfully designed packages. The project begins with
experiences in Nepal and New Zealand and is structured to support additional
destinations over time.

## Technology used so far

- [Astro](https://astro.build/) with Astro's recommended strict TypeScript
  defaults
- [Tailwind CSS](https://tailwindcss.com/) 4 through the recommended Vite plugin
- Static HTML with no client-side framework or backend

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

Milestone 2 establishes the premium responsive UI foundation: reusable design
tokens and components, accessible desktop and mobile navigation, polished
homepage sections, restrained motion, and reduced-motion support. No backend,
analytics, Supabase integration, AI features, or additional UI frameworks are
included.

## Validation

Each milestone is validated by confirming that the development server starts,
checking the homepage at mobile and desktop widths, and ensuring that
`npm run build` completes successfully.
