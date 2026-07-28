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

Milestone 1 establishes the Astro and Tailwind foundation, shared page layout,
global styles, essential metadata, a basic homepage, and the initial content
directory structure. No backend, analytics, Supabase integration, AI features,
or additional UI frameworks are included.

## Validation

Milestone 1 is validated by confirming that the development server starts and
that `npm run build` completes successfully.
