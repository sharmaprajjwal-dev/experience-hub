import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServerClient } from './lib/supabase-server';

const publicAdminRoutes = new Set([
  '/admin/login',
  '/admin/forgot-password',
  '/admin/reset-password',
  '/admin/logout',
]);

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  if (pathname !== '/admin' && !pathname.startsWith('/admin/')) return next();
  const normalizedPath =
    pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

  const authResponseHeaders = new Headers();
  const supabase = createSupabaseServerClient({
    ...context,
    responseHeaders: authResponseHeaders,
  });
  context.locals.supabase = supabase ?? undefined;

  const finalizeAuthResponse = (response: Response) => {
    response.headers.set('Cache-Control', 'private, no-store');
    authResponseHeaders.forEach((value, name) => {
      response.headers.set(name, value);
    });
    return response;
  };

  if (publicAdminRoutes.has(normalizedPath)) {
    return finalizeAuthResponse(await next());
  }

  if (!supabase) {
    return finalizeAuthResponse(
      context.redirect('/admin/login?error=configuration-required', 302),
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return finalizeAuthResponse(
      context.redirect('/admin/login?error=session-required', 302),
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || profile?.role !== 'admin') {
    return finalizeAuthResponse(
      context.redirect('/admin/login?error=not-authorized', 302),
    );
  }

  context.locals.adminUser = {
    id: user.id,
    email: user.email,
  };

  return finalizeAuthResponse(await next());
});
