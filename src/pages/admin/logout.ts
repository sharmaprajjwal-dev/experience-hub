import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ locals, redirect }) => {
  if (locals.supabase) {
    await locals.supabase.auth.signOut();
  }

  return redirect('/admin/login?message=signed-out', 303);
};

export const GET: APIRoute = () =>
  new Response('Method Not Allowed', {
    status: 405,
    headers: {
      Allow: 'POST',
      'Cache-Control': 'private, no-store',
    },
  });
