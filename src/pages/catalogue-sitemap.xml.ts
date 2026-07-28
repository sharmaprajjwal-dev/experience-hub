import type { APIRoute } from 'astro';
import { getContentGraph } from '../lib/content';

export const prerender = false;

export const GET: APIRoute = async ({ site, url }) => {
  const graph = await getContentGraph();
  const canonicalSite = site ?? new URL(url.origin);
  const paths = [
    '/countries',
    ...graph.countries.map(({ data }) => `/countries/${data.slug}`),
    '/experiences',
    ...graph.experiences.map(({ data }) => `/experiences/${data.slug}`),
    ...graph.restaurants.map(({ data }) => `/restaurants/${data.slug}`),
    ...graph.packages.map(({ data }) => `/packages/${data.slug}`),
  ];
  const urls = [...new Set(paths)].map((path) =>
    escapeXml(new URL(path, canonicalSite).toString()),
  );
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((entry) => `  <url><loc>${entry}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    },
  });
};

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
