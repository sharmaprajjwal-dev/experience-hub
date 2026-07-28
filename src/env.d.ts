/// <reference types="astro/client" />

import type {
  SupabaseClient,
  User,
} from '@supabase/supabase-js';

interface ImportMetaEnv {
  readonly OPENROUTER_API_KEY?: string;
  readonly OPENROUTER_MODEL?: string;
  readonly SITE_URL?: string;
  readonly SITE_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  namespace App {
    interface Locals {
      supabase?: SupabaseClient;
      adminUser?: Pick<User, 'id' | 'email'>;
      runtime?: {
        env?: Record<string, string | undefined>;
      };
    }
  }
}

export {};
