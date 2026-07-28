import {
  createServerClient,
  parseCookieHeader,
} from '@supabase/ssr';
import type { AstroCookies } from 'astro';
import { getSupabasePublicConfiguration } from './supabase';

interface ServerClientContext {
  request: Request;
  cookies: AstroCookies;
  responseHeaders?: Headers;
}

export function createSupabaseServerClient({
  request,
  cookies,
  responseHeaders,
}: ServerClientContext) {
  const configuration = getSupabasePublicConfiguration();
  if (!configuration) return null;

  return createServerClient(configuration.url, configuration.anonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get('Cookie') ?? '');
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([name, value]) => {
          responseHeaders?.set(name, value);
        });
      },
    },
  });
}
