import {
  createClient,
  type SupabaseClient,
} from '@supabase/supabase-js';

export type SupabaseConfigurationStatus =
  | 'configured'
  | 'missing'
  | 'incomplete'
  | 'placeholder';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY?.trim();

const looksLikePlaceholder = (value: string) =>
  /(^|[./_-])(example|placeholder|your[-_]?project|your[-_]?anon|replace[-_]?me)([./_-]|$)/i.test(
    value,
  );

export function getSupabaseConfigurationStatus(): SupabaseConfigurationStatus {
  if (!supabaseUrl && !supabaseAnonKey) return 'missing';
  if (!supabaseUrl || !supabaseAnonKey) return 'incomplete';

  try {
    const url = new URL(supabaseUrl);

    if (
      !['http:', 'https:'].includes(url.protocol) ||
      looksLikePlaceholder(supabaseUrl) ||
      looksLikePlaceholder(supabaseAnonKey)
    ) {
      return 'placeholder';
    }
  } catch {
    return 'placeholder';
  }

  return 'configured';
}

let client: SupabaseClient | undefined;

export function getSupabaseClient(): SupabaseClient | null {
  if (getSupabaseConfigurationStatus() !== 'configured') return null;

  try {
    client ??= createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
  } catch {
    return null;
  }

  return client;
}
