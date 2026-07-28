import type { APIRoute } from 'astro';
import {
  isCatalogueImageSection,
  uploadCatalogueImage,
} from '../../../lib/storage';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.supabase || !locals.adminUser) {
    return json({ error: 'Administrator access is required.' }, 401);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json({ error: 'The upload request was not valid.' }, 400);
  }

  const file = formData.get('image');
  const section = formData.get('section');

  if (!(file instanceof File) || !isCatalogueImageSection(section)) {
    return json(
      { error: 'Choose an image and a valid catalogue section.' },
      400,
    );
  }

  const result = await uploadCatalogueImage({
    supabase: locals.supabase,
    file,
    section,
  });

  return result.ok
    ? json({ path: result.path, publicUrl: result.publicUrl }, 201)
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
