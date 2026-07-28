import type { APIRoute } from 'astro';
import { deleteCatalogueImage } from '../../../lib/storage';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.supabase || !locals.adminUser) {
    return json({ error: 'Administrator access is required.' }, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'The delete request was not valid.' }, 400);
  }

  const path =
    typeof body === 'object' &&
    body !== null &&
    'path' in body &&
    typeof body.path === 'string'
      ? body.path
      : null;

  if (!path) return json({ error: 'A stored image path is required.' }, 400);

  const result = await deleteCatalogueImage({
    supabase: locals.supabase,
    path,
  });

  return result.ok
    ? json({ message: 'The test image was deleted.' }, 200)
    : json({ error: result.error }, 400);
};

export const GET: APIRoute = () =>
  new Response('Method Not Allowed', {
    status: 405,
    headers: {
      Allow: 'POST',
      'Cache-Control': 'private, no-store',
    },
  });

function json(body: Record<string, string>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, no-store',
    },
  });
}
