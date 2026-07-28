import type { APIRoute } from 'astro';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const canonicalSite = site ?? new URL('https://experiencehub.example');
  const journalSitemap = new URL('/sitemap-index.xml', canonicalSite);
  const catalogueSitemap = new URL('/catalogue-sitemap.xml', canonicalSite);

  return new Response(
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /admin/',
      'Disallow: /api/',
      'Disallow: /book/',
      'Disallow: /checkout/',
      `Sitemap: ${journalSitemap}`,
      `Sitemap: ${catalogueSitemap}`,
      '',
    ].join('\n'),
    {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    },
  );
};
